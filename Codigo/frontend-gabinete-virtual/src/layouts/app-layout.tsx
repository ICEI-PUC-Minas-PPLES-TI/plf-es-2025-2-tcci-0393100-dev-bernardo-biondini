import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  listAgendaAlerts,
  markAgendaAlertAsRead,
  toApiError,
} from "../lib/agenda-api";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import {
  listUnreadDemandAlerts,
  markDemandAlertAsRead,
  toDemandAlertApiError,
} from "../lib/demand-alert-api";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import type { DemandAlertType } from "../types/demand-alert/demand-alert-type";
import type { EventAlertType } from "../types/event/event-alert-type";

interface PopupNotification {
  id: number;
  kind: "agenda_reminder" | "demand_alert";
  title: string;
  message: string;
  route: string;
  sortAt: string;
}

export function AppLayout() {
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [demandAlerts, setDemandAlerts] = useState<DemandAlertType[]>([]);
  const [agendaReminders, setAgendaReminders] = useState<EventAlertType[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);

  const canViewUsers = hasPermission(
    permissionCodes,
    PERMISSION_CODES.USERS_VIEW,
  );
  const canManageAmendments = hasPermission(
    permissionCodes,
    PERMISSION_CODES.AMENDMENTS_MANAGE,
  );
  const canManageProjectLaws = hasPermission(
    permissionCodes,
    PERMISSION_CODES.PROJECT_LAWS_MANAGE,
  );
  const canManageAgenda = hasPermission(
    permissionCodes,
    PERMISSION_CODES.AGENDA_MANAGE,
  );
  const canManageCms = hasPermission(permissionCodes, PERMISSION_CODES.CMS_MANAGE);
  const canViewRoles = hasPermission(
    permissionCodes,
    PERMISSION_CODES.ROLES_VIEW,
  );
  const canManageDemands = hasPermission(
    permissionCodes,
    PERMISSION_CODES.DEMANDS_MANAGE,
  );

  useEffect(() => {
    async function loadLayoutState() {
      const token = getStoredToken();

      if (!token) {
        setPermissionCodes([]);
        setDemandAlerts([]);
        setAgendaReminders([]);
        return;
      }

      const [user, unreadDemandAlerts, unreadAgendaReminders] = await Promise.all([
        getAuthenticatedUserByToken(token),
        listUnreadDemandAlerts().catch(() => []),
        listAgendaAlerts(1, 15, { status: "unread" }).catch(() => ({
          data: [],
          meta: {
            total: 0,
            per_page: 15,
            current_page: 1,
            last_page: 1,
            from: null,
            to: null,
          },
        })),
      ]);

      if (!user) {
        setPermissionCodes([]);
        setDemandAlerts([]);
        setAgendaReminders([]);
        return;
      }

      setPermissionCodes(user.permissions);
      setDemandAlerts(unreadDemandAlerts);
      setAgendaReminders(unreadAgendaReminders.data);
    }

    void loadLayoutState();
  }, []);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      return undefined;
    }

    const configuredBaseUrl =
      import.meta.env.VITE_CHATBOT_URL ?? "http://localhost:8001";
    const websocketBaseUrl = configuredBaseUrl.replace(/^http/i, "ws");
    const socket = new WebSocket(
      `${websocketBaseUrl}/ws/alerts?token=${encodeURIComponent(token)}`,
    );

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as
          | {
              type?: string;
              alert?: {
                id: number;
                demand_id?: number | null;
                event_id?: number | null;
                title: string;
                message: string;
              };
            }
          | undefined;

        if (
          (payload?.type !== "demand_alert" && payload?.type !== "agenda_reminder") ||
          !payload.alert
        ) {
          return;
        }

        if (payload.type === "demand_alert") {
          if (payload.alert.demand_id == null) {
            return;
          }

          setDemandAlerts((current) => {
            if (current.some((alert) => alert.id === payload.alert?.id)) {
              return current;
            }

            return [
              {
                id: payload.alert.id,
                demand_id: payload.alert.demand_id,
                user_id: null,
                citizen_id: null,
                title: payload.alert.title,
                message: payload.alert.message,
                type: "demand_updated",
                channel: "system",
                status: "sent",
                metadata: null,
                read_at: null,
                sent_at: new Date().toISOString(),
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...current,
            ];
          });

          return;
        }

        setAgendaReminders((current) => {
          if (current.some((alert) => alert.id === payload.alert?.id)) {
            return current;
          }

          return [
            {
              id: payload.alert.id,
              event_id: payload.alert.event_id ?? null,
              user_id: null,
              title: payload.alert.title,
              message: payload.alert.message,
              alert_at: new Date().toISOString(),
              lead_time_minutes: null,
              channel: "system",
              status: "sent",
              is_automatic: true,
              is_recurring: false,
              sent_at: new Date().toISOString(),
              read_at: null,
              error_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              event: null,
            },
            ...current,
          ];
        });
      } catch {
        // Ignore malformed payloads from the realtime channel.
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const popupNotifications = useMemo<PopupNotification[]>(() => {
    const demandNotifications = demandAlerts.map((alert) => ({
      id: alert.id,
      kind: "demand_alert" as const,
      title: alert.title,
      message: alert.message,
      route: "/painel/demandas",
      sortAt: alert.sent_at ?? alert.created_at,
    }));
    const reminderNotifications = agendaReminders.map((reminder) => ({
      id: reminder.id,
      kind: "agenda_reminder" as const,
      title: reminder.title,
      message: reminder.message ?? "Lembrete de agenda disponível.",
      route: "/painel/lembretes",
      sortAt: reminder.sent_at ?? reminder.created_at,
    }));

    return [...demandNotifications, ...reminderNotifications].sort(
      (left, right) =>
        new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime(),
    );
  }, [agendaReminders, demandAlerts]);

  async function handleDismissAlert(notification: PopupNotification) {
    try {
      if (notification.kind === "demand_alert") {
        await markDemandAlertAsRead(notification.id);
        setDemandAlerts((current) =>
          current.filter((alert) => alert.id !== notification.id),
        );
        setAlertError(null);
        return;
      }

      await markAgendaAlertAsRead(notification.id);
      setAgendaReminders((current) =>
        current.filter((alert) => alert.id !== notification.id),
      );
      setAlertError(null);
    } catch (error) {
      if (notification.kind === "demand_alert") {
        setAlertError(
          toDemandAlertApiError(error, "Nao foi possivel atualizar o alerta."),
        );
        return;
      }

      setAlertError(
        toApiError(error, "Nao foi possivel atualizar o lembrete."),
      );
    }
  }

  return (
    <div className="app-shell min-h-screen px-6 py-6 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card-surface rounded-[32px] p-6">
          <div className="space-y-3">
            <Link
              to="/painel"
              className="text-sm font-semibold tracking-[0.22em] uppercase text-primary"
            >
              Gabinete Virtual
            </Link>
            <h1 className="section-title text-3xl font-semibold text-foreground">
              Painel interno
            </h1>
          </div>

          <nav className="mt-8 grid gap-2">
            <NavLink
              to="/painel"
              end
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/painel/lembretes"
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`
              }
            >
              Lembretes
            </NavLink>
            {canViewUsers ? (
              <NavLink
                to="/painel/usuarios"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Usuarios
              </NavLink>
            ) : null}
            {canManageDemands ? (
              <NavLink
                to="/painel/demandas"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Demandas
              </NavLink>
            ) : null}
            {canManageAmendments ? (
              <NavLink
                to="/painel/emendas"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Emendas
              </NavLink>
            ) : null}
            {canManageProjectLaws ? (
              <NavLink
                to="/painel/projetos-de-lei"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Projetos de lei
              </NavLink>
            ) : null}
            {canManageAgenda ? (
              <NavLink
                to="/painel/agenda"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Agenda
              </NavLink>
            ) : null}
            {canManageCms ? (
              <NavLink
                to="/painel/cms"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                CMS
              </NavLink>
            ) : null}
            {canViewRoles ? (
              <NavLink
                to="/painel/papeis"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Papeis
              </NavLink>
            ) : null}
          </nav>

          <div className="mt-8 rounded-[28px] bg-primary px-5 py-6 text-white">
            <p className="text-xs tracking-[0.2em] uppercase text-white/72">
              Sessao ativa
            </p>
            {popupNotifications.length > 0 ? (
              <p className="mt-3 inline-flex rounded-full bg-white/16 px-3 py-1 text-xs font-semibold text-white">
                {popupNotifications.length} alerta{popupNotifications.length > 1 ? "s" : ""} pendente{popupNotifications.length > 1 ? "s" : ""}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-white/88">
              Indicadores consolidados, atividades recentes e atalhos do painel
              interno.
            </p>
          </div>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>

      {popupNotifications.length > 0 ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex max-w-sm flex-col gap-3">
          {popupNotifications.slice(0, 4).map((notification) => (
            <section
              key={`${notification.kind}-${notification.id}`}
              className="pointer-events-auto rounded-3xl border border-sky-200 bg-white px-5 py-4 shadow-2xl"
            >
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-700">
                {notification.kind === "demand_alert"
                  ? "Demanda atualizada"
                  : "Lembrete de agenda"}
              </p>
              <h3 className="mt-2 text-base font-semibold text-foreground">
                {notification.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{notification.message}</p>
              <div className="mt-4 flex justify-between gap-2">
                <Link
                  to={notification.route}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  Abrir
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDismissAlert(notification)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                >
                  Fechar
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {alertError ? (
        <div className="fixed bottom-6 left-6 z-[60] rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger shadow-xl">
          {alertError}
        </div>
      ) : null}
    </div>
  );
}
