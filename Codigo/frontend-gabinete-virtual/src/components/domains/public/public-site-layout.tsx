import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  getPublicCmsOverview,
  listPublicNews,
  listPublicSiteProjects,
} from "../../../lib/cms-api";
import type { CmsPublicOverviewType } from "../../../types/cms/cms-public-overview-type";
import type { CmsSectionKeyType } from "../../../types/cms/cms-section-type";
import type { NewsType } from "../../../types/news/news-type";
import type {
  SiteProjectStatusType,
  SiteProjectType,
} from "../../../types/site-project/site-project-type";

interface PublicSiteContextValue {
  isLoading: boolean;
  deputyName: string;
  deputyRole: string;
  heroTitle: string;
  heroSummary: string;
  heroImageUrl: string;
  heroImageAlt: string;
  biography: string;
  mission: string;
  trajectory: string;
  quote: string;
  priorities: string[];
  newsItems: NewsType[];
  siteProjects: SiteProjectType[];
  coveredCitiesCount: number;
  formatDate: (value: string) => string;
  formatProjectStatus: (status: SiteProjectStatusType) => string;
  truncateText: (value: string, maxLength?: number) => string;
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

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

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatProjectStatus(status: SiteProjectStatusType): string {
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

function PublicSiteFrame({
  children,
  deputyName,
  deputyRole,
}: {
  children: ReactNode;
  deputyName: string;
  deputyRole: string;
}) {
  const navItemClassName = ({ isActive }: { isActive: boolean }) =>
    [
      "border-b-2 pb-2 text-sm font-semibold tracking-[0.08em] uppercase transition",
      isActive
        ? "border-primary text-primary-strong"
        : "border-transparent text-muted hover:border-primary-200 hover:text-foreground",
    ].join(" ");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f1ea_0%,#f8f6f1_36%,#f3f5f8_100%)] text-foreground">
      <header className="border-b border-[rgba(24,35,61,0.12)] bg-[rgba(248,246,241,0.94)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 md:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-primary">
              Assembleia Legislativa de Minas Gerais
            </p>
            <Link to="/" className="mt-2 block font-serif text-3xl text-primary-strong">
              {deputyName}
            </Link>
            <p className="mt-1 text-sm text-muted">{deputyRole}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-5">
            <NavLink to="/" end className={navItemClassName}>
              Inicio
            </NavLink>
            <NavLink to="/conheca" className={navItemClassName}>
              Biografia
            </NavLink>
            <NavLink to="/atuacao" className={navItemClassName}>
              Atuacao
            </NavLink>
            <NavLink to="/projetos" className={navItemClassName}>
              Projetos
            </NavLink>
            <NavLink to="/noticias" className={navItemClassName}>
              Noticias
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-primary-200 px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase text-primary-strong transition hover:border-primary hover:bg-primary-50"
            >
              Acesso do gabinete
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-[rgba(24,35,61,0.12)] bg-[rgba(248,246,241,0.96)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
              {deputyName}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
              Informacoes institucionais, noticias e projetos acompanhados pelo
              gabinete parlamentar da deputada estadual.
            </p>
          </div>

          <div className="grid gap-2 text-sm leading-7 text-muted">
            <p className="font-semibold text-foreground">Navegacao publica</p>
            <Link to="/conheca" className="hover:text-foreground">
              Biografia
            </Link>
            <Link to="/atuacao" className="hover:text-foreground">
              Atuacao
            </Link>
            <Link to="/projetos" className="hover:text-foreground">
              Projetos
            </Link>
            <Link to="/noticias" className="hover:text-foreground">
              Noticias
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PublicSiteLayout() {
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
            listPublicNews(1, 12),
            listPublicSiteProjects(1, 12),
          ]);

        setOverview(overviewResponse);
        setNewsItems(newsResponse.data);
        setSiteProjects(siteProjectsResponse.data);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPublicPage();
  }, []);

  const value = useMemo<PublicSiteContextValue>(() => {
    const sectionMap = buildSectionMap(overview);
    const sectionValue = (key: CmsSectionKeyType, fallback: string) =>
      sectionMap[key]?.trim() || fallback;
    const projects = siteProjects.length > 0 ? siteProjects : overview.site_projects;
    const news = newsItems.length > 0 ? newsItems : overview.news;

    return {
      isLoading,
      deputyName: sectionValue("deputy_name", "Chiara Biondini"),
      deputyRole: sectionValue(
        "deputy_role",
        "Deputada estadual por Minas Gerais",
      ),
      heroTitle: sectionValue(
        "hero_title",
        "Representacao firme, escuta ativa e compromisso institucional com Minas Gerais.",
      ),
      heroSummary: sectionValue(
        "hero_summary",
        "Atuacao parlamentar orientada por presenca nos municipios, articulacao com as instituicoes e acompanhamento objetivo das demandas da populacao.",
      ),
      heroImageUrl: sectionValue("hero_image_url", ""),
      heroImageAlt: sectionValue(
        "hero_image_alt",
        "Retrato institucional da deputada",
      ),
      biography: sectionValue(
        "biography",
        "Atuacao publica marcada por proximidade com a populacao, responsabilidade institucional e defesa de prioridades para Minas Gerais.",
      ),
      mission: sectionValue(
        "mission",
        "Atuar com seriedade, presenca territorial e compromisso com resultados concretos para a populacao mineira.",
      ),
      trajectory: sectionValue(
        "trajectory",
        "Uma trajetoria politica construida com escuta, fiscalizacao e acompanhamento permanente das pautas do mandato.",
      ),
      quote: sectionValue(
        "quote",
        "Mandato serio se mede por presenca, responsabilidade e resultado.",
      ),
      priorities: splitContent(
        sectionValue(
          "priorities",
          "Saude\nEducacao\nDesenvolvimento regional",
        ),
      ),
      newsItems: news,
      siteProjects: projects,
      coveredCitiesCount: new Set(projects.map((item) => item.city.name)).size,
      formatDate,
      formatProjectStatus,
      truncateText,
    };
  }, [isLoading, newsItems, overview, siteProjects]);

  return (
    <PublicSiteContext.Provider value={value}>
      <PublicSiteFrame
        deputyName={value.deputyName}
        deputyRole={value.deputyRole}
      >
        <Outlet />
      </PublicSiteFrame>
    </PublicSiteContext.Provider>
  );
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext);

  if (!context) {
    throw new Error("usePublicSite must be used within PublicSiteLayout.");
  }

  return context;
}
