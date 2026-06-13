import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import {
  createAmendment,
  getAmendmentOptions,
  listAmendments,
  removeAmendment,
  toApiError,
  updateAmendment,
} from "../lib/amendment-api";
import type { AmendmentOptionsType } from "../types/amendment/amendment-options-type";
import type {
  AmendmentApplicationAreaType,
  AmendmentStatusType,
  AmendmentType,
} from "../types/amendment/amendment-type";

interface AmendmentFormState {
  number: string;
  amount: string;
  status: AmendmentStatusType;
  cityId: string;
  applicationArea: string;
}

interface AmendmentFilterState {
  search: string;
  status: "" | AmendmentStatusType;
  cityId: string;
  applicationArea: "" | AmendmentApplicationAreaType;
  sortBy: "created_at" | "number" | "amount";
  sortDirection: "asc" | "desc";
}

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
    in_execution: "Em execução",
    completed: "Concluída",
  };

  return labels[status];
}

function formatApplicationAreaLabel(area: AmendmentApplicationAreaType): string {
  const labels: Record<AmendmentApplicationAreaType, string> = {
    health: "Saúde",
    education: "Educação",
    infrastructure: "Infraestrutura",
    social_assistance: "Assistência social",
    public_security: "Segurança pública",
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

export function AmendmentsPage() {
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

        const [amendmentsResponse, optionsResponse] = await Promise.all([
          listAmendments(1, perPage, filters),
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

    loadData();
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
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshAmendments(1, filters);
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
        handleResetForm();
        setSuccess("Emenda criada com sucesso.");
      }
    } catch (submissionError) {
      setError(toApiError(submissionError, "Nao foi possivel salvar a emenda."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(amendment: AmendmentType) {
    const shouldDelete = window.confirm(
      `Deseja remover a emenda "${amendment.number}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeAmendment(amendment.id);
      const targetPage = amendments.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

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
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando emendas...</p>
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
            Voce nao possui permissao para visualizar emendas.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>amendments.manage</strong>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      {canMutateAmendments ? (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Cadastro de emendas
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestão de emendas parlamentares
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Crie, edite e remova emendas com cidade, status, valor e area de aplicacao.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Numero</span>
              <input
                value={form.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, number: event.target.value }))
                }
                placeholder="Ex.: E-45/2025"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Valor</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="Ex.: 500000"
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
                    status: event.target.value as AmendmentStatusType,
                  }))
                }
                required
              >
                {(options.statuses.length > 0
                  ? options.statuses
                  : [
                      { value: "planned", label: "Planejada" },
                      { value: "in_execution", label: "Em execução" },
                      { value: "completed", label: "Concluída" },
                    ]
                ).map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Cidade</span>
              <select
                value={form.cityId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cityId: event.target.value }))
                }
                required
              >
                <option value="">Selecione uma cidade</option>
                {options.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} - {city.region}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Area de aplicacao
              </span>
              <select
                value={form.applicationArea}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    applicationArea: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione uma area</option>
                {options.application_areas.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
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
                  : editingAmendmentId
                    ? "Atualizar emenda"
                    : "Criar emenda"}
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
            Voce pode visualizar emendas, mas nao pode altera-las.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Para editar, solicite a permissao <strong>amendments.manage</strong>.
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
              Emendas
            </p>
            <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
              Listagem de emendas cadastradas
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Use os filtros para localizar emendas por numero, status, cidade ou area.
            </p>
          </div>
        </div>

        <form
          className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
          onSubmit={handleApplyFilters}
        >
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.9fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Buscar</span>
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Numero da emenda"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as AmendmentFilterState["status"],
                  }))
                }
              >
                <option value="">Todos os status</option>
                {(options.statuses.length > 0
                  ? options.statuses
                  : [
                      { value: "planned", label: "Planejada" },
                      { value: "in_execution", label: "Em execução" },
                      { value: "completed", label: "Concluída" },
                    ]
                ).map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Cidade</span>
              <select
                value={filters.cityId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, cityId: event.target.value }))
                }
              >
                <option value="">Todas as cidades</option>
                {options.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Area</span>
              <select
                value={filters.applicationArea}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    applicationArea: event.target.value as AmendmentFilterState["applicationArea"],
                  }))
                }
              >
                <option value="">Todas as areas</option>
                {options.application_areas.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
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
                    sortBy: event.target.value as AmendmentFilterState["sortBy"],
                  }))
                }
              >
                <option value="created_at">Data de criacao</option>
                <option value="number">Numero</option>
                <option value="amount">Valor</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Ordem</span>
              <select
                value={filters.sortDirection}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortDirection: event.target.value as AmendmentFilterState["sortDirection"],
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
                void refreshAmendments(1, DEFAULT_FILTERS);
              }}
              className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong"
            >
              Limpar filtros
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-4">
          {amendments.length > 0 ? (
            amendments.map((amendment) => (
              <article
                key={amendment.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {amendment.number}
                    </h3>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {formatApplicationAreaLabel(amendment.application_area)}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {formatStatusLabel(amendment.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                  <p>
                    <strong className="text-foreground">Valor:</strong> {formatCurrency(amendment.amount)}
                  </p>
                  <p>
                    <strong className="text-foreground">Cidade:</strong> {formatCityLabel(amendment)}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAmendment(amendment)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(amendment)}
                    className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">
              Nenhuma emenda cadastrada ate o momento.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
            <span>Total: {totalAmendments}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshAmendments(currentPage - 1)}
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
                onClick={() => refreshAmendments(currentPage + 1)}
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
