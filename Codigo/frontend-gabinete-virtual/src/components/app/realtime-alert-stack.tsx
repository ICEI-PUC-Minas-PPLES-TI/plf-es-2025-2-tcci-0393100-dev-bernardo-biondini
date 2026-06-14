import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card } from "../core";

export interface RealtimePopupNotification {
  id: number;
  kind: "agenda_reminder" | "demand_alert";
  title: string;
  message: string;
  route: string;
}

interface RealtimeAlertStackProps {
  notifications: RealtimePopupNotification[];
  alertError: string | null;
  onDismiss: (notification: RealtimePopupNotification) => void | Promise<void>;
}

const DISPLAY_DURATION_MS = 15000;

export function RealtimeAlertStack({
  notifications,
  alertError,
  onDismiss,
}: RealtimeAlertStackProps) {
  const [hiddenNotificationKeys, setHiddenNotificationKeys] = useState<string[]>([]);
  const [visibleAlertError, setVisibleAlertError] = useState<string | null>(alertError);
  const timeoutRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    const activeKeys = new Set(
      notifications.map((notification) => `${notification.kind}-${notification.id}`),
    );

    setHiddenNotificationKeys((current) =>
      current.filter((key) => activeKeys.has(key)),
    );

    notifications.forEach((notification) => {
      const key = `${notification.kind}-${notification.id}`;

      if (timeoutRefs.current[key]) {
        return;
      }

      timeoutRefs.current[key] = window.setTimeout(() => {
        setHiddenNotificationKeys((current) =>
          current.includes(key) ? current : [...current, key],
        );
        delete timeoutRefs.current[key];
      }, DISPLAY_DURATION_MS);
    });

    Object.keys(timeoutRefs.current).forEach((key) => {
      if (activeKeys.has(key)) {
        return;
      }

      window.clearTimeout(timeoutRefs.current[key]);
      delete timeoutRefs.current[key];
    });
  }, [notifications]);

  useEffect(() => {
    setVisibleAlertError(alertError);

    if (!alertError) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleAlertError((current) => (current === alertError ? null : current));
    }, DISPLAY_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [alertError]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutRefs.current = {};
    };
  }, []);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !hiddenNotificationKeys.includes(`${notification.kind}-${notification.id}`),
      ),
    [hiddenNotificationKeys, notifications],
  );

  return (
    <>
      {visibleNotifications.length > 0 ? (
        <div className="pointer-events-none fixed top-6 left-1/2 z-[60] flex w-[min(100%-2rem,32rem)] -translate-x-1/2 flex-col gap-3">
          {visibleNotifications.slice(0, 4).map((notification) => (
            <Card
              key={`${notification.kind}-${notification.id}`}
              className="pointer-events-auto rounded-3xl border-warning/40 bg-warning-light px-5 py-4 shadow-[0_22px_55px_rgba(122,78,13,0.28)]"
              padding="none"
            >
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-warning-dark">
                {notification.kind === "demand_alert"
                  ? "Demanda atualizada"
                  : "Lembrete de agenda"}
              </p>
              <h3 className="mt-2 text-base font-semibold text-warning-dark">
                {notification.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-warning-dark/90">
                {notification.message}
              </p>
              <div className="mt-4 flex justify-between gap-2">
                <Link to={notification.route}>
                  <Button tone="warning" size="sm">
                    Abrir
                  </Button>
                </Link>
                <Button
                  type="button"
                  tone="warning"
                  variant="outline"
                  size="sm"
                  onClick={() => void onDismiss(notification)}
                >
                  Fechar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {visibleAlertError ? (
        <Alert
          tone="danger"
          className="fixed top-6 left-6 z-[70] shadow-[0_22px_55px_rgba(122,30,46,0.28)]"
        >
          {visibleAlertError}
        </Alert>
      ) : null}
    </>
  );
}
