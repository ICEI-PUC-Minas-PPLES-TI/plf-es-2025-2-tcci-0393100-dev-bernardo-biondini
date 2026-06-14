import { Link } from "react-router-dom";
import type {
  DashboardActivityType,
  DashboardOverviewType,
} from "../../../types/dashboard/dashboard-overview-type";
import { Card } from "../../core";

interface DashboardRecentActivitiesProps {
  activities: DashboardOverviewType["recent_activities"];
  activityAccentClassName: (type: DashboardActivityType) => string;
  activityBadge: (type: DashboardActivityType) => string;
  formatRelativeTime: (value: string) => string;
  formatDateTime: (value: string) => string;
}

export function DashboardRecentActivities({
  activities,
  activityAccentClassName,
  activityBadge,
  formatRelativeTime,
  formatDateTime,
}: DashboardRecentActivitiesProps) {
  return (
    <Card padding="lg">
      <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
        Atividades recentes
      </p>
      <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
        Ultimas movimentacoes relevantes do gabinete
      </h3>
      <div className="mt-8 grid gap-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <Link
              key={activity.id}
              to={activity.link}
              className="rounded-[28px] border border-border bg-surface-strong px-5 py-4 transition hover:bg-background-strong"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl text-xs font-bold tracking-[0.18em] uppercase ${activityAccentClassName(activity.type)}`}
                >
                  {activityBadge(activity.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {activity.title}
                    </p>
                    <span className="text-xs text-muted">
                      {formatRelativeTime(activity.occurred_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {activity.description}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDateTime(activity.occurred_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            Nenhuma atividade recente encontrada para o recorte selecionado.
          </p>
        )}
      </div>
    </Card>
  );
}
