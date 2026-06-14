import { FormEvent, useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import { Alert, Badge, Button, Card, Input, Select } from "../components/core";
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

function getReminderTone(
  reminder: EventAlertType,
): "neutral" | "primary" | "success" {
  if (reminder.read_at) {
    return "success";
  }

  if (reminder.sent_at) {
    return "primary";
  }

  return "neutral";
}

export function RemindersPage() {
  const [filters, setFilters] = useState<ReminderFilterState>(DEFAULT_FILTERS);
  const [reminders, setReminders] = useState<EventAlertType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadReminders = useCallback(async (activeFilters: ReminderFilterState) => {
    const response = await listAgendaAlerts(1, 30, {
      month: Number(activeFilters.month),
      year: Number(activeFilters.year),
      status: activeFilters.status,
    });

    setReminders(response.data);
  }, []);

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
  }, [loadReminders]);

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
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando lembretes...</p>
        </Card>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="grid gap-6">
      <Card padding="lg">
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
            <Input
              type="number"
              min="1"
              max="12"
              label="Mes"
              value={filters.month}
              onChange={(event) =>
                setFilters((current) => ({ ...current, month: event.target.value }))
              }
            />
            <Input
              type="number"
              min="2020"
              label="Ano"
              value={filters.year}
              onChange={(event) =>
                setFilters((current) => ({ ...current, year: event.target.value }))
              }
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as ReminderFilterState["status"],
                }))
              }
              options={[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Agendados" },
                { value: "unread", label: "Enviados e nao lidos" },
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Aplicar filtros</Button>
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                void loadReminders(DEFAULT_FILTERS);
              }}
            >
              Limpar
            </Button>
          </div>
        </form>

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {success ? (
          <Alert tone="success" className="mt-6">
            {success}
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-4">
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <Card
                key={reminder.id}
                className="rounded-3xl bg-surface-strong"
                padding="sm"
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
                  <Badge tone={getReminderTone(reminder)}>
                    {formatReminderStatus(reminder)}
                  </Badge>
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
                    <Button
                      type="button"
                      onClick={() => void handleMarkAsRead(reminder.id)}
                      tone="neutral"
                      variant="outline"
                      size="sm"
                      isLoading={isUpdating === reminder.id}
                      loadingText="Salvando..."
                    >
                      Marcar como lido
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">Nenhum lembrete encontrado.</p>
          )}
        </div>
      </Card>
    </main>
  );
}
