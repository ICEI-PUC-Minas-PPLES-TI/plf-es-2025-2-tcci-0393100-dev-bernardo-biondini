import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import {
  listAgendaAlerts,
  markAgendaAlertAsRead,
  toApiError,
} from "../lib/agenda-api";
import type { EventAlertType } from "../types/event/event-alert-type";

interface ReminderFilterState {
  month: string;
  year: string;
  status: "all" | "pending" | "unread";
}

const now = new Date();

const DEFAULT_FILTERS: ReminderFilterState = {
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  status: "all",
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function formatReminderStatus(reminder: EventAlertType): string {
  if (reminder.read_at) {
    return "Lido";
  }

  if (reminder.sent_at) {
    return "Enviado";
  }

  return "Agendado";
}

export function RemindersPage() {
  const [filters, setFilters] = useState<ReminderFilterState>(DEFAULT_FILTERS);
  const [reminders, setReminders] = useState<EventAlertType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadReminders(activeFilters = filters) {
    const response = await listAgendaAlerts(1, 30, {
      month: Number(activeFilters.month),
      year: Number(activeFilters.year),
      status: activeFilters.status,
    });

    setReminders(response.data);
  }

  useEffect(() => {
    async function loadInitialState() {
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

        await loadReminders(DEFAULT_FILTERS);
      } catch (requestError) {
        setError(toApiError(requestError, "Nao foi possivel carregar os lembretes."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialState();
  }, []);

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await loadReminders(filters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel carregar os lembretes."));
    }
  }

  async function handleMarkAsRead(reminderId: number) {
    setIsUpdating(reminderId);
    setError(null);
    setSuccess(null);

    try {
      const updatedReminder = await markAgendaAlertAsRead(reminderId);

      setReminders((current) =>
        current.map((reminder) =>
          reminder.id === reminderId ? updatedReminder : reminder,
        ),
      );
      setSuccess("Lembrete marcado como lido.");
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel atualizar o lembrete."));
    } finally {
      setIsUpdating(null);
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando lembretes...</p>
        </section>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="grid gap-6">
      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Lembretes
        </p>
        <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
          Minha fila de alertas
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Os lembretes da agenda aparecem aqui automaticamente e consideram apenas o
          seu usuário.
        </p>

        <form
          className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
          onSubmit={handleApplyFilters}
        >
          <div className="grid gap-4 md:grid-cols-3">
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
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as ReminderFilterState["status"],
                  }))
                }
              >
                <option value="all">Todos</option>
                <option value="pending">Agendados</option>
                <option value="unread">Enviados e não lidos</option>
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

        <div className="mt-6 grid gap-4">
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <article
                key={reminder.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {reminder.title}
                    </h3>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {reminder.event
                        ? `Evento: ${reminder.event.title}`
                        : "Lembrete sem evento vinculado"}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {formatReminderStatus(reminder)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                  <p>
                    <strong className="text-foreground">Agendado para:</strong>{" "}
                    {formatDateTime(reminder.alert_at)}
                  </p>
                  <p>
                    <strong className="text-foreground">Enviado em:</strong>{" "}
                    {formatDateTime(reminder.sent_at)}
                  </p>
                  {reminder.message ? <p>{reminder.message}</p> : null}
                </div>

                {!reminder.read_at && reminder.sent_at ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMarkAsRead(reminder.id)}
                      disabled={isUpdating === reminder.id}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUpdating === reminder.id ? "Salvando..." : "Marcar como lido"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">Nenhum lembrete encontrado.</p>
          )}
        </div>
      </section>
    </main>
  );
}
