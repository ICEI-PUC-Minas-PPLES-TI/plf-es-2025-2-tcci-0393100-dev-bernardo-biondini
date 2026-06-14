import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  PanelSidebar,
  type PanelSidebarItem,
} from "../components/app/panel-sidebar";
import {
  RealtimeAlertStack,
  type RealtimePopupNotification,
} from "../components/app/realtime-alert-stack";
import { Button } from "../components/core";
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

interface PopupNotification extends RealtimePopupNotification {
  sortAt: string;
}

export function AppLayout() {
  const location = useLocation();
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [demandAlerts, setDemandAlerts] = useState<DemandAlertType[]>([]);
  const [agendaReminders, setAgendaReminders] = useState<EventAlertType[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const sidebarItems = useMemo<PanelSidebarItem[]>(() => {
    const items: PanelSidebarItem[] = [
      { to: "/painel", label: "Dashboard", end: true },
      { to: "/painel/lembretes", label: "Lembretes" },
    ];

    if (canViewUsers) {
      items.push({ to: "/painel/usuarios", label: "Usuarios" });
    }

    if (canManageDemands) {
      items.push({ to: "/painel/demandas", label: "Demandas" });
    }

    if (canManageAmendments) {
      items.push({ to: "/painel/emendas", label: "Emendas" });
    }

    if (canManageProjectLaws) {
      items.push({ to: "/painel/projetos-de-lei", label: "Projetos de lei" });
    }

    if (canManageAgenda) {
      items.push({ to: "/painel/agenda", label: "Agenda" });
    }

    if (canManageCms) {
      items.push({ to: "/painel/cms", label: "CMS" });
    }

    if (canViewRoles) {
      items.push({ to: "/painel/papeis", label: "Papeis" });
    }

    return items;
  }, [
    canManageAgenda,
    canManageAmendments,
    canManageCms,
    canManageDemands,
    canManageProjectLaws,
    canViewRoles,
    canViewUsers,
  ]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

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

        if (payload?.type !== "demand_alert" && payload?.type !== "agenda_reminder") {
          return;
        }

        const incomingAlert = payload.alert;

        if (!incomingAlert) {
          return;
        }

        if (payload.type === "demand_alert") {
          if (incomingAlert.demand_id == null) {
            return;
          }

          const demandId = incomingAlert.demand_id;

          setDemandAlerts((current) => {
            if (current.some((alert) => alert.id === incomingAlert.id)) {
              return current;
            }

            return [
              {
                id: incomingAlert.id,
                demand_id: demandId,
                user_id: null,
                citizen_id: null,
                title: incomingAlert.title,
                message: incomingAlert.message,
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
          if (current.some((alert) => alert.id === incomingAlert.id)) {
            return current;
          }

          return [
            {
              id: incomingAlert.id,
              event_id: incomingAlert.event_id ?? null,
              user_id: null,
              title: incomingAlert.title,
              message: incomingAlert.message,
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

  async function handleDismissAlert(notification: RealtimePopupNotification) {
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
      <div
        className={`mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 ${
          isSidebarCollapsed
            ? "lg:grid-cols-[96px_1fr]"
            : "lg:grid-cols-[280px_1fr]"
        }`}
      >
        <aside>
          <PanelSidebar
            items={sidebarItems}
            pendingAlertsCount={popupNotifications.length}
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            onToggleCollapse={() =>
              setIsSidebarCollapsed((current) => !current)
            }
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              Menu
            </Button>
          </div>

          <Outlet />
        </div>
      </div>

      <RealtimeAlertStack
        notifications={popupNotifications}
        alertError={alertError}
        onDismiss={handleDismissAlert}
      />
    </div>
  );
}
