import { useEffect, useMemo, useState } from "react";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import {
  createDemand,
  downloadDemandOficio,
  getDemandOptions,
  listDemandHistories,
  listDemands,
  removeDemand,
  toApiError,
  updateDemand,
} from "../../../lib/demand-api";
import type {
  DemandOptionsType,
  ManagedDemandHistoryType,
  ManagedDemandType,
} from "../../../types/demand/managed-demand-type";
import type { BadgeTone } from "../../core";
import { Card } from "../../core";
import { DemandDiscardReasonModal } from "./demand-discard-reason-modal";
import { DemandsCreateEditModal } from "./demands-create-edit-modal";
import { DemandsListSection } from "./demands-list-section";
import type { DemandFilterState, DemandFormState, DemandModalMode } from "./types";

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

function formatStatusTone(status: ManagedDemandType["status"]): BadgeTone {
  const tones: Record<ManagedDemandType["status"], BadgeTone> = {
    open: "primary",
    under_review: "warning",
    in_progress: "warning",
    completed: "success",
    discarded: "danger",
  };

  return tones[status];
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

function formatPriorityTone(priority: ManagedDemandType["priority"]): BadgeTone {
  if (!priority) {
    return "neutral";
  }

  const tones: Record<NonNullable<ManagedDemandType["priority"]>, BadgeTone> = {
    low: "neutral",
    medium: "warning",
    high: "danger",
  };

  return tones[priority];
}

function formatHistoryAction(action: string): string {
  const labels: Record<string, string> = {
    created: "Criacao",
    updated: "Atualizacao",
    deleted: "Remocao",
  };

  return labels[action] ?? action;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

export function DemandsManagement() {
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
  const [modalMode, setModalMode] = useState<DemandModalMode>("create");
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
        setError(toApiError(requestError, "Nao foi possivel carregar as demandas."));
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
        options.service_areas.map((serviceArea) => [serviceArea.value, serviceArea.label]),
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
      const response = await listDemands(page, perPage, toDemandListFilters(activeFilters));
      setDemands(response.data);
      setCurrentPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
      setTotalDemands(response.meta.total);

      return response;
    } finally {
      setIsRefreshingList(false);
    }
  }

  async function handleApplyFilters(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshDemands(1, filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel aplicar os filtros."));
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
      setError(toApiError(requestError, "Nao foi possivel aplicar o filtro para voce."));
    }
  }

  async function handleClearFilters() {
    const nextFilters: DemandFilterState = { ...DEFAULT_FILTERS };

    setFilters(nextFilters);
    setError(null);
    setSuccess(null);

    try {
      await refreshDemands(1, nextFilters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel limpar os filtros."));
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
      setHistoryError(toApiError(requestError, "Nao foi possivel carregar o historico."));
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
      responsibleUserId: demand.responsible_user_id ? String(demand.responsible_user_id) : "",
      cityId: String(demand.city_id),
      institutionId: demand.institution_id ? String(demand.institution_id) : "",
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

  async function handleDownloadOficio(demand: ManagedDemandType) {
    if (!demand.oficio_original_name) {
      return;
    }

    try {
      await downloadDemandOficio(demand.id, demand.oficio_original_name);
    } catch (downloadError) {
      setError(toApiError(downloadError, "Nao foi possivel baixar o oficio da demanda."));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.cityId) {
        setError("Selecione a cidade da demanda.");
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

      if (form.responsibleUserId) {
        payload.set("responsible_user_id", String(Number(form.responsibleUserId)));
      }

      if (form.institutionId) {
        payload.set("institution_id", String(Number(form.institutionId)));
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
      setError(toApiError(submissionError, "Nao foi possivel salvar a demanda."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(demand: ManagedDemandType) {
    const shouldDelete = window.confirm(`Deseja remover a demanda "${demand.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeDemand(demand.id);
      const targetPage = demands.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      await refreshDemands(targetPage);

      if (activeDemand?.id === demand.id) {
        closeModal();
      }

      setSuccess("Demanda removida com sucesso.");
    } catch (deleteError) {
      setError(toApiError(deleteError, "Nao foi possivel remover a demanda."));
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando demandas...</p>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="grid gap-6">
        <DemandsListSection
          demands={demands}
          options={options}
          filters={filters}
          totalDemands={totalDemands}
          currentPage={currentPage}
          lastPage={lastPage}
          currentUserId={currentUserId}
          isRefreshingList={isRefreshingList}
          error={error}
          success={success}
          onOpenCreate={openCreateModal}
          onChangeFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onApplyFilters={handleApplyFilters}
          onFilterForCurrentUser={() => void handleFilterForCurrentUser()}
          onClearFilters={() => void handleClearFilters()}
          onEdit={openEditModal}
          onDelete={(demand) => void handleDelete(demand)}
          onDownloadOficio={(demand) => void handleDownloadOficio(demand)}
          onOpenDiscardReason={setDiscardReasonDemand}
          onPageChange={(page) => void refreshDemands(page)}
          formatStatusLabel={formatStatusLabel}
          formatStatusTone={formatStatusTone}
          formatPriorityLabel={formatPriorityLabel}
          formatPriorityTone={formatPriorityTone}
          formatServiceAreaLabel={formatServiceAreaLabel}
          formatDateTime={formatDateTime}
        />
      </main>

      <DemandsCreateEditModal
        open={isModalOpen}
        onClose={closeModal}
        modalMode={modalMode}
        activeDemand={activeDemand}
        form={form}
        options={options}
        filteredInstitutions={filteredInstitutions}
        oficioFile={oficioFile}
        removeOficio={removeOficio}
        isSubmitting={isSubmitting}
        error={error}
        success={success}
        demandHistories={demandHistories}
        historyCurrentPage={historyCurrentPage}
        historyLastPage={historyLastPage}
        historyTotal={historyTotal}
        isHistoryLoading={isHistoryLoading}
        historyError={historyError}
        onChangeForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        onSetOficioFile={setOficioFile}
        onSetRemoveOficio={setRemoveOficio}
        onDownloadOficio={(demand) => void handleDownloadOficio(demand)}
        onHistoryPageChange={(page) => {
          if (!activeDemand) {
            return;
          }

          void loadDemandHistory(activeDemand.id, page);
        }}
        formatHistoryAction={formatHistoryAction}
        formatDateTime={formatDateTime}
      />

      <DemandDiscardReasonModal
        demand={discardReasonDemand}
        onClose={() => setDiscardReasonDemand(null)}
        formatStatusLabel={formatStatusLabel}
        formatStatusTone={formatStatusTone}
        formatPriorityLabel={formatPriorityLabel}
        formatPriorityTone={formatPriorityTone}
        formatDateTime={formatDateTime}
      />
    </>
  );
}
