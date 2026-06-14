import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../../../lib/permission-codes";
import {
  createAgendaEvent,
  extractAgendaConflicts,
  getAgendaOptions,
  listAgendaEvents,
  removeAgendaEvent,
  toApiError,
  updateAgendaEvent,
} from "../../../lib/agenda-api";
import type { AgendaOptionsType } from "../../../types/event/agenda-options-type";
import type { EventType } from "../../../types/event/event-type";
import { Card } from "../../core";
import {
  AgendaCreateModal,
  type AgendaEventFormState,
} from "./agenda-create-modal";
import {
  AgendaListSection,
  type AgendaFilterState,
} from "./agenda-list-section";

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const EMPTY_EVENT_FORM: AgendaEventFormState = {
  title: "",
  type: "meeting",
  startsAt: "",
  endsAt: "",
  location: "",
  description: "",
  participantsExpected: "",
  color: "#315F4A",
  cityId: "",
  demandIds: [],
};

const DEFAULT_FILTERS: AgendaFilterState = {
  startsFrom: toDateInputValue(yesterday),
  endsTo: "",
  search: "",
  cityId: "",
  sortDirection: "asc",
};

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function formatEventType(type: EventType["type"]): string {
  const labels: Record<EventType["type"], string> = {
    meeting: "Reuniao",
    audience: "Audiencia",
    visit: "Visita",
    session: "Sessao",
    other: "Outro",
  };

  return labels[type] ?? type;
}

export function AgendaManagement() {
  const perPage = 10;
  const [events, setEvents] = useState<EventType[]>([]);
  const [options, setOptions] = useState<AgendaOptionsType>({
    types: [],
    cities: [],
    demands: [],
  });
  const [filters, setFilters] = useState<AgendaFilterState>(DEFAULT_FILTERS);
  const [eventForm, setEventForm] = useState<AgendaEventFormState>(EMPTY_EVENT_FORM);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [hasForbiddenAccess, setHasForbiddenAccess] = useState(false);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Array<Record<string, unknown>>>([]);
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

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.AGENDA_MANAGE)) {
          setHasForbiddenAccess(true);
          return;
        }

        const [eventsResponse, optionsResponse] = await Promise.all([
          listAgendaEvents(1, perPage, {
            startsFrom: DEFAULT_FILTERS.startsFrom || null,
            endsTo: DEFAULT_FILTERS.endsTo || null,
            search: DEFAULT_FILTERS.search,
            cityId: DEFAULT_FILTERS.cityId ? Number(DEFAULT_FILTERS.cityId) : null,
            sortDirection: DEFAULT_FILTERS.sortDirection,
          }),
          getAgendaOptions(),
        ]);

        setEvents(eventsResponse.data);
        setCurrentPage(eventsResponse.meta.current_page);
        setLastPage(eventsResponse.meta.last_page);
        setTotalEvents(eventsResponse.meta.total);
        setOptions(optionsResponse);
      } catch (requestError) {
        setError(toApiError(requestError, "Nao foi possivel carregar a agenda."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  async function refreshEvents(page = currentPage, activeFilters = filters) {
    const response = await listAgendaEvents(page, perPage, {
      startsFrom: activeFilters.startsFrom || null,
      endsTo: activeFilters.endsTo || null,
      search: activeFilters.search,
      cityId: activeFilters.cityId ? Number(activeFilters.cityId) : null,
      sortDirection: activeFilters.sortDirection,
    });

    setEvents(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalEvents(response.meta.total);
  }

  function handleResetEventForm() {
    setEditingEventId(null);
    setEventForm(EMPTY_EVENT_FORM);
    setConflicts([]);
  }

  function handleSelectEvent(eventItem: EventType) {
    setEditingEventId(eventItem.id);
    setEventForm({
      title: eventItem.title,
      type: eventItem.type,
      startsAt: toDateTimeLocal(eventItem.starts_at),
      endsAt: toDateTimeLocal(eventItem.ends_at),
      location: eventItem.location,
      description: eventItem.description ?? eventItem.context ?? "",
      participantsExpected: eventItem.participants_expected
        ? String(eventItem.participants_expected)
        : "",
      color: eventItem.color ?? "#315F4A",
      cityId: eventItem.city_id ? String(eventItem.city_id) : "",
      demandIds: (eventItem.demands ?? []).map((demand) => String(demand.id)),
    });
    setConflicts([]);
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  }

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshEvents(1, filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel aplicar os filtros da agenda."));
    }
  }

  async function handleSubmitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingEvent(true);
    setError(null);
    setSuccess(null);
    setConflicts([]);

    try {
      if (!eventForm.title.trim() || !eventForm.location.trim()) {
        setError("Informe titulo e local do evento.");
        return;
      }

      if (!eventForm.startsAt || !eventForm.endsAt) {
        setError("Informe inicio e termino do evento.");
        return;
      }

      const payload = {
        title: eventForm.title.trim(),
        type: eventForm.type,
        starts_at: eventForm.startsAt,
        ends_at: eventForm.endsAt,
        location: eventForm.location.trim(),
        description: eventForm.description.trim() || null,
        participants_expected: eventForm.participantsExpected
          ? Number(eventForm.participantsExpected)
          : null,
        color: eventForm.color || null,
        city_id: eventForm.cityId ? Number(eventForm.cityId) : null,
        demand_ids: eventForm.demandIds.map((id) => Number(id)),
      };

      if (editingEventId) {
        await updateAgendaEvent(editingEventId, payload);
        await refreshEvents(currentPage);
        setSuccess("Evento atualizado com sucesso.");
      } else {
        await createAgendaEvent(payload);
        await refreshEvents(1);
        setSuccess("Evento criado com sucesso.");
      }

      handleResetEventForm();
      setIsCreateModalOpen(false);
    } catch (submissionError) {
      const agendaConflicts = extractAgendaConflicts(submissionError);

      if (agendaConflicts.length > 0) {
        setConflicts(agendaConflicts);
      }

      setError(toApiError(submissionError, "Nao foi possivel salvar o evento."));
    } finally {
      setIsSubmittingEvent(false);
    }
  }

  async function handleDeleteEvent(eventItem: EventType) {
    const shouldDelete = window.confirm(`Deseja remover o evento "${eventItem.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeAgendaEvent(eventItem.id);
      const targetPage = events.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      await refreshEvents(targetPage);

      if (editingEventId === eventItem.id) {
        handleResetEventForm();
      }

      setSuccess("Evento removido com sucesso.");
    } catch (deleteError) {
      setError(toApiError(deleteError, "Nao foi possivel remover o evento."));
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando agenda...</p>
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
            Voce nao possui permissao para visualizar a agenda.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>agenda.manage</strong>.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <AgendaListSection
        events={events}
        options={options}
        filters={filters}
        totalEvents={totalEvents}
        currentPage={currentPage}
        lastPage={lastPage}
        error={error}
        success={success}
        onOpenCreate={() => {
          handleResetEventForm();
          setError(null);
          setSuccess(null);
          setIsCreateModalOpen(true);
        }}
        onChangeFilters={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
        }
        onApplyFilters={handleApplyFilters}
        onResetFilters={() => {
          setFilters(DEFAULT_FILTERS);
          void refreshEvents(1, DEFAULT_FILTERS);
        }}
        onEdit={handleSelectEvent}
        onDelete={(eventItem) => void handleDeleteEvent(eventItem)}
        onPageChange={(page) => void refreshEvents(page)}
        formatEventType={formatEventType}
        formatDateTime={formatDateTime}
      />

      <AgendaCreateModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          handleResetEventForm();
        }}
        form={eventForm}
        options={options}
        editingEventId={editingEventId}
        isSubmittingEvent={isSubmittingEvent}
        error={error}
        conflicts={conflicts}
        onChange={(patch) => setEventForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmitEvent}
        formatDateTime={formatDateTime}
      />
    </main>
  );
}
