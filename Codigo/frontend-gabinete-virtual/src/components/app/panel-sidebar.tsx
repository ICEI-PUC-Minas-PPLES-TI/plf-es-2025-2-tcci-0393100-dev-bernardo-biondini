import { Link, NavLink } from "react-router-dom";
import { Badge, Button, Card } from "../core";
import { cx } from "../core/utils";

export interface PanelSidebarItem {
  to: string;
  label: string;
  end?: boolean;
}

interface PanelSidebarProps {
  items: PanelSidebarItem[];
  pendingAlertsCount: number;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

function getItemShortLabel(label: string): string {
  return label
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PanelSidebarLink({
  to,
  label,
  end = false,
  onNavigate,
}: PanelSidebarItem & {
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isActive
            ? "border border-primary-200 bg-primary-50 text-primary-900 shadow-sm"
            : "border border-border bg-surface-strong text-muted hover:bg-background-strong hover:text-primary-700"
        }`
      }
      aria-label={label}
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-200 text-[11px] font-bold tracking-[0.08em] text-primary-900 group-hover:bg-primary-200">
          {getItemShortLabel(label)}
        </span>

        <span>{label}</span>
      </span>
    </NavLink>
  );
}

export function PanelSidebar({
  items,
  pendingAlertsCount,
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: PanelSidebarProps) {
  return (
    <>
      {isCollapsed ? (
        <Button
          type="button"
          tone="neutral"
          variant="outline"
          size="sm"
          className="fixed left-4 top-4 z-[60] hidden lg:inline-flex"
          onClick={onToggleCollapse}
          aria-label="Expandir menu"
          title="Expandir menu"
        >
          Abrir menu
        </Button>
      ) : null}

      <div
        className={cx(
          "fixed inset-0 z-40 bg-primary-900/32 transition lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
      />

      <div
        className={cx(
          "fixed left-0 top-0 z-50 h-screen w-[84vw] max-w-[320px] transition-transform duration-200 lg:h-screen lg:w-[280px] lg:max-w-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-[105%]",
          isCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0",
        )}
      >
        <Card className="flex h-full flex-col p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <Link
                to="/painel"
                onClick={onCloseMobile}
                className="text-sm font-semibold tracking-[0.22em] uppercase text-primary"
              >
                Gabinete Virtual
              </Link>

              <h1 className="section-title text-3xl font-semibold text-foreground">
                Painel interno
              </h1>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                tone="neutral"
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={onCloseMobile}
                aria-label="Fechar menu"
              >
                Fechar
              </Button>

              <Button
                type="button"
                tone="neutral"
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex"
                onClick={onToggleCollapse}
                aria-label="Recolher menu"
                title="Recolher menu"
              >
                Recolher
              </Button>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {items.map((item) => (
              <PanelSidebarLink
                key={item.to}
                {...item}
                onNavigate={onCloseMobile}
              />
            ))}
          </nav>

          {pendingAlertsCount > 0 ? (
            <div className="mt-8 rounded-[28px] bg-primary px-5 py-6 text-white">
              <Badge tone="primary" className="mt-3 bg-white/16 text-white">
                {pendingAlertsCount} alerta
                {pendingAlertsCount > 1 ? "s" : ""} pendente
                {pendingAlertsCount > 1 ? "s" : ""}
              </Badge>
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
