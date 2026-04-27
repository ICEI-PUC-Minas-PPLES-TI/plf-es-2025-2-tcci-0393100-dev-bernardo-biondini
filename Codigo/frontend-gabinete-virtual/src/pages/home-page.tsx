import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPublicCmsOverview,
  listPublicNews,
  listPublicSiteProjects,
} from "../lib/cms-api";
import type { CmsPublicOverviewType } from "../types/cms/cms-public-overview-type";
import type { CmsSectionKeyType } from "../types/cms/cms-section-type";
import type { NewsType } from "../types/news/news-type";
import type {
  SiteProjectStatusType,
  SiteProjectType,
} from "../types/site-project/site-project-type";

function truncateText(value: string, maxLength = 180): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

function formatStatus(status: SiteProjectStatusType): string {
  const labels: Record<SiteProjectStatusType, string> = {
    planned: "Planejamento",
    in_progress: "Em andamento",
    completed: "Concluido",
  };

  return labels[status];
}

function splitContent(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((part) => part.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSectionMap(
  overview: CmsPublicOverviewType,
): Partial<Record<CmsSectionKeyType, string>> {
  return overview.sections.reduce<Partial<Record<CmsSectionKeyType, string>>>(
    (map, section) => {
      map[section.key] = section.content;
      return map;
    },
    {},
  );
}

export function HomePage() {
  const [overview, setOverview] = useState<CmsPublicOverviewType>({
    sections: [],
    news: [],
    site_projects: [],
  });
  const [newsItems, setNewsItems] = useState<NewsType[]>([]);
  const [siteProjects, setSiteProjects] = useState<SiteProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPublicPage() {
      try {
        const [overviewResponse, newsResponse, siteProjectsResponse] =
          await Promise.all([
            getPublicCmsOverview(),
            listPublicNews(1, 6),
            listPublicSiteProjects(1, 6),
          ]);

        setOverview(overviewResponse);
        setNewsItems(newsResponse.data);
        setSiteProjects(siteProjectsResponse.data);
      } finally {
        setIsLoading(false);
      }
    }

    loadPublicPage();
  }, []);

  const sectionMap = buildSectionMap(overview);
  const sectionValue = (key: CmsSectionKeyType, fallback: string) =>
    sectionMap[key]?.trim() || fallback;

  const deputyName = sectionValue("deputy_name", "Chiara Biondini");
  const deputyRole = sectionValue(
    "deputy_role",
    "Deputada estadual por Minas Gerais",
  );
  const heroTitle = sectionValue(
    "hero_title",
    "Fiscalização firme, presença nos municípios e compromisso com resultados.",
  );
  const heroSummary = sectionValue(
    "hero_summary",
    "Uma atuação política construída com escuta ativa, articulação institucional e acompanhamento constante das demandas que chegam ao gabinete.",
  );
  const heroImageUrl = sectionValue("hero_image_url", "");
  const heroImageAlt = sectionValue(
    "hero_image_alt",
    "Retrato institucional da deputada",
  );
  const biography = sectionValue(
    "biography",
    "Atuacao publica marcada por proximidade com a populacao, defesa de pautas prioritarias e presenca constante nos municipios mineiros.",
  );
  const mission = sectionValue(
    "mission",
    "Atuar com transparência, presença territorial e compromisso com as prioridades da população mineira.",
  );
  const trajectory = sectionValue(
    "trajectory",
    "Uma trajetoria construida com escuta, fiscalizacao e acompanhamento direto das demandas que chegam ao gabinete.",
  );
  const quote = sectionValue(
    "quote",
    "Política boa é política que se traduz em presença, clareza e resultado.",
  );
  const priorities = splitContent(
    sectionValue(
      "priorities",
      "Educação\nTransparência\nDesenvolvimento regional",
    ),
  );

  const displayProjects =
    siteProjects.length > 0 ? siteProjects : overview.site_projects;
  const displayNews = newsItems.length > 0 ? newsItems : overview.news;
  const featuredProject = displayProjects[0] ?? null;
  const featuredNews = displayNews[0] ?? null;
  const projectGrid = displayProjects.slice(1, 5);
  const newsGrid = displayNews.slice(featuredNews ? 1 : 0, featuredNews ? 5 : 4);
  const coveredCitiesCount = new Set(
    displayProjects.map((siteProject) => siteProject.city.name),
  ).size;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f0e3_0%,#f2e8d8_52%,#efe7db_100%)] text-foreground">
      <header className="sticky top-0 z-30 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/55 bg-[rgba(255,252,246,0.8)] px-5 py-3 shadow-[0_18px_45px_rgba(35,47,39,0.08)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
              {deputyName}
            </p>
            <p className="mt-1 text-xs text-muted">{deputyRole}</p>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
            <a href="#conheca" className="transition hover:text-foreground">
              Conheça
            </a>
            <a href="#prioridades" className="transition hover:text-foreground">
              Prioridades
            </a>
            <a href="#projetos" className="transition hover:text-foreground">
              Projetos
            </a>
            <a href="#noticias" className="transition hover:text-foreground">
              Notícias
            </a>
          </nav>

          <Link
            to="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong"
          >
            Entrar no painel
          </Link>
        </div>
      </header>

      <div className="px-6 pb-16 md:px-10">
        <section className="mx-auto grid max-w-7xl gap-8 pt-4 lg:grid-cols-[1.04fr_0.96fr] lg:pt-10">
          <article className="relative overflow-hidden rounded-[42px] bg-[linear-gradient(135deg,#173f35_0%,#265847_42%,#c5964c_145%)] px-8 py-10 text-white shadow-[0_30px_90px_rgba(25,50,40,0.28)] md:px-12 md:py-14">
            <div className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,228,165,0.5)_0%,rgba(255,228,165,0)_68%)]" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.28em] uppercase text-white/84">
                Conheça {deputyName}
              </span>
              <h1 className="section-title mt-6 max-w-4xl text-5xl leading-[0.95] font-semibold md:text-7xl">
                {heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
                {heroSummary}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#projetos"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary-strong transition hover:bg-white/92"
                >
                  Ver projetos em destaque
                </a>
                <a
                  href="#noticias"
                  className="rounded-full border border-white/22 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  Ler notícias recentes
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-white/12 bg-white/10 p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/64">
                    Prioridades
                  </p>
                  <p className="mt-4 text-3xl font-semibold">{priorities.length}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Frentes que orientam a atuacao parlamentar.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/12 bg-white/10 p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/64">
                    Projetos
                  </p>
                  <p className="mt-4 text-3xl font-semibold">
                    {displayProjects.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Iniciativas publicadas no site institucional.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/12 bg-white/10 p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/64">
                    Municipios
                  </p>
                  <p className="mt-4 text-3xl font-semibold">
                    {isLoading ? "..." : coveredCitiesCount}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Cidades com projetos acompanhados pelo gabinete.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside className="grid gap-6">
            <article className="overflow-hidden rounded-[40px] border border-[rgba(57,72,62,0.12)] bg-[rgba(255,252,247,0.95)] shadow-[0_24px_60px_rgba(36,43,40,0.12)]">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  className="h-[430px] w-full object-cover"
                />
              ) : featuredProject?.cover_image_url ? (
                <img
                  src={featuredProject.cover_image_url}
                  alt={featuredProject.title}
                  className="h-[430px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[430px] items-end bg-[linear-gradient(145deg,#234f43_0%,#3d7862_60%,#ddc187_120%)] p-8">
                  <div className="max-w-xs rounded-[30px] border border-white/18 bg-white/10 p-5 text-white backdrop-blur-sm">
                    <p className="text-xs font-semibold tracking-[0.22em] uppercase text-white/72">
                      Imagem principal
                    </p>
                    <p className="mt-3 text-3xl font-semibold">{deputyName}</p>
                    <p className="mt-2 text-sm leading-7 text-white/78">
                      Espaco reservado para a imagem institucional da deputada.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-6">
                <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary">
                  Perfil institucional
                </p>
                <h2 className="section-title mt-3 text-3xl font-semibold text-foreground">
                  {deputyName}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {deputyRole}
                </p>
                <p className="mt-5 text-sm leading-7 text-muted">
                  {truncateText(biography, 210)}
                </p>
              </div>
            </article>

            <article className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[30px] border border-border bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_18px_45px_rgba(32,44,37,0.08)]">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                  Missão
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {truncateText(mission, 180)}
                </p>
              </div>

              <div className="rounded-[30px] border border-border bg-primary p-5 text-white shadow-[0_18px_48px_rgba(30,59,47,0.18)]">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/70">
                  Citação
                </p>
                <p className="mt-3 text-sm leading-7 text-white/82">“{quote}”</p>
              </div>
            </article>
          </aside>
        </section>

        <section
          id="conheca"
          className="mx-auto grid max-w-7xl gap-6 pt-10 lg:grid-cols-[1.02fr_0.98fr]"
        >
          <article className="card-surface rounded-[38px] p-8 md:p-10">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Conheça
            </p>
            <h2 className="section-title mt-4 text-4xl leading-tight font-semibold text-foreground md:text-5xl">
              Uma trajetoria politica apresentada com clareza, proximidade e compromisso com resultado.
            </h2>
            <div className="mt-6 space-y-5 text-sm leading-8 text-muted md:text-base">
              <p>{biography}</p>
              <p>{trajectory}</p>
            </div>
          </article>

          <article
            id="prioridades"
            className="card-surface rounded-[38px] p-8 md:p-10"
          >
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Prioridades do mandato
            </p>
            <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
              Pautas que orientam a atuacao da deputada no mandato e no relacionamento com os municipios.
            </h3>

            <div className="mt-8 flex flex-wrap gap-3">
              {priorities.length > 0 ? (
                priorities.map((priority) => (
                  <span
                    key={priority}
                    className="rounded-full bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-strong"
                  >
                    {priority}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  As pautas prioritarias serao exibidas aqui em breve.
                </p>
              )}
            </div>
          </article>
        </section>

        <section
          id="projetos"
          className="mx-auto grid max-w-7xl gap-6 pt-10 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <article className="card-surface rounded-[38px] p-8 md:p-10">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Projetos em destaque
            </p>
            <h2 className="section-title mt-4 text-4xl leading-tight font-semibold text-foreground md:text-5xl">
              Projetos e iniciativas que traduzem o mandato em entregas concretas para a populacao.
            </h2>

            {featuredProject ? (
              <article className="mt-8 overflow-hidden rounded-[34px] border border-border bg-surface-strong">
                {featuredProject.cover_image_url ? (
                  <img
                    src={featuredProject.cover_image_url}
                    alt={featuredProject.title}
                    className="h-72 w-full object-cover"
                  />
                ) : (
                  <div className="h-72 bg-[linear-gradient(145deg,#d8c39f_0%,#eddcb8_38%,#2d6653_110%)]" />
                )}
                <div className="grid gap-5 p-7 md:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                      {featuredProject.city.name}
                    </p>
                    <h3 className="section-title mt-3 text-3xl font-semibold text-foreground">
                      {featuredProject.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-muted">
                      {featuredProject.description}
                    </p>
                  </div>

                  <div className="rounded-[28px] bg-background-strong p-5">
                    <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                      Status
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">
                      {formatStatus(featuredProject.status)}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-muted">
                      Iniciativa acompanhada pelo gabinete, com foco em execucao, visibilidade publica e prestacao de contas.
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="mt-8 rounded-[34px] border border-dashed border-border bg-surface p-8 text-sm leading-7 text-muted">
                Nenhum projeto em destaque foi publicado no momento.
              </div>
            )}
          </article>

          <article className="grid gap-5">
            {projectGrid.length > 0 ? (
              projectGrid.map((siteProject) => (
                <article
                  key={siteProject.id}
                  className="card-surface rounded-[32px] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                        {siteProject.city.name}
                      </p>
                      <h3 className="section-title mt-3 text-2xl font-semibold text-foreground">
                        {siteProject.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                      {formatStatus(siteProject.status)}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-muted">
                    {truncateText(siteProject.description, 160)}
                  </p>
                </article>
              ))
            ) : (
              <article className="card-surface rounded-[32px] p-6 text-sm leading-7 text-muted">
                Novas iniciativas serao exibidas aqui assim que forem publicadas no portal.
              </article>
            )}
          </article>
        </section>

        <section
          id="noticias"
          className="mx-auto max-w-7xl pt-10"
        >
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <article className="card-surface rounded-[38px] p-8 md:p-10">
              <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                Notícias
              </p>
              <h2 className="section-title mt-4 text-4xl leading-tight font-semibold text-foreground md:text-5xl">
                Ultimas noticias, posicionamentos e entregas do gabinete.
              </h2>
              <p className="mt-6 text-sm leading-8 text-muted">
                Acompanhe atualizacoes recentes, comunicados e conteudos que reforcam a presenca publica do mandato.
              </p>
              <div className="mt-8 rounded-[30px] bg-primary px-6 py-7 text-white">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/70">
                  Missao do mandato
                </p>
                <p className="mt-4 text-sm leading-7 text-white/82">
                  {mission}
                </p>
              </div>
            </article>

            <div className="grid gap-5 md:grid-cols-2">
              {featuredNews ? (
                <article className="card-surface rounded-[32px] p-5 md:col-span-2">
                  {featuredNews.image_url ? (
                    <img
                      src={featuredNews.image_url}
                      alt={featuredNews.title}
                      className="h-64 w-full rounded-[24px] object-cover"
                    />
                  ) : null}
                  <div className={featuredNews.image_url ? "mt-4" : undefined}>
                    <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                      Publicado em {formatDate(featuredNews.published_at)}
                    </p>
                    <h3 className="section-title mt-3 text-3xl font-semibold text-foreground">
                      {featuredNews.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted">
                      Por {featuredNews.author.name}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-muted">
                      {truncateText(featuredNews.content, 280)}
                    </p>
                  </div>
                </article>
              ) : null}

              {newsGrid.length > 0 ? (
                newsGrid.map((news) => (
                  <article
                    key={news.id}
                    className="card-surface rounded-[32px] p-5"
                  >
                    {news.image_url ? (
                      <img
                        src={news.image_url}
                        alt={news.title}
                        className="h-44 w-full rounded-[24px] object-cover"
                      />
                    ) : null}
                    <div className={news.image_url ? "mt-4" : undefined}>
                      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                        {formatDate(news.published_at)}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold text-foreground">
                        {news.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted">
                        Por {news.author.name}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-muted">
                        {truncateText(news.content, 150)}
                      </p>
                    </div>
                  </article>
                ))
              ) : !featuredNews ? (
                <article className="card-surface rounded-[32px] p-8 text-sm leading-7 text-muted md:col-span-2">
                  Nenhuma notícia publicada no momento.
                </article>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl pt-10">
          <div className="overflow-hidden rounded-[42px] bg-[linear-gradient(135deg,#214535_0%,#2e6a55_56%,#d8af67_138%)] px-8 py-10 text-white shadow-[0_28px_80px_rgba(24,41,34,0.22)] md:px-12 md:py-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.22em] uppercase text-white/70">
                  Acompanhe o mandato
                </p>
                <h2 className="section-title mt-4 text-4xl leading-tight font-semibold md:text-6xl">
                  Presenca nos municipios, acompanhamento das pautas e comunicacao direta com a populacao.
                </h2>
                <p className="mt-5 text-sm leading-8 text-white/82 md:text-base">
                  "{quote}"
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#conheca"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary-strong transition hover:bg-white/92"
                >
                  Conhecer a trajetoria
                </a>
                <a
                  href="#projetos"
                  className="rounded-full border border-white/22 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  Ver projetos
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
