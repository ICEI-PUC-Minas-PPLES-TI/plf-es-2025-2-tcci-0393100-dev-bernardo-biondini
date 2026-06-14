import type { AuthUserType } from "../../../types/auth";
import type { DashboardOverviewType } from "../../../types/dashboard/dashboard-overview-type";
import { Card } from "../../core";

interface DashboardOverviewHeroProps {
  dashboard: DashboardOverviewType;
  user: AuthUserType;
  formatDateTime: (value: string) => string;
}

export function DashboardOverviewHero({
  dashboard,
  user,
  formatDateTime,
}: DashboardOverviewHeroProps) {
  return (
    <div className="card-surface rounded-[32px] p-8">
      <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
        Dashboard analítico
      </p>
      <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
        Informacoes consolidadas para antecipar prioridades por cidade e regiao.
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card elevated={false} className="bg-background/65 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Recorte atual
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {dashboard.scope.label}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            {dashboard.scope.description}
          </p>
        </Card>

        <Card elevated={false} className="bg-background/65 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Perfil atual
          </p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {user.access_profile?.name ?? "Sem perfil"}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            {user.access_profile?.description ??
              "Nenhuma descricao disponivel para este perfil."}
          </p>
          <p className="mt-4 text-xs tracking-[0.18em] uppercase text-muted">
            Atualizado em {formatDateTime(dashboard.generated_at)}
          </p>
        </Card>
      </div>
    </div>
  );
}
