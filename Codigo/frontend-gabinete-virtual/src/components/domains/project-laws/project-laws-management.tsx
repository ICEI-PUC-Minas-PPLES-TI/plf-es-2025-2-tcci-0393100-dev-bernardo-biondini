import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../../../lib/permission-codes";
import {
  createProjectLaw,
  getProjectLawOptions,
  listProjectLaws,
  removeProjectLaw,
  toApiError,
  updateProjectLaw,
} from "../../../lib/project-law-api";
import type { ProjectLawOptionsType } from "../../../types/project-law/project-law-options-type";
import type {
  ProjectLawStatusType,
  ProjectLawType,
} from "../../../types/project-law/project-law-type";
import type { BadgeTone } from "../../core";
import { Card } from "../../core";
import {
  ProjectLawsCreateModal,
  type ProjectLawFormState,
} from "./project-laws-create-modal";
import {
  ProjectLawsListSection,
  type ProjectLawFilterState,
} from "./project-laws-list-section";

const EMPTY_FORM: ProjectLawFormState = {
  number: "",
  description: "",
  status: "in_committee",
  protocolDate: "",
};

const DEFAULT_FILTERS: ProjectLawFilterState = {
  search: "",
  status: "",
  sortBy: "created_at",
  sortDirection: "desc",
};

function formatStatusLabel(status: ProjectLawStatusType): string {
  const labels: Record<ProjectLawStatusType, string> = {
    in_committee: "Em comissão",
    in_voting: "Em votação",
    approved: "Aprovado",
    sanctioned: "Sancionado",
  };

  return labels[status];
}

function formatStatusTone(status: ProjectLawStatusType): BadgeTone {
  const tones: Record<ProjectLawStatusType, BadgeTone> = {
    in_committee: "neutral",
    in_voting: "warning",
    approved: "success",
    sanctioned: "success",
  };

  return tones[status];
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

export function ProjectLawsManagement() {
  const perPage = 10;
  const [projectLaws, setProjectLaws] = useState<ProjectLawType[]>([]);
  const [options, setOptions] = useState<ProjectLawOptionsType>({ statuses: [] });
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProjectLaws, setTotalProjectLaws] = useState(0);
  const [filters, setFilters] = useState<ProjectLawFilterState>(DEFAULT_FILTERS);
  const [form, setForm] = useState<ProjectLawFormState>(EMPTY_FORM);
  const [editingProjectLawId, setEditingProjectLawId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasForbiddenAccess, setHasForbiddenAccess] = useState(false);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const token = getStoredToken();

      if (!token) {
        setHasInvalidSession(true);
        setIsLoading(false);
        return;
      }

      try {
        const authenticatedUser = await getAuthenticatedUserByToken(token);

        if (!authenticatedUser) {
          setHasInvalidSession(true);
          return;
        }

        setPermissionCodes(authenticatedUser.permissions);

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.PROJECT_LAWS_MANAGE)) {
          setHasForbiddenAccess(true);
          return;
        }

        const initialFilters = {
          ...DEFAULT_FILTERS,
          status: DEFAULT_FILTERS.status || null,
        };

        const [projectLawsResponse, optionsResponse] = await Promise.all([
          listProjectLaws(1, perPage, initialFilters),
          getProjectLawOptions(),
        ]);

        setProjectLaws(projectLawsResponse.data);
        setCurrentPage(projectLawsResponse.meta.current_page);
        setLastPage(projectLawsResponse.meta.last_page);
        setTotalProjectLaws(projectLawsResponse.meta.total);
        setOptions(optionsResponse);
      } catch (requestError) {
        setError(
          toApiError(requestError, "Nao foi possivel carregar os projetos de lei."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const canMutateProjectLaws = hasPermission(
    permissionCodes,
    PERMISSION_CODES.PROJECT_LAWS_MANAGE,
  );

  async function refreshProjectLaws(page = currentPage, activeFilters = filters) {
    const response = await listProjectLaws(page, perPage, {
      ...activeFilters,
      status: activeFilters.status || null,
    });

    setProjectLaws(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalProjectLaws(response.meta.total);
  }

  function handleResetForm() {
    setEditingProjectLawId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function handleSelectProjectLaw(projectLaw: ProjectLawType) {
    setEditingProjectLawId(projectLaw.id);
    setForm({
      number: projectLaw.number,
      description: projectLaw.description,
      status: projectLaw.status,
      protocolDate: projectLaw.protocol_date,
    });
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  }

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshProjectLaws(1, filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel aplicar os filtros."));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const number = form.number.trim();
      const description = form.description.trim();

      if (!number || !description) {
        setError("Informe numero e descricao do projeto de lei.");
        return;
      }

      if (!form.protocolDate) {
        setError("Informe a data de protocolo.");
        return;
      }

      const payload = {
        number,
        description,
        status: form.status,
        protocol_date: form.protocolDate,
      };

      if (editingProjectLawId) {
        await updateProjectLaw(editingProjectLawId, payload);
        await refreshProjectLaws(currentPage);
        setSuccess("Projeto de lei atualizado com sucesso.");
      } else {
        await createProjectLaw(payload);
        await refreshProjectLaws(1);
        setSuccess("Projeto de lei criado com sucesso.");
      }

      handleResetForm();
      setIsCreateModalOpen(false);
    } catch (submissionError) {
      setError(
        toApiError(submissionError, "Nao foi possivel salvar o projeto de lei."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(projectLaw: ProjectLawType) {
    const shouldDelete = window.confirm(
      `Deseja remover o projeto de lei "${projectLaw.number}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeProjectLaw(projectLaw.id);
      const targetPage = projectLaws.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      await refreshProjectLaws(targetPage);

      if (editingProjectLawId === projectLaw.id) {
        handleResetForm();
      }

      setSuccess("Projeto de lei removido com sucesso.");
    } catch (deleteError) {
      setError(
        toApiError(deleteError, "Nao foi possivel remover o projeto de lei."),
      );
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">
            Carregando projetos de lei...
          </p>
        </Card>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (hasForbiddenAccess) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Acesso negado
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce nao possui permissao para visualizar projetos de lei.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>project_laws.manage</strong>.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <ProjectLawsListSection
        projectLaws={projectLaws}
        options={options}
        filters={filters}
        totalProjectLaws={totalProjectLaws}
        currentPage={currentPage}
        lastPage={lastPage}
        canMutateProjectLaws={canMutateProjectLaws}
        error={error}
        success={success}
        onOpenCreate={() => {
          handleResetForm();
          setIsCreateModalOpen(true);
        }}
        onChangeFilters={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
        }
        onApplyFilters={handleApplyFilters}
        onResetFilters={() => {
          setFilters(DEFAULT_FILTERS);
          void refreshProjectLaws(1, DEFAULT_FILTERS);
        }}
        onEdit={handleSelectProjectLaw}
        onDelete={(projectLaw) => void handleDelete(projectLaw)}
        onPageChange={(page) => void refreshProjectLaws(page)}
        formatStatusLabel={formatStatusLabel}
        formatStatusTone={formatStatusTone}
        formatDate={formatDate}
      />

      <ProjectLawsCreateModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          handleResetForm();
        }}
        form={form}
        options={options}
        editingProjectLawId={editingProjectLawId}
        isSubmitting={isSubmitting}
        error={error}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
