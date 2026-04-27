import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import {
  createProjectLaw,
  getProjectLawOptions,
  listProjectLaws,
  removeProjectLaw,
  toApiError,
  updateProjectLaw,
} from "../lib/project-law-api";
import type { ProjectLawOptionsType } from "../types/project-law/project-law-options-type";
import type { ProjectLawStatusType, ProjectLawType } from "../types/project-law/project-law-type";

interface ProjectLawFormState {
  number: string;
  description: string;
  status: ProjectLawStatusType;
  protocolDate: string;
}

interface ProjectLawFilterState {
  search: string;
  status: "" | ProjectLawStatusType;
  sortBy: "created_at" | "number" | "protocol_date";
  sortDirection: "asc" | "desc";
}

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

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

export function ProjectLawsPage() {
  const perPage = 10;
  const [projectLaws, setProjectLaws] = useState<ProjectLawType[]>([]);
  const [options, setOptions] = useState<ProjectLawOptionsType>({
    statuses: [],
  });
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

        const [projectLawsResponse, optionsResponse] = await Promise.all([
          listProjectLaws(1, perPage, filters),
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

    loadData();
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
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshProjectLaws(1, filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel aplicar os filtros."));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        handleResetForm();
        setSuccess("Projeto de lei criado com sucesso.");
      }
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
      const targetPage = projectLaws.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

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
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">
            Carregando projetos de lei...
          </p>
        </section>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (hasForbiddenAccess) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Acesso negado
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce nao possui permissao para visualizar projetos de lei.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>project_laws.manage</strong>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      {canMutateProjectLaws ? (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Cadastro de projetos de lei
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestão de projetos de lei
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Crie, edite e remova projetos de lei com status e data de protocolo.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Numero</span>
              <input
                value={form.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, number: event.target.value }))
                }
                placeholder="Ex.: PL 234/2025"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Descricao</span>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Descricao do projeto de lei"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ProjectLawStatusType,
                  }))
                }
                required
              >
                {(options.statuses.length > 0
                  ? options.statuses
                  : [
                      { value: "in_committee", label: "Em comissão" },
                      { value: "in_voting", label: "Em votação" },
                      { value: "approved", label: "Aprovado" },
                      { value: "sanctioned", label: "Sancionado" },
                    ]
                ).map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Data de protocolo
              </span>
              <input
                type="date"
                value={form.protocolDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    protocolDate: event.target.value,
                  }))
                }
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
                {success}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Salvando..."
                  : editingProjectLawId
                    ? "Atualizar projeto de lei"
                    : "Criar projeto de lei"}
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                disabled={isSubmitting}
                className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                Limpar formulario
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Permissoes insuficientes
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce pode visualizar projetos de lei, mas nao pode altera-los.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Para editar, solicite a permissao <strong>project_laws.manage</strong>.
          </p>
          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
              {success}
            </div>
          ) : null}
        </section>
      )}

      <section className="card-surface rounded-[32px] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Projetos de lei
            </p>
            <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
              Listagem de projetos de lei
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Use os filtros para localizar projetos por numero, status ou data.
            </p>
          </div>
        </div>

        <form
          className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
          onSubmit={handleApplyFilters}
        >
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_0.9fr_0.9fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Buscar</span>
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Numero ou descricao"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as ProjectLawFilterState["status"],
                  }))
                }
              >
                <option value="">Todos os status</option>
                {(options.statuses.length > 0
                  ? options.statuses
                  : [
                      { value: "in_committee", label: "Em comissão" },
                      { value: "in_voting", label: "Em votação" },
                      { value: "approved", label: "Aprovado" },
                      { value: "sanctioned", label: "Sancionado" },
                    ]
                ).map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Ordenar por</span>
              <select
                value={filters.sortBy}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortBy: event.target.value as ProjectLawFilterState["sortBy"],
                  }))
                }
              >
                <option value="created_at">Data de criacao</option>
                <option value="number">Numero</option>
                <option value="protocol_date">Data de protocolo</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Ordem</span>
              <select
                value={filters.sortDirection}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortDirection: event.target.value as ProjectLawFilterState["sortDirection"],
                  }))
                }
              >
                <option value="desc">Mais recentes</option>
                <option value="asc">Mais antigas</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              Aplicar filtros
            </button>

            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                void refreshProjectLaws(1, DEFAULT_FILTERS);
              }}
              className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong"
            >
              Limpar filtros
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-4">
          {projectLaws.length > 0 ? (
            projectLaws.map((projectLaw) => (
              <article
                key={projectLaw.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {projectLaw.number}
                    </h3>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {projectLaw.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {formatStatusLabel(projectLaw.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                  <p>
                    <strong className="text-foreground">Protocolo:</strong> {formatDate(projectLaw.protocol_date)}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectProjectLaw(projectLaw)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(projectLaw)}
                    className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">
              Nenhum projeto de lei cadastrado ate o momento.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
            <span>Total: {totalProjectLaws}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshProjectLaws(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} de {lastPage}
              </span>
              <button
                type="button"
                onClick={() => refreshProjectLaws(currentPage + 1)}
                disabled={currentPage >= lastPage}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Proxima
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}