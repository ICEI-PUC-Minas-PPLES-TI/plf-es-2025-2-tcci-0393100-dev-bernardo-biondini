import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../../../lib/permission-codes";
import {
  createAmendment,
  getAmendmentOptions,
  listAmendments,
  removeAmendment,
  toApiError,
  updateAmendment,
} from "../../../lib/amendment-api";
import type { AmendmentOptionsType } from "../../../types/amendment/amendment-options-type";
import type {
  AmendmentApplicationAreaType,
  AmendmentStatusType,
  AmendmentType,
} from "../../../types/amendment/amendment-type";
import type { BadgeTone } from "../../core";
import { Card } from "../../core";
import {
  AmendmentsCreateModal,
  type AmendmentFormState,
} from "./amendments-create-modal";
import {
  AmendmentsListSection,
  type AmendmentFilterState,
} from "./amendments-list-section";

const EMPTY_FORM: AmendmentFormState = {
  number: "",
  amount: "",
  status: "planned",
  cityId: "",
  applicationArea: "",
};

const DEFAULT_FILTERS: AmendmentFilterState = {
  search: "",
  status: "",
  cityId: "",
  applicationArea: "",
  sortBy: "created_at",
  sortDirection: "desc",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatStatusLabel(status: AmendmentStatusType): string {
  const labels: Record<AmendmentStatusType, string> = {
    planned: "Planejada",
    in_execution: "Em execucao",
    completed: "Concluida",
  };

  return labels[status];
}

function formatStatusTone(status: AmendmentStatusType): BadgeTone {
  const tones: Record<AmendmentStatusType, BadgeTone> = {
    planned: "neutral",
    in_execution: "warning",
    completed: "success",
  };

  return tones[status];
}

function formatApplicationAreaLabel(area: AmendmentApplicationAreaType): string {
  const labels: Record<AmendmentApplicationAreaType, string> = {
    health: "Saude",
    education: "Educacao",
    infrastructure: "Infraestrutura",
    social_assistance: "Assistencia social",
    public_security: "Seguranca publica",
    sport: "Esporte e lazer",
  };

  return labels[area];
}

function formatCityLabel(amendment: AmendmentType): string {
  if (amendment.city) {
    return `${amendment.city.name} - ${amendment.city.region}`;
  }

  return `Cidade #${amendment.city_id}`;
}

export function AmendmentsManagement() {
  const perPage = 10;
  const [amendments, setAmendments] = useState<AmendmentType[]>([]);
  const [options, setOptions] = useState<AmendmentOptionsType>({
    statuses: [],
    application_areas: [],
    cities: [],
  });
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalAmendments, setTotalAmendments] = useState(0);
  const [filters, setFilters] = useState<AmendmentFilterState>(DEFAULT_FILTERS);
  const [form, setForm] = useState<AmendmentFormState>(EMPTY_FORM);
  const [editingAmendmentId, setEditingAmendmentId] = useState<number | null>(null);
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

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.AMENDMENTS_MANAGE)) {
          setHasForbiddenAccess(true);
          return;
        }

        const initialFilters = {
          ...DEFAULT_FILTERS,
          status: DEFAULT_FILTERS.status || null,
          cityId: DEFAULT_FILTERS.cityId ? Number(DEFAULT_FILTERS.cityId) : null,
          applicationArea: DEFAULT_FILTERS.applicationArea || null,
        };

        const [amendmentsResponse, optionsResponse] = await Promise.all([
          listAmendments(1, perPage, initialFilters),
          getAmendmentOptions(),
        ]);

        setAmendments(amendmentsResponse.data);
        setCurrentPage(amendmentsResponse.meta.current_page);
        setLastPage(amendmentsResponse.meta.last_page);
        setTotalAmendments(amendmentsResponse.meta.total);
        setOptions(optionsResponse);
      } catch (requestError) {
        setError(toApiError(requestError, "Nao foi possivel carregar as emendas."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const canMutateAmendments = hasPermission(
    permissionCodes,
    PERMISSION_CODES.AMENDMENTS_MANAGE,
  );

  async function refreshAmendments(page = currentPage, activeFilters = filters) {
    const response = await listAmendments(page, perPage, {
      ...activeFilters,
      status: activeFilters.status || null,
      cityId: activeFilters.cityId ? Number(activeFilters.cityId) : null,
      applicationArea: activeFilters.applicationArea || null,
    });

    setAmendments(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalAmendments(response.meta.total);
  }

  function handleResetForm() {
    setEditingAmendmentId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function handleSelectAmendment(amendment: AmendmentType) {
    setEditingAmendmentId(amendment.id);
    setForm({
      number: amendment.number,
      amount: String(amendment.amount),
      status: amendment.status,
      cityId: String(amendment.city_id),
      applicationArea: amendment.application_area,
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
      await refreshAmendments(1, filters);
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
      const amount = Number(form.amount.replace(",", "."));

      if (!number || !form.applicationArea) {
        setError("Informe numero e area de aplicacao.");
        return;
      }

      if (!form.cityId) {
        setError("Selecione uma cidade.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Informe um valor valido para a emenda.");
        return;
      }

      const payload = {
        number,
        amount,
        status: form.status,
        city_id: Number(form.cityId),
        application_area: form.applicationArea as AmendmentApplicationAreaType,
      };

      if (editingAmendmentId) {
        await updateAmendment(editingAmendmentId, payload);
        await refreshAmendments(currentPage);
        setSuccess("Emenda atualizada com sucesso.");
      } else {
        await createAmendment(payload);
        await refreshAmendments(1);
        setSuccess("Emenda criada com sucesso.");
      }

      handleResetForm();
      setIsCreateModalOpen(false);
    } catch (submissionError) {
      setError(toApiError(submissionError, "Nao foi possivel salvar a emenda."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(amendment: AmendmentType) {
    const shouldDelete = window.confirm(`Deseja remover a emenda "${amendment.number}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeAmendment(amendment.id);
      const targetPage = amendments.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      await refreshAmendments(targetPage);

      if (editingAmendmentId === amendment.id) {
        handleResetForm();
      }

      setSuccess("Emenda removida com sucesso.");
    } catch (deleteError) {
      setError(toApiError(deleteError, "Nao foi possivel remover a emenda."));
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando emendas...</p>
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
            Voce nao possui permissao para visualizar emendas.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>amendments.manage</strong>.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <AmendmentsListSection
        amendments={amendments}
        options={options}
        filters={filters}
        totalAmendments={totalAmendments}
        currentPage={currentPage}
        lastPage={lastPage}
        canMutateAmendments={canMutateAmendments}
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
          void refreshAmendments(1, DEFAULT_FILTERS);
        }}
        onEdit={handleSelectAmendment}
        onDelete={(amendment) => void handleDelete(amendment)}
        onPageChange={(page) => void refreshAmendments(page)}
        formatCurrency={formatCurrency}
        formatStatusLabel={formatStatusLabel}
        formatStatusTone={formatStatusTone}
        formatApplicationAreaLabel={formatApplicationAreaLabel}
        formatCityLabel={formatCityLabel}
      />

      <AmendmentsCreateModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          handleResetForm();
        }}
        form={form}
        options={options}
        editingAmendmentId={editingAmendmentId}
        isSubmitting={isSubmitting}
        error={error}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
