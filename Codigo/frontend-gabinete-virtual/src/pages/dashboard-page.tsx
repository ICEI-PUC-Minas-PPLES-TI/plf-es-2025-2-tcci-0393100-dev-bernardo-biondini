import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  DashboardGeographicFilters,
  type DashboardFiltersState,
} from "../components/domains/dashboard/dashboard-geographic-filters";
import {
  DashboardOverviewHero,
} from "../components/domains/dashboard/dashboard-overview-hero";
import {
  DashboardQuickActions,
  type DashboardQuickAction,
} from "../components/domains/dashboard/dashboard-quick-actions";
import {
  DashboardRecentActivities,
} from "../components/domains/dashboard/dashboard-recent-activities";
import {
  DashboardSummaryCards,
  type DashboardSummaryCardItem,
} from "../components/domains/dashboard/dashboard-summary-cards";
import { DonutChart } from "../components/dashboard/donut-chart";
import { HorizontalBarChart } from "../components/dashboard/horizontal-bar-chart";
import { LogoutButton } from "../components/app/logout-button";
import { Alert, Button, Card } from "../components/core";
import {
  clearStoredToken,
  getAuthenticatedUserByToken,
  getStoredToken,
} from "../lib/auth";
import { getDashboardOverview, toApiError } from "../lib/dashboard-api";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import type { AuthUserType } from "../types/auth";
import type {
  DashboardActivityType,
  DashboardAmountChartDatumType,
  DashboardChartDatumType,
  DashboardOverviewType,
} from "../types/dashboard/dashboard-overview-type";

const EMPTY_FILTERS: DashboardFiltersState = {
  region: "",
  cityId: "",
};

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatRelativeTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const diffInMilliseconds = parsed.getTime() - Date.now();
  const diffInMinutes = Math.round(diffInMilliseconds / 60000);
  const relativeTime = new Intl.RelativeTimeFormat("pt-BR", {
    numeric: "auto",
  });

  if (Math.abs(diffInMinutes) < 60) {
    return relativeTime.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return relativeTime.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);

  return relativeTime.format(diffInDays, "day");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function activityAccentClassName(type: DashboardActivityType): string {
  const accents: Record<DashboardActivityType, string> = {
    demand: "bg-[rgba(59,130,246,0.12)] text-[rgb(30,64,175)]",
    project_law: "bg-[rgba(34,197,94,0.12)] text-[rgb(22,101,52)]",
    amendment: "bg-[rgba(245,158,11,0.16)] text-[rgb(180,83,9)]",
    event: "bg-[rgba(168,85,247,0.14)] text-[rgb(107,33,168)]",
  };

  return accents[type];
}

function activityBadge(type: DashboardActivityType): string {
  const badges: Record<DashboardActivityType, string> = {
    demand: "DM",
    project_law: "PL",
    amendment: "EM",
    event: "AG",
  };

  return badges[type];
}

function formatPermissionLabel(permission: string): string {
  return permission.replaceAll(".", " · ");
}

export function DashboardPage() {
  const [user, setUser] = useState<AuthUserType | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverviewType | null>(null);
  const [filters, setFilters] = useState<DashboardFiltersState>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInvalidSession, setHasInvalidSession] = useState(!getStoredToken());
  const [error, setError] = useState<string | null>(null);

  const quickActions = useMemo<DashboardQuickAction[]>(() => {
    if (!user) {
      return [];
    }

    const actions: DashboardQuickAction[] = [
      {
        label: "Abrir nova demanda",
        description: "Registrar solicitações e classificar rapidamente a área atendida.",
        to: "/painel/demandas",
        permission: PERMISSION_CODES.DEMANDS_MANAGE,
      },
      {
        label: "Cadastrar evento",
        description: "Adicionar compromissos e conferir conflitos da agenda da visita.",
        to: "/painel/agenda",
        permission: PERMISSION_CODES.AGENDA_MANAGE,
      },
      {
        label: "Consultar emendas",
        description: "Conferir quantidade e volume financeiro das emendas por município.",
        to: "/painel/emendas",
        permission: PERMISSION_CODES.AMENDMENTS_MANAGE,
      },
      {
        label: "Cadastrar projeto de lei",
        description: "Atualizar o panorama legislativo monitorado pelo gabinete.",
        to: "/painel/projetos-de-lei",
        permission: PERMISSION_CODES.PROJECT_LAWS_MANAGE,
      },
      {
        label: "Atualizar conteúdo do site",
        description: "Publicar notícias e destacar ações que reforçam a agenda política.",
        to: "/painel/cms",
        permission: PERMISSION_CODES.CMS_MANAGE,
      },
      {
        label: "Gerenciar usuários",
        description: "Verificar perfis internos e manter a operação autorizada.",
        to: "/painel/usuarios",
        permission: PERMISSION_CODES.USERS_VIEW,
      },
    ];

    return actions.filter((action) =>
      hasPermission(user.permissions, action.permission),
    );
  }, [user]);

  const filteredCities = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    if (!filters.region) {
      return dashboard.options.cities;
    }

    return dashboard.options.cities.filter(
      (city) => city.region === filters.region,
    );
  }, [dashboard, filters.region]);

  const summaryCards = useMemo<DashboardSummaryCardItem[]>(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: "Demandas ativas",
        value: String(dashboard.summary.active_demands),
        detail: "Solicitações abertas, em análise ou em andamento no recorte atual.",
        accentClassName: "bg-[rgba(59,130,246,0.12)] text-[rgb(30,64,175)]",
        badge: "DM",
      },
      {
        label: "Demandas concluídas",
        value: String(dashboard.summary.completed_demands),
        detail: "Demandas já atendidas no município ou região selecionada.",
        accentClassName: "bg-[rgba(16,185,129,0.14)] text-[rgb(6,95,70)]",
        badge: "OK",
      },
      {
        label: "Taxa de resolução",
        value: `${dashboard.summary.resolution_rate}%`,
        detail: "Percentual de demandas concluídas sobre o total classificado.",
        accentClassName: "bg-[rgba(5,150,105,0.14)] text-[rgb(4,120,87)]",
        badge: "TX",
      },
      {
        label: "Emendas no recorte",
        value: String(dashboard.summary.amendments),
        detail: "Quantidade de emendas vinculadas às cidades filtradas.",
        accentClassName: "bg-[rgba(245,158,11,0.16)] text-[rgb(180,83,9)]",
        badge: "EM",
      },
      {
        label: "Valor das emendas",
        value: formatCurrency(dashboard.summary.amendment_amount_total),
        detail: "Montante consolidado das emendas ligadas ao recorte atual.",
        accentClassName: "bg-[rgba(234,179,8,0.18)] text-[rgb(161,98,7)]",
        badge: "R$",
      },
      {
        label: "Eventos deste mês",
        value: String(dashboard.summary.events_this_month),
        detail: "Compromissos previstos no mês corrente para a agenda analisada.",
        accentClassName: "bg-[rgba(168,85,247,0.14)] text-[rgb(107,33,168)]",
        badge: "AG",
      },
      {
        label: "Instituições relacionadas",
        value: String(dashboard.summary.institutions),
        detail: "Base institucional cadastrada para apoiar visitas e interlocução.",
        accentClassName: "bg-[rgba(99,102,241,0.12)] text-[rgb(55,48,163)]",
        badge: "IN",
      },
      {
        label: "PLs monitorados",
        value: String(dashboard.summary.project_laws_total),
        detail: "Indicador estadual, mantido para dar contexto legislativo geral.",
        accentClassName: "bg-[rgba(34,197,94,0.12)] text-[rgb(22,101,52)]",
        badge: "PL",
      },
    ];
  }, [dashboard]);

  const amendmentAmountBars = useMemo<DashboardAmountChartDatumType[]>(() => {
    if (!dashboard) {
      return [];
    }

    return dashboard.charts.amendments_by_city.map((item) => ({
      ...item,
      value: item.amount_total,
    }));
  }, [dashboard]);

  async function loadDashboard(
    nextFilters: DashboardFiltersState,
    mode: "initial" | "refresh" = "initial",
  ) {
    const token = getStoredToken();

    if (!token) {
      setHasInvalidSession(true);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const authenticatedUser = await getAuthenticatedUserByToken(token);

      if (!authenticatedUser) {
        clearStoredToken();
        setHasInvalidSession(true);
        setDashboard(null);
        return;
      }

      setUser(authenticatedUser);

      const overview = await getDashboardOverview({
        cityId: nextFilters.cityId ? Number(nextFilters.cityId) : null,
        region: nextFilters.region || null,
      });

      setDashboard(overview);
      setFilters({
        region: overview.filters.region ?? "",
        cityId: overview.filters.city_id ? String(overview.filters.city_id) : "",
      });
    } catch (requestError) {
      setError(
        toApiError(
          requestError,
          "Nao foi possivel carregar os dados consolidados do dashboard.",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard(EMPTY_FILTERS, "initial");
  }, []);

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadDashboard(filters, "refresh");
  }

  async function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    await loadDashboard(EMPTY_FILTERS, "refresh");
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando painel...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (!dashboard && error) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Dashboard analítico
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Nao foi possivel carregar a visao consolidada do gabinete.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                void loadDashboard(filters, "initial");
              }}
            >
              Tentar novamente
            </Button>
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <main className="grid gap-6">
      {error ? (
        <Alert tone="danger">
          {error}
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardOverviewHero
          dashboard={dashboard}
          user={user}
          formatDateTime={formatDateTime}
        />

        <DashboardGeographicFilters
          dashboard={dashboard}
          filters={filters}
          filteredCities={filteredCities}
          isRefreshing={isRefreshing}
          onChangeFilters={setFilters}
          onSubmit={handleApplyFilters}
          onClear={handleClearFilters}
        />
      </section>

      <DashboardSummaryCards cards={summaryCards} />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Demandas por area atendida
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Onde o gabinete concentrou os atendimentos
          </h3>
          <div className="mt-8">
            <DonutChart
              data={dashboard.charts.demands_by_service_area}
              emptyMessage="Ainda nao existem demandas classificadas para o recorte selecionado."
            />
          </div>
        </article>

        <article className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Demandas por status
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Ritmo de execucao no recorte filtrado
          </h3>
          <div className="mt-8">
            <DonutChart
              data={dashboard.charts.demands_by_status}
              emptyMessage="Nao ha demandas no recorte geográfico selecionado."
            />
          </div>
        </article>

        <article className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Demandas por cidade
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Concentre a visita nas cidades com maior volume
          </h3>
          <div className="mt-8">
            <HorizontalBarChart<DashboardChartDatumType>
              data={dashboard.charts.demands_by_city}
              emptyMessage="Nao ha demandas distribuídas por cidade para este recorte."
            />
          </div>
        </article>

        <article className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Emendas por cidade
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Compare volume financeiro e capilaridade territorial
          </h3>
          <div className="mt-8">
            <HorizontalBarChart<DashboardAmountChartDatumType>
              data={amendmentAmountBars}
              emptyMessage="Nao existem emendas associadas ao recorte selecionado."
              valueFormatter={(value) => formatCurrency(value)}
              metaRenderer={(item) =>
                `Quantidade de emendas: ${
                  dashboard.charts.amendments_by_city.find(
                    (chartItem) => chartItem.key === item.key,
                  )?.value ?? 0
                }`
              }
            />
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardRecentActivities
          activities={dashboard.recent_activities}
          activityAccentClassName={activityAccentClassName}
          activityBadge={activityBadge}
          formatRelativeTime={formatRelativeTime}
          formatDateTime={formatDateTime}
        />

        <div className="grid gap-6">
          <DashboardQuickActions quickActions={quickActions} />

          <Card padding="lg">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Permissoes ativas
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user.permissions.length > 0 ? (
                user.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-primary-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-strong"
                  >
                    {formatPermissionLabel(permission)}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  Nenhuma permissao associada ao perfil atual.
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
