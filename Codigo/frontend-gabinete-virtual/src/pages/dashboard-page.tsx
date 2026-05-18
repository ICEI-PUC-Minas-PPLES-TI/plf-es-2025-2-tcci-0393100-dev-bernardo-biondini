import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DonutChart } from "../components/dashboard/donut-chart";
import { HorizontalBarChart } from "../components/dashboard/horizontal-bar-chart";
import { LogoutButton } from "../components/app/logout-button";
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

interface QuickAction {
  label: string;
  description: string;
  to: string;
  permission: string;
}

interface MetricCard {
  label: string;
  value: string;
  detail: string;
  accentClassName: string;
  badge: string;
}

interface DashboardFiltersState {
  region: string;
  cityId: string;
}

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

  const quickActions = useMemo<QuickAction[]>(() => {
    if (!user) {
      return [];
    }

    const actions: QuickAction[] = [
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

  const summaryCards = useMemo<MetricCard[]>(() => {
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
            <button
              type="button"
              onClick={() => {
                void loadDashboard(filters, "initial");
              }}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              Tentar novamente
            </button>
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      {error ? (
        <section className="rounded-[28px] border border-danger/20 bg-danger/8 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Dashboard analítico
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Informacoes consolidadas para antecipar prioridades por cidade e regiao.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted">
            O painel agora concentra indicadores geográficos, distribuição de
            demandas por área atendida e um recorte rápido da agenda e das emendas
            para apoiar visitas, reuniões e prestação de contas.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-border bg-background/65 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Recorte atual
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {dashboard.scope.label}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {dashboard.scope.description}
              </p>
            </div>

            <div className="rounded-[28px] border border-border bg-background/65 p-5">
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
            </div>
          </div>
        </div>

        <section className="card-surface rounded-[32px] p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                Filtros geograficos
              </p>
              <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
                Monte o recorte da visita
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">
                Filtre por região e cidade para ver demandas, emendas, agenda e
                instituições associadas ao território analisado.
              </p>
            </div>
            <LogoutButton />
          </div>

          <form className="mt-8 grid gap-4" onSubmit={handleApplyFilters}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Regiao</span>
              <select
                value={filters.region}
                onChange={(event) =>
                  setFilters((current) => {
                    const nextRegion = event.target.value;
                    const selectedCityStillValid = dashboard.options.cities.some(
                      (city) =>
                        String(city.id) === current.cityId &&
                        (nextRegion === "" || city.region === nextRegion),
                    );

                    return {
                      region: nextRegion,
                      cityId: selectedCityStillValid ? current.cityId : "",
                    };
                  })
                }
              >
                <option value="">Todas as regioes</option>
                {dashboard.options.regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Cidade</span>
              <select
                value={filters.cityId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    cityId: event.target.value,
                  }))
                }
              >
                <option value="">Todas as cidades</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.region})
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isRefreshing}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRefreshing ? "Atualizando..." : "Aplicar recorte"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleClearFilters();
                }}
                disabled={isRefreshing}
                className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                Limpar
              </button>
            </div>
          </form>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="card-surface rounded-[28px] px-6 py-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {card.value}
                </p>
              </div>
              <span
                className={`inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xs font-bold tracking-[0.18em] uppercase ${card.accentClassName}`}
              >
                {card.badge}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">{card.detail}</p>
          </article>
        ))}
      </section>

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
        <article className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Atividades recentes
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Ultimas movimentacoes relevantes do gabinete
          </h3>
          <div className="mt-8 grid gap-4">
            {dashboard.recent_activities.length > 0 ? (
              dashboard.recent_activities.map((activity) => (
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
        </article>

        <div className="grid gap-6">
          <section className="card-surface rounded-[32px] p-8">
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
          </section>

          <section className="card-surface rounded-[32px] p-8">
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
          </section>
        </div>
      </section>
    </main>
  );
}
