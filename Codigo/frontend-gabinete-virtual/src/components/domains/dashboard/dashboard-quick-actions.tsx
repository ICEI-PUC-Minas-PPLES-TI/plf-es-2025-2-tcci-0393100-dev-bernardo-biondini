import { Link } from "react-router-dom";
import type { PermissionCode } from "../../../lib/permission-codes";
import { Card } from "../../core";

export interface DashboardQuickAction {
  label: string;
  description: string;
  to: string;
  permission: PermissionCode;
}

interface DashboardQuickActionsProps {
  quickActions: DashboardQuickAction[];
}

export function DashboardQuickActions({
  quickActions,
}: DashboardQuickActionsProps) {
  return (
    <Card padding="lg">
      <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
        Acesso rapido
      </p>
      <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
        Acoes mais usadas pela equipe
      </h3>
      <div className="mt-8 grid gap-3">
        {quickActions.length > 0 ? (
          quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="rounded-[24px] border border-border bg-surface-strong px-5 py-4 transition hover:bg-background-strong"
            >
              <p className="text-sm font-semibold text-foreground">
                {action.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {action.description}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            O perfil atual nao possui atalhos operacionais disponiveis.
          </p>
        )}
      </div>
    </Card>
  );
}
