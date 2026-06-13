import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import {
  createAgendaEvent,
  extractAgendaConflicts,
  getAgendaOptions,
  listAgendaEvents,
  removeAgendaEvent,
  toApiError,
  updateAgendaEvent,
} from "../lib/agenda-api";
import type { AgendaOptionsType } from "../types/event/agenda-options-type";
import type { EventType } from "../types/event/event-type";

interface AgendaEventFormState {
  title: string;
  type: EventType["type"];
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  participantsExpected: string;
  color: string;
  cityId: string;
  demandIds: string[];
}

interface AgendaFilterState {
  month: string;
  year: string;
  search: string;
  cityId: string;
  sortDirection: "asc" | "desc";
}

const now = new Date();

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
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
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
    meeting: "Reunião",
    audience: "Audiência",
    visit: "Visita",
    session: "Sessão",
    other: "Outro",
  };

  return labels[type] ?? type;
}

export function AgendaPage() {
  const perPage = 10;
  const [events, setEvents] = useState<EventType[]>([]);
  const [options, setOptions] = useState<AgendaOptionsType>({
    types: [],
    cities: [],
    demands: [],
  });
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
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

  const month = Number(filters.month);
  const year = Number(filters.year);

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

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.AGENDA_MANAGE)) {
          setHasForbiddenAccess(true);
          return;
        }

        const [eventsResponse, optionsResponse] = await Promise.all([
          listAgendaEvents(1, perPage, {
            month,
            year,
            search: filters.search,
            cityId: filters.cityId ? Number(filters.cityId) : null,
            sortDirection: filters.sortDirection,
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
      month: Number(activeFilters.month),
      year: Number(activeFilters.year),
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
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshEvents(1, filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel aplicar os filtros da agenda."));
    }
  }

  async function handleSubmitEvent(event: FormEvent<HTMLFormElement>) {
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
        handleResetEventForm();
        setSuccess("Evento criado com sucesso.");
      }
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
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando agenda...</p>
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
            Você não possui permissão para visualizar a agenda.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissão <strong>agenda.manage</strong>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Cadastro de evento
        </p>
        <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
          Agenda da deputada
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Registre compromissos com local, período, tipo e vínculos com cidade e demandas.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmitEvent}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Título</span>
              <input
                value={eventForm.title}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex.: Reunião com lideranças"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Tipo</span>
              <select
                value={eventForm.type}
                onChange={(event) =>
                  setEventForm((current) => ({
                    ...current,
                    type: event.target.value as EventType["type"],
                  }))
                }
              >
                {(options.types.length > 0
                  ? options.types
                  : [
                      { value: "meeting", label: "Reunião" },
                      { value: "audience", label: "Audiência" },
                      { value: "visit", label: "Visita" },
                      { value: "session", label: "Sessão" },
                      { value: "other", label: "Outro" },
                    ]
                ).map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Início</span>
              <input
                type="datetime-local"
                value={eventForm.startsAt}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, startsAt: event.target.value }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Término</span>
              <input
                type="datetime-local"
                value={eventForm.endsAt}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, endsAt: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Local</span>
              <input
                value={eventForm.location}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Ex.: Assembleia Legislativa"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Cidade</span>
              <select
                value={eventForm.cityId}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, cityId: event.target.value }))
                }
              >
                <option value="">Sem cidade vinculada</option>
                {options.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} - {city.region}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Participantes</span>
              <input
                type="number"
                min="1"
                value={eventForm.participantsExpected}
                onChange={(event) =>
                  setEventForm((current) => ({
                    ...current,
                    participantsExpected: event.target.value,
                  }))
                }
                placeholder="Ex.: 20"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Cor</span>
              <input
                type="color"
                value={eventForm.color}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, color: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Descrição</span>
            <input
              value={eventForm.description}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Detalhes do compromisso"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Demandas vinculadas</span>
            <select
              multiple
              className="min-h-44"
              value={eventForm.demandIds}
              onChange={(event) => {
                const selectedValues = Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                );

                setEventForm((current) => ({ ...current, demandIds: selectedValues }));
              }}
            >
              {options.demands.map((demand) => (
                <option key={demand.id} value={demand.id}>
                  {demand.title}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {conflicts.length > 0 ? (
            <div className="rounded-2xl border border-danger/35 bg-danger/8 px-4 py-3 text-sm text-danger">
              <p className="font-semibold">Conflitos encontrados:</p>
              <ul className="mt-2 space-y-2">
                {conflicts.map((conflict) => (
                  <li key={String(conflict.id)}>
                    {String(conflict.title)} - {formatDateTime(String(conflict.starts_at))}
                  </li>
                ))}
              </ul>
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
              disabled={isSubmittingEvent}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmittingEvent
                ? "Salvando..."
                : editingEventId
                  ? "Atualizar evento"
                  : "Criar evento"}
            </button>
            <button
              type="button"
              onClick={handleResetEventForm}
              disabled={isSubmittingEvent}
              className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              Limpar formulário
            </button>
          </div>
        </form>
      </section>

      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">Calendário</p>
        <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
          Eventos do período
        </h2>

        <form
          className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
          onSubmit={handleApplyFilters}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.4fr_1fr_1fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Mês</span>
              <input
                type="number"
                min="1"
                max="12"
                value={filters.month}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, month: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Ano</span>
              <input
                type="number"
                min="2020"
                value={filters.year}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, year: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Buscar</span>
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Título ou local"
              />
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
              <span className="text-sm font-medium text-foreground">Ordem</span>
              <select
                value={filters.sortDirection}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortDirection: event.target.value as AgendaFilterState["sortDirection"],
                  }))
                }
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
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
          </div>
        </form>

        <div className="mt-6 grid gap-4">
          {events.length > 0 ? (
            events.map((eventItem) => (
              <article
                key={eventItem.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{eventItem.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted">{eventItem.location}</p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {formatEventType(eventItem.type)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                  <p>
                    <strong className="text-foreground">Início:</strong>{" "}
                    {formatDateTime(eventItem.starts_at)}
                  </p>
                  <p>
                    <strong className="text-foreground">Término:</strong>{" "}
                    {formatDateTime(eventItem.ends_at)}
                  </p>
                  {eventItem.city ? (
                    <p>
                      <strong className="text-foreground">Cidade:</strong> {eventItem.city.name}
                    </p>
                  ) : null}
                  {eventItem.description ? <p>{eventItem.description}</p> : null}
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(eventItem)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(eventItem)}
                    className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">Nenhum evento no período selecionado.</p>
          )}

          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
            <span>Total: {totalEvents}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshEvents(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {lastPage}
              </span>
              <button
                type="button"
                onClick={() => refreshEvents(currentPage + 1)}
                disabled={currentPage >= lastPage}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Lembretes
        </p>
        <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
          Alertas automáticos da agenda
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Cada evento gera lembretes para todos os usuários com 10 dias, 1 dia e 1
          hora de antecedência. O acompanhamento acontece em uma seção dedicada.
        </p>

        <div className="mt-8 rounded-[28px] border border-border bg-background/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">Seção de lembretes</p>
              <p className="text-sm leading-7 text-muted">
                Abra a página específica para acompanhar somente os lembretes do seu
                usuário e marcar os avisos como lidos.
              </p>
            </div>
            <Link
              to="/painel/lembretes"
              className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              Abrir lembretes
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
