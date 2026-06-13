import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import {
  createDemand,
  downloadDemandOficio,
  getDemandOptions,
  listDemandHistories,
  listDemands,
  removeDemand,
  toApiError,
  updateDemand,
} from "../lib/demand-api";
import type {
  DemandOptionsType,
  ManagedDemandHistoryType,
  ManagedDemandType,
} from "../types/demand/managed-demand-type";

interface DemandFormState {
  title: string;
  description: string;
  serviceArea: string;
  status: "open" | "under_review" | "in_progress" | "completed" | "discarded";
  priority: "" | "low" | "medium" | "high";
  responsibleUserId: string;
  cityId: string;
  institutionId: string;
}

interface DemandFilterState {
  search: string;
  status: "" | ManagedDemandType["status"];
  responsibleUserId: string;
  sortBy: "created_at" | "title";
  sortDirection: "asc" | "desc";
  onlyMine: boolean;
}

type ModalMode = "create" | "edit";

const EMPTY_FORM: DemandFormState = {
  title: "",
  description: "",
  serviceArea: "",
  status: "open",
  priority: "medium",
  responsibleUserId: "",
  cityId: "",
  institutionId: "",
};

const HISTORY_PER_PAGE = 5;
const DEFAULT_FILTERS: DemandFilterState = {
  search: "",
  status: "",
  responsibleUserId: "",
  sortBy: "created_at",
  sortDirection: "desc",
  onlyMine: false,
};

function formatStatusLabel(status: DemandFormState["status"]): string {
  const labels = {
    open: "Aberta",
    under_review: "Em analise",
    in_progress: "Em andamento",
    completed: "Concluida",
    discarded: "Descartada",
  } as const;

  return labels[status];
}

function formatPriorityLabel(priority: ManagedDemandType["priority"]): string {
  if (!priority) {
    return "Nao definida";
  }

  const labels = {
    low: "Baixa",
    medium: "Media",
    high: "Alta",
  } as const;

  return labels[priority];
}

function formatHistoryAction(action: string): string {
  const labels: Record<string, string> = {
    created: "Criacao",
    updated: "Atualizacao",
    deleted: "Remocao",
  };

  return labels[action] ?? action;
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: "Titulo",
    description: "Descricao",
    service_area: "Area atendida",
    oficio_original_name: "Oficio",
    status: "Status",
    priority: "Prioridade",
    responsible_user_id: "Responsavel",
    city_id: "Cidade",
    institution_id: "Instituicao",
  };

  return labels[field] ?? field;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

function renderMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (value === null || typeof value === "undefined") {
    return "Nao informado";
  }

  return JSON.stringify(value);
}

function HistoryMetadata({
  metadata,
}: {
  metadata: ManagedDemandHistoryType["metadata"];
}) {
  if (!metadata) {
    return null;
  }

  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-background px-4 py-3">
      {entries.map(([field, change]) => {
        const value =
          change && typeof change === "object" && "from" in change && "to" in change
            ? (change as { from?: unknown; to?: unknown })
            : null;

        return (
          <div key={field} className="text-xs leading-6 text-muted">
            <span className="font-semibold text-foreground">
              {formatFieldLabel(field)}:
            </span>{" "}
            {value
              ? `${renderMetadataValue(value.from)} -> ${renderMetadataValue(value.to)}`
              : renderMetadataValue(change)}
          </div>
        );
      })}
    </div>
  );
}

export function DemandsPage() {
  const perPage = 10;
  const [demands, setDemands] = useState<ManagedDemandType[]>([]);
  const [options, setOptions] = useState<DemandOptionsType>({
    users: [],
    cities: [],
    institutions: [],
    service_areas: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalDemands, setTotalDemands] = useState(0);
  const [filters, setFilters] = useState<DemandFilterState>(DEFAULT_FILTERS);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [form, setForm] = useState<DemandFormState>(EMPTY_FORM);
  const [oficioFile, setOficioFile] = useState<File | null>(null);
  const [removeOficio, setRemoveOficio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeDemand, setActiveDemand] = useState<ManagedDemandType | null>(null);
  const [discardReasonDemand, setDiscardReasonDemand] =
    useState<ManagedDemandType | null>(null);
  const [demandHistories, setDemandHistories] = useState<ManagedDemandHistoryType[]>(
    [],
  );
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const token = getStoredToken();

      try {
        const authenticatedUser = token
          ? await getAuthenticatedUserByToken(token)
          : null;
        const initialFilters: DemandFilterState = {
          ...DEFAULT_FILTERS,
          responsibleUserId: authenticatedUser ? String(authenticatedUser.id) : "",
          onlyMine: Boolean(authenticatedUser),
        };
        const [demandsResponse, optionsResponse] = await Promise.all([
          listDemands(1, perPage, toDemandListFilters(initialFilters)),
          getDemandOptions(),
        ]);

        setCurrentUserId(authenticatedUser?.id ?? null);
        setFilters(initialFilters);
        setDemands(demandsResponse.data);
        setCurrentPage(demandsResponse.meta.current_page);
        setLastPage(demandsResponse.meta.last_page);
        setTotalDemands(demandsResponse.meta.total);
        setOptions(optionsResponse);
      } catch (requestError) {
        setError(
          toApiError(requestError, "Nao foi possivel carregar as demandas."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!form.cityId) {
      return options.institutions;
    }

    return options.institutions.filter(
      (institution) => institution.city_id === Number(form.cityId),
    );
  }, [form.cityId, options.institutions]);

  const serviceAreaLabelMap = useMemo(
    () =>
      new Map(
        options.service_areas.map((serviceArea) => [
          serviceArea.value,
          serviceArea.label,
        ]),
      ),
    [options.service_areas],
  );

  function formatServiceAreaLabel(serviceArea: string | null): string {
    if (!serviceArea) {
      return "Nao informada";
    }

    return serviceAreaLabelMap.get(serviceArea) ?? serviceArea;
  }

  function toDemandListFilters(activeFilters: DemandFilterState) {
    return {
      search: activeFilters.search,
      status: activeFilters.status || null,
      responsibleUserId: activeFilters.responsibleUserId
        ? Number(activeFilters.responsibleUserId)
        : null,
      sortBy: activeFilters.sortBy,
      sortDirection: activeFilters.sortDirection,
    };
  }

  async function refreshDemands(page = currentPage, activeFilters = filters) {
    setIsRefreshingList(true);

    try {
      const response = await listDemands(
        page,
        perPage,
        toDemandListFilters(activeFilters),
      );
      setDemands(response.data);
      setCurrentPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
      setTotalDemands(response.meta.total);

      return response;
    } finally {
      setIsRefreshingList(false);
    }
  }

  async function handleApplyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshDemands(1, filters);
    } catch (requestError) {
      setError(
        toApiError(requestError, "Nao foi possivel aplicar os filtros."),
      );
    }
  }

  async function handleFilterForCurrentUser() {
    if (!currentUserId) {
      return;
    }

    const nextFilters: DemandFilterState = {
      ...filters,
      responsibleUserId: String(currentUserId),
      onlyMine: true,
    };

    setFilters(nextFilters);
    setError(null);
    setSuccess(null);

    try {
      await refreshDemands(1, nextFilters);
    } catch (requestError) {
      setError(
        toApiError(requestError, "Nao foi possivel aplicar o filtro para voce."),
      );
    }
  }

  async function handleClearFilters() {
    const nextFilters: DemandFilterState = {
      ...DEFAULT_FILTERS,
    };

    setFilters(nextFilters);
    setError(null);
    setSuccess(null);

    try {
      await refreshDemands(1, nextFilters);
    } catch (requestError) {
      setError(
        toApiError(requestError, "Nao foi possivel limpar os filtros."),
      );
    }
  }

  async function loadDemandHistory(demandId: number, page = 1) {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await listDemandHistories(demandId, page, HISTORY_PER_PAGE);
      setDemandHistories(response.data);
      setHistoryCurrentPage(response.meta.current_page);
      setHistoryLastPage(response.meta.last_page);
      setHistoryTotal(response.meta.total);
    } catch (requestError) {
      setHistoryError(
        toApiError(requestError, "Nao foi possivel carregar o historico."),
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function resetHistoryState() {
    setDemandHistories([]);
    setHistoryCurrentPage(1);
    setHistoryLastPage(1);
    setHistoryTotal(0);
    setIsHistoryLoading(false);
    setHistoryError(null);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalMode("create");
    setActiveDemand(null);
    setForm(EMPTY_FORM);
    setOficioFile(null);
    setRemoveOficio(false);
    resetHistoryState();
  }

  function closeDiscardReasonModal() {
    setDiscardReasonDemand(null);
  }

  function openCreateModal() {
    setModalMode("create");
    setActiveDemand(null);
    setForm(EMPTY_FORM);
    setOficioFile(null);
    setRemoveOficio(false);
    resetHistoryState();
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEditModal(demand: ManagedDemandType) {
    setModalMode("edit");
    setActiveDemand(demand);
    setForm({
      title: demand.title,
      description: demand.description,
      serviceArea: demand.service_area ?? "",
      status: demand.status,
      priority: demand.priority ?? "",
      responsibleUserId: demand.responsible_user_id
        ? String(demand.responsible_user_id)
        : "",
      cityId: String(demand.city_id),
      institutionId: String(demand.institution_id),
    });
    setOficioFile(null);
    setRemoveOficio(false);
    setHistoryCurrentPage(1);
    setDemandHistories([]);
    setHistoryLastPage(1);
    setHistoryTotal(0);
    setHistoryError(null);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
    void loadDemandHistory(demand.id, 1);
  }

  function openDiscardReasonModal(demand: ManagedDemandType) {
    setDiscardReasonDemand(demand);
  }

  async function handleDownloadOficio(demand: ManagedDemandType) {
    if (!demand.oficio_original_name) {
      return;
    }

    try {
      await downloadDemandOficio(demand.id, demand.oficio_original_name);
    } catch (downloadError) {
      setError(
        toApiError(downloadError, "Nao foi possivel baixar o oficio da demanda."),
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.cityId || !form.institutionId) {
        setError("Selecione cidade e instituicao.");
        return;
      }

      const title = form.title.trim();
      const description = form.description.trim();

      if (!title || !description) {
        setError("Informe titulo e descricao da demanda.");
        return;
      }

      if (!form.serviceArea) {
        setError("Selecione a area atendida da demanda.");
        return;
      }

      if (!form.priority) {
        setError("Selecione a prioridade da demanda.");
        return;
      }

      const payload = new FormData();
      payload.set("title", title);
      payload.set("description", description);
      payload.set("service_area", form.serviceArea);
      payload.set("status", form.status);
      payload.set("priority", form.priority);
      payload.set("city_id", String(Number(form.cityId)));
      payload.set("institution_id", String(Number(form.institutionId)));

      if (form.responsibleUserId) {
        payload.set(
          "responsible_user_id",
          String(Number(form.responsibleUserId)),
        );
      }

      if (oficioFile) {
        payload.set("oficio", oficioFile);
      }

      if (modalMode === "edit" && removeOficio) {
        payload.set("remove_oficio", "1");
      }

      if (modalMode === "edit" && activeDemand) {
        const updatedDemand = await updateDemand(activeDemand.id, payload);
        await refreshDemands(currentPage);
        setActiveDemand(updatedDemand);
        setOficioFile(null);
        setRemoveOficio(false);
        await loadDemandHistory(updatedDemand.id, 1);
        setSuccess("Demanda atualizada com sucesso.");
      } else {
        await createDemand(payload);
        await refreshDemands(1);
        closeModal();
        setSuccess("Demanda criada com sucesso.");
      }
    } catch (submissionError) {
      setError(
        toApiError(submissionError, "Nao foi possivel salvar a demanda."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(demand: ManagedDemandType) {
    const shouldDelete = window.confirm(
      `Deseja remover a demanda "${demand.title}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeDemand(demand.id);
      const targetPage = demands.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

      await refreshDemands(targetPage);

      if (activeDemand?.id === demand.id) {
        closeModal();
      }

      setSuccess("Demanda removida com sucesso.");
    } catch (deleteError) {
      setError(
        toApiError(deleteError, "Nao foi possivel remover a demanda."),
      );
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando demandas...</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                Demandas
              </p>
              <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
                Gestão de demandas
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                Acompanhe as demandas do gabinete em uma listagem unica e use o
                modal para criar, editar e consultar o historico de cada item.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              Nova demanda
            </button>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
              {success}
            </div>
          ) : null}

          <form
            className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
            onSubmit={handleApplyFilters}
          >
            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr_0.9fr_0.9fr_0.9fr]">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Buscar por titulo
                </span>
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Digite parte do titulo da demanda"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Responsavel
                </span>
                <select
                  value={filters.responsibleUserId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      responsibleUserId: event.target.value,
                      onlyMine:
                        Boolean(currentUserId) &&
                        event.target.value === String(currentUserId),
                    }))
                  }
                >
                  <option value="">Todos os responsaveis</option>
                  {options.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Status</span>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as DemandFilterState["status"],
                    }))
                  }
                >
                  <option value="">Todos os status</option>
                  <option value="open">Aberta</option>
                  <option value="under_review">Em analise</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluida</option>
                  <option value="discarded">Descartada</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Ordenar por
                </span>
                <select
                  value={filters.sortBy}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      sortBy: event.target.value as DemandFilterState["sortBy"],
                    }))
                  }
                >
                  <option value="created_at">Data de criacao</option>
                  <option value="title">Titulo</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Ordem</span>
                <select
                  value={filters.sortDirection}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      sortDirection:
                        event.target.value as DemandFilterState["sortDirection"],
                    }))
                  }
                >
                  <option value="desc">Decrescente</option>
                  <option value="asc">Crescente</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleFilterForCurrentUser}
                disabled={!currentUserId || isRefreshingList}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  filters.onlyMine
                    ? "bg-primary text-white hover:bg-primary-strong"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`}
              >
                Para mim
              </button>
              <button
                type="submit"
                disabled={isRefreshingList}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshingList ? "Aplicando..." : "Aplicar filtros"}
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={isRefreshingList}
                className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar filtros
              </button>
            </div>
          </form>

          <div className="mt-8 grid gap-4">
            {demands.length > 0 ? (
              demands.map((demand) => (
                <article
                  key={demand.id}
                  className="rounded-3xl border border-border bg-surface-strong p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                          {formatStatusLabel(demand.status)}
                        </span>
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                          {formatPriorityLabel(demand.priority)}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">
                        {demand.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {demand.description}
                      </p>
                      <div className="mt-4 grid gap-1 text-xs leading-6 text-muted md:grid-cols-2">
                        <span>
                          Responsavel: {demand.user?.name ?? "Nao informado"}
                        </span>
                        <span>Cidade: {demand.city?.name ?? "Nao informada"}</span>
                        <span>
                          Instituicao: {demand.institution?.name ?? "Nao informada"}
                        </span>
                        <span>
                          Area atendida: {formatServiceAreaLabel(demand.service_area)}
                        </span>
                        <span>
                          Oficio: {demand.oficio_original_name ?? "Nao anexado"}
                        </span>
                        <span>Abertura: {formatDateTime(demand.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {demand.oficio_original_name ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadOficio(demand)}
                          className="rounded-xl border border-sky-300/60 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
                        >
                          Baixar oficio
                        </button>
                      ) : null}
                      {demand.status === "discarded" && demand.discard_message ? (
                        <button
                          type="button"
                          onClick={() => openDiscardReasonModal(demand)}
                          className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Ver motivo
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditModal(demand)}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(demand)}
                        className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted">
                Nenhuma demanda cadastrada ate o momento.
              </p>
            )}

            <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
              <span>Total: {totalDemands}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshDemands(currentPage - 1)}
                  disabled={currentPage <= 1 || isRefreshingList}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <span>
                  Pagina {currentPage} de {lastPage}
                </span>
                <button
                  type="button"
                  onClick={() => refreshDemands(currentPage + 1)}
                  disabled={currentPage >= lastPage || isRefreshingList}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Proxima
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                  {modalMode === "edit" ? "Editar demanda" : "Nova demanda"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">
                  {modalMode === "edit" ? activeDemand?.title : "Criar demanda"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background-strong"
              >
                Fechar
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-88px)] gap-0 overflow-y-auto xl:grid-cols-[1.1fr_0.9fr]">
              <section className="p-6">
                <form className="grid gap-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Titulo</span>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Titulo da demanda"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Descricao
                    </span>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Descricao detalhada da demanda"
                      rows={5}
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Area atendida
                    </span>
                    <select
                      value={form.serviceArea}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceArea: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Selecione a area da demanda</option>
                      {options.service_areas.map((serviceArea) => (
                        <option key={serviceArea.value} value={serviceArea.value}>
                          {serviceArea.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Status
                      </span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target.value as DemandFormState["status"],
                          }))
                        }
                      >
                        <option value="open">Aberta</option>
                        <option value="under_review">Em analise</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="completed">Concluida</option>
                        <option value="discarded">Descartada</option>
                      </select>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Prioridade
                      </span>
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target.value as DemandFormState["priority"],
                          }))
                        }
                      >
                        <option value="">Nao definida</option>
                        <option value="low">Baixa</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Usuario responsavel
                    </span>
                    <select
                      value={form.responsibleUserId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          responsibleUserId: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Sem responsavel definido</option>
                      {options.users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Cidade
                      </span>
                      <select
                        value={form.cityId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            cityId: event.target.value,
                            institutionId: "",
                          }))
                        }
                        required
                      >
                        <option value="">Selecione a cidade</option>
                        {options.cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name} ({city.region})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Instituicao
                      </span>
                      <select
                        value={form.institutionId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            institutionId: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Selecione a instituicao</option>
                        {filteredInstitutions.map((institution) => (
                          <option key={institution.id} value={institution.id}>
                            {institution.name} ({institution.type})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Oficio vinculado</p>
                        <p className="text-xs leading-6 text-muted">
                          Aceita PDF, imagem, DOC/DOCX e planilhas.
                        </p>
                      </div>

                      {activeDemand?.oficio_original_name && !removeOficio ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadOficio(activeDemand)}
                          className="rounded-xl border border-sky-300/60 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
                        >
                          Baixar oficio atual
                        </button>
                      ) : null}
                    </div>

                    {activeDemand?.oficio_original_name ? (
                      <p className="text-sm leading-6 text-muted">
                        Atual: <strong className="text-foreground">{activeDemand.oficio_original_name}</strong>
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-muted">
                        Nenhum oficio anexado a esta demanda.
                      </p>
                    )}

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        {activeDemand?.oficio_original_name
                          ? "Substituir oficio"
                          : "Anexar oficio"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ods,.csv"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setOficioFile(file);

                          if (file) {
                            setRemoveOficio(false);
                          }
                        }}
                      />
                    </label>

                    {oficioFile ? (
                      <p className="text-sm leading-6 text-muted">
                        Novo arquivo selecionado:{" "}
                        <strong className="text-foreground">{oficioFile.name}</strong>
                      </p>
                    ) : null}

                    {modalMode === "edit" && activeDemand?.oficio_original_name ? (
                      <label className="flex items-center gap-3 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={removeOficio}
                          onChange={(event) => {
                            const shouldRemove = event.target.checked;
                            setRemoveOficio(shouldRemove);

                            if (shouldRemove) {
                              setOficioFile(null);
                            }
                          }}
                        />
                        Remover oficio atual
                      </label>
                    ) : null}
                  </div>

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
                        : modalMode === "edit"
                          ? "Salvar alteracoes"
                          : "Criar demanda"}
                    </button>

                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>

              <aside className="border-t border-border bg-background/60 p-6 xl:border-t-0 xl:border-l">
                <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                  Historico
                </p>
                <h4 className="mt-3 text-2xl font-semibold text-foreground">
                  {modalMode === "edit"
                    ? "Alteracoes registradas"
                    : "Historico disponivel apos criar"}
                </h4>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {modalMode === "edit"
                    ? "Cada salvamento com mudancas gera automaticamente um registro de historico para esta demanda."
                    : "O historico desta demanda sera criado automaticamente quando ela for salva e passar por alteracoes."}
                </p>

                {modalMode === "edit" ? (
                  <>
                    {historyError ? (
                      <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
                        {historyError}
                      </div>
                    ) : null}

                    <div className="mt-6 grid gap-4">
                      {isHistoryLoading ? (
                        <p className="text-sm leading-7 text-muted">
                          Carregando historico...
                        </p>
                      ) : demandHistories.length > 0 ? (
                        demandHistories.map((history) => (
                          <article
                            key={history.id}
                            className="rounded-3xl border border-border bg-surface p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                                {formatHistoryAction(history.action)}
                              </span>
                              <span className="text-xs text-muted">
                                {formatDateTime(history.created_at)}
                              </span>
                            </div>

                            <p className="mt-3 text-sm font-semibold text-foreground">
                              {history.description}
                            </p>
                            <p className="mt-1 text-xs leading-6 text-muted">
                              Responsavel pelo registro:{" "}
                              {history.user?.name ?? "Nao identificado"}
                            </p>

                            <HistoryMetadata metadata={history.metadata} />
                          </article>
                        ))
                      ) : (
                        <p className="text-sm leading-7 text-muted">
                          Nenhuma alteracao registrada ate o momento.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted">
                      <span>Total: {historyTotal}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeDemand || historyCurrentPage <= 1) {
                              return;
                            }

                            void loadDemandHistory(
                              activeDemand.id,
                              historyCurrentPage - 1,
                            );
                          }}
                          disabled={historyCurrentPage <= 1 || isHistoryLoading}
                          className="rounded-lg border border-border bg-background px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Anterior
                        </button>
                        <span>
                          Pagina {historyCurrentPage} de {historyLastPage}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !activeDemand ||
                              historyCurrentPage >= historyLastPage
                            ) {
                              return;
                            }

                            void loadDemandHistory(
                              activeDemand.id,
                              historyCurrentPage + 1,
                            );
                          }}
                          disabled={
                            historyCurrentPage >= historyLastPage || isHistoryLoading
                          }
                          className="rounded-lg border border-border bg-background px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Proxima
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {discardReasonDemand ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                  Demanda descartada
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">
                  {discardReasonDemand.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDiscardReasonModal}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background-strong"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6">
              <div className="rounded-3xl border border-amber-300/55 bg-amber-50 px-5 py-4">
                <p className="text-sm font-semibold text-amber-900">
                  Motivo do descarte
                </p>
                <p className="mt-3 text-sm leading-7 text-amber-950">
                  {discardReasonDemand.discard_message}
                </p>
              </div>

              <div className="grid gap-2 text-xs leading-6 text-muted sm:grid-cols-2">
                <span>Status: {formatStatusLabel(discardReasonDemand.status)}</span>
                <span>Prioridade: {formatPriorityLabel(discardReasonDemand.priority)}</span>
                <span>Cidade: {discardReasonDemand.city?.name ?? "Nao informada"}</span>
                <span>
                  Abertura: {formatDateTime(discardReasonDemand.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
