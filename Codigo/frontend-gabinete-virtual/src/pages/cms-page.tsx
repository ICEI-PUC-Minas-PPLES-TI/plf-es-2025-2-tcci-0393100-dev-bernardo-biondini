import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import {
  createCmsNews,
  createCmsSiteProject,
  getCmsOptions,
  getCmsSections,
  listCmsNews,
  listCmsSiteProjects,
  removeCmsNews,
  removeCmsSiteProject,
  toApiError,
  updateCmsNews,
  updateCmsSection,
  updateCmsSiteProject,
} from "../lib/cms-api";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import type { CmsOptionsType } from "../types/cms/cms-options-type";
import type { CmsSectionKeyType, CmsSectionType } from "../types/cms/cms-section-type";
import type { NewsType } from "../types/news/news-type";
import type {
  SiteProjectStatusType,
  SiteProjectType,
} from "../types/site-project/site-project-type";

type CmsTabType = "sections" | "news" | "projects";

interface NewsFormState {
  title: string;
  content: string;
  publishedAt: string;
  image: File | null;
  existingImageUrl: string | null;
  removeImage: boolean;
}

interface SiteProjectFormState {
  title: string;
  description: string;
  cityId: string;
  status: SiteProjectStatusType;
  coverImage: File | null;
  existingImageUrl: string | null;
  removeImage: boolean;
}

interface NewsFilterState {
  search: string;
  sortBy: "published_at" | "title" | "created_at";
  sortDirection: "asc" | "desc";
}

interface SiteProjectFilterState {
  search: string;
  status: "" | SiteProjectStatusType;
  cityId: string;
  sortBy: "created_at" | "title" | "status";
  sortDirection: "asc" | "desc";
}

const NEWS_PER_PAGE = 6;
const SITE_PROJECTS_PER_PAGE = 6;

const DEFAULT_NEWS_FILTERS: NewsFilterState = {
  search: "",
  sortBy: "published_at",
  sortDirection: "desc",
};

const DEFAULT_SITE_PROJECT_FILTERS: SiteProjectFilterState = {
  search: "",
  status: "",
  cityId: "",
  sortBy: "created_at",
  sortDirection: "desc",
};

function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

const EMPTY_NEWS_FORM: NewsFormState = {
  title: "",
  content: "",
  publishedAt: getCurrentDateTimeLocal(),
  image: null,
  existingImageUrl: null,
  removeImage: false,
};

const EMPTY_SITE_PROJECT_FORM: SiteProjectFormState = {
  title: "",
  description: "",
  cityId: "",
  status: "planned",
  coverImage: null,
  existingImageUrl: null,
  removeImage: false,
};

const SECTION_METADATA: Record<
  CmsSectionKeyType,
  {
    helper: string;
    layout: "short" | "long";
    preview: "text" | "image";
  }
> = {
  deputy_name: {
    helper: "Nome usado na navegação e na apresentação principal do site.",
    layout: "short",
    preview: "text",
  },
  deputy_role: {
    helper: "Cargo ou linha curta de identificação exibida abaixo do nome.",
    layout: "short",
    preview: "text",
  },
  hero_title: {
    helper: "Título forte do bloco principal da página pública.",
    layout: "long",
    preview: "text",
  },
  hero_summary: {
    helper: "Resumo de abertura com a mensagem principal do mandato.",
    layout: "long",
    preview: "text",
  },
  hero_image_url: {
    helper: "URL da foto principal da deputada ou da imagem hero.",
    layout: "short",
    preview: "image",
  },
  hero_image_alt: {
    helper: "Descrição textual da imagem principal para acessibilidade.",
    layout: "short",
    preview: "text",
  },
  biography: {
    helper: "Biografia resumida da deputada para a seção 'Conheça'.",
    layout: "long",
    preview: "text",
  },
  priorities: {
    helper: "Liste uma prioridade por linha para virar destaques do mandato.",
    layout: "long",
    preview: "text",
  },
  quote: {
    helper: "Frase ou citação que será usada em bloco de destaque.",
    layout: "long",
    preview: "text",
  },
  mission: {
    helper: "Texto institucional sobre missão do mandato.",
    layout: "long",
    preview: "text",
  },
  trajectory: {
    helper: "Texto mais longo sobre trajetória política e atuação pública.",
    layout: "long",
    preview: "text",
  },
};

function toDateTimeLocal(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return getCurrentDateTimeLocal();
  }

  const normalized = new Date(
    parsed.getTime() - parsed.getTimezoneOffset() * 60000,
  );

  return normalized.toISOString().slice(0, 16);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

function truncateText(value: string, maxLength = 180): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function buildNewsPayload(form: NewsFormState): FormData {
  const payload = new FormData();

  payload.set("title", form.title.trim());
  payload.set("content", form.content.trim());
  payload.set("published_at", form.publishedAt);

  if (form.image) {
    payload.set("image", form.image);
  }

  if (form.removeImage) {
    payload.set("remove_image", "1");
  }

  return payload;
}

function buildSiteProjectPayload(form: SiteProjectFormState): FormData {
  const payload = new FormData();

  payload.set("title", form.title.trim());
  payload.set("description", form.description.trim());
  payload.set("city_id", form.cityId);
  payload.set("status", form.status);

  if (form.coverImage) {
    payload.set("cover_image", form.coverImage);
  }

  if (form.removeImage) {
    payload.set("remove_image", "1");
  }

  return payload;
}

export function CmsPage() {
  const [activeTab, setActiveTab] = useState<CmsTabType>("sections");
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [sections, setSections] = useState<CmsSectionType[]>([]);
  const [sectionDrafts, setSectionDrafts] = useState<
    Partial<Record<CmsSectionKeyType, string>>
  >({});
  const [options, setOptions] = useState<CmsOptionsType>({
    site_project_statuses: [],
    cities: [],
  });
  const [newsItems, setNewsItems] = useState<NewsType[]>([]);
  const [newsCurrentPage, setNewsCurrentPage] = useState(1);
  const [newsLastPage, setNewsLastPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsFilters, setNewsFilters] = useState<NewsFilterState>(
    DEFAULT_NEWS_FILTERS,
  );
  const [newsForm, setNewsForm] = useState<NewsFormState>(EMPTY_NEWS_FORM);
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
  const [siteProjects, setSiteProjects] = useState<SiteProjectType[]>([]);
  const [siteProjectsCurrentPage, setSiteProjectsCurrentPage] = useState(1);
  const [siteProjectsLastPage, setSiteProjectsLastPage] = useState(1);
  const [siteProjectsTotal, setSiteProjectsTotal] = useState(0);
  const [siteProjectFilters, setSiteProjectFilters] =
    useState<SiteProjectFilterState>(DEFAULT_SITE_PROJECT_FILTERS);
  const [siteProjectForm, setSiteProjectForm] =
    useState<SiteProjectFormState>(EMPTY_SITE_PROJECT_FORM);
  const [editingSiteProjectId, setEditingSiteProjectId] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSection, setIsSavingSection] =
    useState<CmsSectionKeyType | null>(null);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [isSubmittingSiteProject, setIsSubmittingSiteProject] = useState(false);
  const [hasForbiddenAccess, setHasForbiddenAccess] = useState(false);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = getStoredToken();

      if (!token) {
        setHasInvalidSession(true);
        setIsLoading(false);
        return;
      }

      try {
        const authenticatedUser = await getAuthenticatedUserByToken(token);

        if (!authenticatedUser) {
          setHasInvalidSession(true);
          return;
        }

        setPermissionCodes(authenticatedUser.permissions);

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.CMS_MANAGE)) {
          setHasForbiddenAccess(true);
          return;
        }

        const [
          sectionsResponse,
          optionsResponse,
          newsResponse,
          siteProjectsResponse,
        ] = await Promise.all([
          getCmsSections(),
          getCmsOptions(),
          listCmsNews(1, NEWS_PER_PAGE, DEFAULT_NEWS_FILTERS),
          listCmsSiteProjects(1, SITE_PROJECTS_PER_PAGE, DEFAULT_SITE_PROJECT_FILTERS),
        ]);

        setSections(sectionsResponse);
        setSectionDrafts(
          sectionsResponse.reduce<Partial<Record<CmsSectionKeyType, string>>>(
            (drafts, section) => {
              drafts[section.key] = section.content;
              return drafts;
            },
            {},
          ),
        );
        setOptions(optionsResponse);
        setNewsItems(newsResponse.data);
        setNewsCurrentPage(newsResponse.meta.current_page);
        setNewsLastPage(newsResponse.meta.last_page);
        setNewsTotal(newsResponse.meta.total);
        setSiteProjects(siteProjectsResponse.data);
        setSiteProjectsCurrentPage(siteProjectsResponse.meta.current_page);
        setSiteProjectsLastPage(siteProjectsResponse.meta.last_page);
        setSiteProjectsTotal(siteProjectsResponse.meta.total);
      } catch (requestError) {
        setError(toApiError(requestError, "Nao foi possivel carregar o CMS."));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const canManageCms = hasPermission(permissionCodes, PERMISSION_CODES.CMS_MANAGE);

  function resetNewsForm() {
    setEditingNewsId(null);
    setNewsForm({
      ...EMPTY_NEWS_FORM,
      publishedAt: getCurrentDateTimeLocal(),
    });
    setError(null);
    setSuccess(null);
  }

  function resetSiteProjectForm() {
    setEditingSiteProjectId(null);
    setSiteProjectForm(EMPTY_SITE_PROJECT_FORM);
    setError(null);
    setSuccess(null);
  }

  async function refreshNews(
    page = newsCurrentPage,
    filters = newsFilters,
  ) {
    const response = await listCmsNews(page, NEWS_PER_PAGE, filters);

    setNewsItems(response.data);
    setNewsCurrentPage(response.meta.current_page);
    setNewsLastPage(response.meta.last_page);
    setNewsTotal(response.meta.total);
  }

  async function refreshSiteProjects(
    page = siteProjectsCurrentPage,
    filters = siteProjectFilters,
  ) {
    const response = await listCmsSiteProjects(
      page,
      SITE_PROJECTS_PER_PAGE,
      filters,
    );

    setSiteProjects(response.data);
    setSiteProjectsCurrentPage(response.meta.current_page);
    setSiteProjectsLastPage(response.meta.last_page);
    setSiteProjectsTotal(response.meta.total);
  }

  function handleSelectNews(news: NewsType) {
    setEditingNewsId(news.id);
    setNewsForm({
      title: news.title,
      content: news.content,
      publishedAt: toDateTimeLocal(news.published_at),
      image: null,
      existingImageUrl: news.image_url,
      removeImage: false,
    });
    setActiveTab("news");
    setError(null);
    setSuccess(null);
  }

  function handleSelectSiteProject(siteProject: SiteProjectType) {
    setEditingSiteProjectId(siteProject.id);
    setSiteProjectForm({
      title: siteProject.title,
      description: siteProject.description,
      cityId: String(siteProject.city_id),
      status: siteProject.status,
      coverImage: null,
      existingImageUrl: siteProject.cover_image_url,
      removeImage: false,
    });
    setActiveTab("projects");
    setError(null);
    setSuccess(null);
  }

  async function handleSaveSection(key: CmsSectionKeyType) {
    const content = sectionDrafts[key].trim();

    if (!content) {
      setError("Informe um conteudo para a secao.");
      return;
    }

    setIsSavingSection(key);
    setError(null);
    setSuccess(null);

    try {
      const updatedSection = await updateCmsSection(key, { content });

      setSections((currentSections) =>
        currentSections.map((section) =>
          section.key === key ? updatedSection : section,
        ),
      );
      setSectionDrafts((currentDrafts) => ({
        ...currentDrafts,
        [key]: updatedSection.content,
      }));
      setSuccess(`Secao ${updatedSection.title.toLowerCase()} atualizada com sucesso.`);
    } catch (requestError) {
      setError(
        toApiError(requestError, "Nao foi possivel atualizar a secao selecionada."),
      );
    } finally {
      setIsSavingSection(null);
    }
  }

  async function handleApplyNewsFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshNews(1, newsFilters);
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel filtrar as noticias."));
    }
  }

  async function handleSubmitNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingNews(true);
    setError(null);
    setSuccess(null);

    try {
      if (!newsForm.title.trim() || !newsForm.content.trim()) {
        setError("Informe titulo e conteudo da noticia.");
        return;
      }

      if (!newsForm.publishedAt) {
        setError("Informe a data de publicacao.");
        return;
      }

      const payload = buildNewsPayload(newsForm);

      if (editingNewsId) {
        await updateCmsNews(editingNewsId, payload);
        await refreshNews(newsCurrentPage);
        setSuccess("Noticia atualizada com sucesso.");
      } else {
        await createCmsNews(payload);
        await refreshNews(1);
        resetNewsForm();
        setSuccess("Noticia criada com sucesso.");
      }
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel salvar a noticia."));
    } finally {
      setIsSubmittingNews(false);
    }
  }

  async function handleDeleteNews(news: NewsType) {
    const shouldDelete = window.confirm(
      `Deseja remover a noticia "${news.title}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeCmsNews(news.id);
      const targetPage =
        newsItems.length === 1 && newsCurrentPage > 1
          ? newsCurrentPage - 1
          : newsCurrentPage;

      await refreshNews(targetPage);

      if (editingNewsId === news.id) {
        resetNewsForm();
      }

      setSuccess("Noticia removida com sucesso.");
    } catch (requestError) {
      setError(toApiError(requestError, "Nao foi possivel remover a noticia."));
    }
  }

  async function handleApplySiteProjectFilters(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await refreshSiteProjects(1, siteProjectFilters);
    } catch (requestError) {
      setError(
        toApiError(
          requestError,
          "Nao foi possivel filtrar os projetos do site.",
        ),
      );
    }
  }

  async function handleSubmitSiteProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingSiteProject(true);
    setError(null);
    setSuccess(null);

    try {
      if (!siteProjectForm.title.trim() || !siteProjectForm.description.trim()) {
        setError("Informe nome e descricao do projeto.");
        return;
      }

      if (!siteProjectForm.cityId) {
        setError("Selecione o municipio beneficiado.");
        return;
      }

      const payload = buildSiteProjectPayload(siteProjectForm);

      if (editingSiteProjectId) {
        await updateCmsSiteProject(editingSiteProjectId, payload);
        await refreshSiteProjects(siteProjectsCurrentPage);
        setSuccess("Projeto do site atualizado com sucesso.");
      } else {
        await createCmsSiteProject(payload);
        await refreshSiteProjects(1);
        resetSiteProjectForm();
        setSuccess("Projeto do site criado com sucesso.");
      }
    } catch (requestError) {
      setError(
        toApiError(requestError, "Nao foi possivel salvar o projeto do site."),
      );
    } finally {
      setIsSubmittingSiteProject(false);
    }
  }

  async function handleDeleteSiteProject(siteProject: SiteProjectType) {
    const shouldDelete = window.confirm(
      `Deseja remover o projeto "${siteProject.title}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeCmsSiteProject(siteProject.id);
      const targetPage =
        siteProjects.length === 1 && siteProjectsCurrentPage > 1
          ? siteProjectsCurrentPage - 1
          : siteProjectsCurrentPage;

      await refreshSiteProjects(targetPage);

      if (editingSiteProjectId === siteProject.id) {
        resetSiteProjectForm();
      }

      setSuccess("Projeto do site removido com sucesso.");
    } catch (requestError) {
      setError(
        toApiError(
          requestError,
          "Nao foi possivel remover o projeto do site.",
        ),
      );
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando CMS...</p>
        </section>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (hasForbiddenAccess) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Acesso negado
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce nao possui permissao para visualizar o CMS.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao{" "}
            <strong>cms.manage</strong>.
          </p>
        </section>
      </main>
    );
  }

  const sectionCards = sections.filter(
    (section): section is CmsSectionType => section.key in SECTION_METADATA,
  );

  return (
    <main className="grid gap-6">
      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Conteudo institucional
        </p>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <h1 className="section-title text-4xl font-semibold text-foreground">
              CMS do site institucional
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted">
              Cadastre nome, biografia, hero, prioridades, noticias e projetos
              que serao exibidos na pagina publica da deputada.
            </p>
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <Link
              to="/conheca"
              className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-center text-sm font-semibold text-foreground transition hover:bg-background-strong"
            >
              Visualizar pagina publica
            </Link>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveTab("sections")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "sections"
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`}
              >
                Secoes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("news")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "news"
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`}
              >
                Noticias
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "projects"
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`}
              >
                Projetos
              </button>
            </div>
          </div>
        </div>
        {error ? (
          <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-6 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
            {success}
          </div>
        ) : null}
      </section>

      {activeTab === "sections" ? (
        sectionCards.map((section) => (
          <section
            key={section.id}
            className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
          >
            <article className="card-surface rounded-[32px] p-8">
              <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                Perfil público
              </p>
              <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {SECTION_METADATA[section.key].helper}
              </p>

              <div className="mt-8 grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Conteudo
                  </span>
                  {SECTION_METADATA[section.key].layout === "short" ? (
                    <input
                      value={sectionDrafts[section.key] ?? ""}
                      onChange={(event) =>
                        setSectionDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [section.key]: event.target.value,
                        }))
                      }
                      placeholder={`Preencha ${section.title.toLowerCase()}.`}
                    />
                  ) : (
                    <textarea
                      value={sectionDrafts[section.key] ?? ""}
                      onChange={(event) =>
                        setSectionDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [section.key]: event.target.value,
                        }))
                      }
                      className="min-h-60"
                      placeholder={`Escreva o texto da secao ${section.title.toLowerCase()}.`}
                    />
                  )}
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveSection(section.key)}
                    disabled={isSavingSection === section.key || !canManageCms}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingSection === section.key
                      ? "Salvando..."
                      : `Salvar ${section.title}`}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSectionDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [section.key]: section.content,
                      }))
                    }
                    className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong"
                  >
                    Restaurar ultimo salvo
                  </button>
                </div>
              </div>
            </article>

            <article className="card-surface rounded-[32px] p-8">
              <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                Preview
              </p>
              <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
                {section.title}
              </h3>
              {SECTION_METADATA[section.key].preview === "image" &&
              sectionDrafts[section.key] ? (
                <img
                  src={sectionDrafts[section.key]}
                  alt={sectionDrafts.hero_image_alt ?? "Preview da imagem principal"}
                  className="mt-6 h-72 w-full rounded-[28px] object-cover"
                />
              ) : (
                <div className="mt-6 whitespace-pre-line text-sm leading-8 text-muted">
                  {sectionDrafts[section.key] || "Nenhum conteudo informado."}
                </div>
              )}
            </article>
          </section>
        ))
      ) : null}

      {activeTab === "news" ? (
        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="card-surface rounded-[32px] p-8">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Publicacao
            </p>
            <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
              {editingNewsId ? "Editar noticia" : "Nova noticia"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Cadastre comunicados e atualizacoes publicas com data de
              publicacao e imagem opcional.
            </p>

            <form className="mt-8 grid gap-4" onSubmit={handleSubmitNews}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Titulo
                </span>
                <input
                  value={newsForm.title}
                  onChange={(event) =>
                    setNewsForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Prestacao de contas da semana"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Data de publicacao
                </span>
                <input
                  type="datetime-local"
                  value={newsForm.publishedAt}
                  onChange={(event) =>
                    setNewsForm((currentForm) => ({
                      ...currentForm,
                      publishedAt: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Conteudo
                </span>
                <textarea
                  value={newsForm.content}
                  onChange={(event) =>
                    setNewsForm((currentForm) => ({
                      ...currentForm,
                      content: event.target.value,
                    }))
                  }
                  className="min-h-52"
                  placeholder="Escreva a noticia que sera exibida no portal publico."
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Imagem
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setNewsForm((currentForm) => ({
                      ...currentForm,
                      image: event.target.files?.[0] ?? null,
                      removeImage: false,
                    }))
                  }
                />
              </label>

              {newsForm.image ? (
                <p className="text-xs text-muted">
                  Arquivo selecionado: {newsForm.image.name}
                </p>
              ) : null}

              {newsForm.existingImageUrl && !newsForm.removeImage ? (
                <div className="rounded-3xl border border-border bg-surface-strong p-4">
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">
                    Imagem atual
                  </p>
                  <img
                    src={newsForm.existingImageUrl}
                    alt="Imagem atual da noticia"
                    className="mt-3 h-40 w-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewsForm((currentForm) => ({
                        ...currentForm,
                        removeImage: true,
                        image: null,
                      }))
                    }
                    className="mt-4 rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Remover imagem atual
                  </button>
                </div>
              ) : null}

              {newsForm.existingImageUrl && newsForm.removeImage ? (
                <button
                  type="button"
                  onClick={() =>
                    setNewsForm((currentForm) => ({
                      ...currentForm,
                      removeImage: false,
                    }))
                  }
                  className="rounded-xl border border-border bg-surface-strong px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                >
                  Manter imagem atual
                </button>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingNews || !canManageCms}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingNews
                    ? "Salvando..."
                    : editingNewsId
                      ? "Atualizar noticia"
                      : "Publicar noticia"}
                </button>
                <button
                  type="button"
                  onClick={resetNewsForm}
                  disabled={isSubmittingNews}
                  className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Limpar formulario
                </button>
              </div>
            </form>
          </article>

          <article className="card-surface rounded-[32px] p-8">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Noticias cadastradas
            </p>
            <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
              Consulta e manutencao
            </h2>

            <form className="mt-6 grid gap-3" onSubmit={handleApplyNewsFilters}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Buscar por titulo
                </span>
                <input
                  value={newsFilters.search}
                  onChange={(event) =>
                    setNewsFilters((currentFilters) => ({
                      ...currentFilters,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Ex.: agenda, reuniao, audiencia"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Ordenar por
                  </span>
                  <select
                    value={newsFilters.sortBy}
                    onChange={(event) =>
                      setNewsFilters((currentFilters) => ({
                        ...currentFilters,
                        sortBy: event.target.value as NewsFilterState["sortBy"],
                      }))
                    }
                  >
                    <option value="published_at">Publicacao</option>
                    <option value="title">Titulo</option>
                    <option value="created_at">Cadastro</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Direcao
                  </span>
                  <select
                    value={newsFilters.sortDirection}
                    onChange={(event) =>
                      setNewsFilters((currentFilters) => ({
                        ...currentFilters,
                        sortDirection: event.target.value as NewsFilterState["sortDirection"],
                      }))
                    }
                  >
                    <option value="desc">Mais recentes</option>
                    <option value="asc">Mais antigas</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
                >
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setNewsFilters(DEFAULT_NEWS_FILTERS);
                    setError(null);
                    setSuccess(null);

                    try {
                      await refreshNews(1, DEFAULT_NEWS_FILTERS);
                    } catch (requestError) {
                      setError(
                        toApiError(
                          requestError,
                          "Nao foi possivel limpar os filtros de noticias.",
                        ),
                      );
                    }
                  }}
                  className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong"
                >
                  Limpar filtros
                </button>
              </div>
            </form>

            <div className="mt-8 grid gap-4">
              {newsItems.length > 0 ? (
                newsItems.map((news) => (
                  <article
                    key={news.id}
                    className="rounded-3xl border border-border bg-surface-strong p-5"
                  >
                    {news.image_url ? (
                      <img
                        src={news.image_url}
                        alt={news.title}
                        className="h-40 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                    <div className={news.image_url ? "mt-4" : undefined}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {news.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {formatDateTime(news.published_at)} • {news.author.name}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-muted">
                        {truncateText(news.content)}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectNews(news)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNews(news)}
                          className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  Nenhuma noticia cadastrada ate o momento.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
              <span>Total: {newsTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshNews(newsCurrentPage - 1)}
                  disabled={newsCurrentPage <= 1}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <span>
                  Pagina {newsCurrentPage} de {newsLastPage}
                </span>
                <button
                  type="button"
                  onClick={() => refreshNews(newsCurrentPage + 1)}
                  disabled={newsCurrentPage >= newsLastPage}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Proxima
                </button>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "projects" ? (
        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="card-surface rounded-[32px] p-8">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Projeto institucional
            </p>
            <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
              {editingSiteProjectId ? "Editar projeto" : "Novo projeto"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Registre iniciativas exibidas no portal com descricao, municipio
              beneficiado, status e imagem opcional.
            </p>

            <form
              className="mt-8 grid gap-4"
              onSubmit={handleSubmitSiteProject}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Nome do projeto
                </span>
                <input
                  value={siteProjectForm.title}
                  onChange={(event) =>
                    setSiteProjectForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Circuito de atendimento regional"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Municipio beneficiado
                  </span>
                  <select
                    value={siteProjectForm.cityId}
                    onChange={(event) =>
                      setSiteProjectForm((currentForm) => ({
                        ...currentForm,
                        cityId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione um municipio</option>
                    {options.cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} • {city.region}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Status
                  </span>
                  <select
                    value={siteProjectForm.status}
                    onChange={(event) =>
                      setSiteProjectForm((currentForm) => ({
                        ...currentForm,
                        status: event.target.value as SiteProjectStatusType,
                      }))
                    }
                    required
                  >
                    {options.site_project_statuses.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Descricao
                </span>
                <textarea
                  value={siteProjectForm.description}
                  onChange={(event) =>
                    setSiteProjectForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-52"
                  placeholder="Detalhe o objetivo, o escopo e os resultados esperados."
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Imagem de capa
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setSiteProjectForm((currentForm) => ({
                      ...currentForm,
                      coverImage: event.target.files?.[0] ?? null,
                      removeImage: false,
                    }))
                  }
                />
              </label>

              {siteProjectForm.coverImage ? (
                <p className="text-xs text-muted">
                  Arquivo selecionado: {siteProjectForm.coverImage.name}
                </p>
              ) : null}

              {siteProjectForm.existingImageUrl && !siteProjectForm.removeImage ? (
                <div className="rounded-3xl border border-border bg-surface-strong p-4">
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">
                    Imagem atual
                  </p>
                  <img
                    src={siteProjectForm.existingImageUrl}
                    alt="Imagem atual do projeto"
                    className="mt-3 h-40 w-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSiteProjectForm((currentForm) => ({
                        ...currentForm,
                        removeImage: true,
                        coverImage: null,
                      }))
                    }
                    className="mt-4 rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Remover imagem atual
                  </button>
                </div>
              ) : null}

              {siteProjectForm.existingImageUrl && siteProjectForm.removeImage ? (
                <button
                  type="button"
                  onClick={() =>
                    setSiteProjectForm((currentForm) => ({
                      ...currentForm,
                      removeImage: false,
                    }))
                  }
                  className="rounded-xl border border-border bg-surface-strong px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                >
                  Manter imagem atual
                </button>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingSiteProject || !canManageCms}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingSiteProject
                    ? "Salvando..."
                    : editingSiteProjectId
                      ? "Atualizar projeto"
                      : "Criar projeto"}
                </button>
                <button
                  type="button"
                  onClick={resetSiteProjectForm}
                  disabled={isSubmittingSiteProject}
                  className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Limpar formulario
                </button>
              </div>
            </form>
          </article>

          <article className="card-surface rounded-[32px] p-8">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Projetos cadastrados
            </p>
            <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
              Consulta e manutencao
            </h2>

            <form
              className="mt-6 grid gap-3"
              onSubmit={handleApplySiteProjectFilters}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Buscar por nome
                </span>
                <input
                  value={siteProjectFilters.search}
                  onChange={(event) =>
                    setSiteProjectFilters((currentFilters) => ({
                      ...currentFilters,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Ex.: atendimento, regional, gabinete"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Municipio
                  </span>
                  <select
                    value={siteProjectFilters.cityId}
                    onChange={(event) =>
                      setSiteProjectFilters((currentFilters) => ({
                        ...currentFilters,
                        cityId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos os municipios</option>
                    {options.cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Status
                  </span>
                  <select
                    value={siteProjectFilters.status}
                    onChange={(event) =>
                      setSiteProjectFilters((currentFilters) => ({
                        ...currentFilters,
                        status: event.target.value as SiteProjectFilterState["status"],
                      }))
                    }
                  >
                    <option value="">Todos os status</option>
                    {options.site_project_statuses.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Ordenar por
                  </span>
                  <select
                    value={siteProjectFilters.sortBy}
                    onChange={(event) =>
                      setSiteProjectFilters((currentFilters) => ({
                        ...currentFilters,
                        sortBy: event.target.value as SiteProjectFilterState["sortBy"],
                      }))
                    }
                  >
                    <option value="created_at">Cadastro</option>
                    <option value="title">Nome</option>
                    <option value="status">Status</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Direcao
                  </span>
                  <select
                    value={siteProjectFilters.sortDirection}
                    onChange={(event) =>
                      setSiteProjectFilters((currentFilters) => ({
                        ...currentFilters,
                        sortDirection:
                          event.target.value as SiteProjectFilterState["sortDirection"],
                      }))
                    }
                  >
                    <option value="desc">Mais recentes</option>
                    <option value="asc">Mais antigos</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
                >
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setSiteProjectFilters(DEFAULT_SITE_PROJECT_FILTERS);
                    setError(null);
                    setSuccess(null);

                    try {
                      await refreshSiteProjects(1, DEFAULT_SITE_PROJECT_FILTERS);
                    } catch (requestError) {
                      setError(
                        toApiError(
                          requestError,
                          "Nao foi possivel limpar os filtros dos projetos.",
                        ),
                      );
                    }
                  }}
                  className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong"
                >
                  Limpar filtros
                </button>
              </div>
            </form>

            <div className="mt-8 grid gap-4">
              {siteProjects.length > 0 ? (
                siteProjects.map((siteProject) => {
                  const statusLabel =
                    options.site_project_statuses.find(
                      (statusOption) => statusOption.value === siteProject.status,
                    )?.label ?? siteProject.status;

                  return (
                    <article
                      key={siteProject.id}
                      className="rounded-3xl border border-border bg-surface-strong p-5"
                    >
                      {siteProject.cover_image_url ? (
                        <img
                          src={siteProject.cover_image_url}
                          alt={siteProject.title}
                          className="h-40 w-full rounded-2xl object-cover"
                        />
                      ) : null}
                      <div className={siteProject.cover_image_url ? "mt-4" : undefined}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {siteProject.title}
                            </h3>
                            <p className="mt-1 text-xs text-muted">
                              {siteProject.city.name} • {statusLabel}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-muted">
                          {truncateText(siteProject.description)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                            Responsavel: {siteProject.author.name}
                          </span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectSiteProject(siteProject)}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSiteProject(siteProject)}
                            className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="text-sm leading-7 text-muted">
                  Nenhum projeto do site cadastrado ate o momento.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
              <span>Total: {siteProjectsTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshSiteProjects(siteProjectsCurrentPage - 1)}
                  disabled={siteProjectsCurrentPage <= 1}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <span>
                  Pagina {siteProjectsCurrentPage} de {siteProjectsLastPage}
                </span>
                <button
                  type="button"
                  onClick={() => refreshSiteProjects(siteProjectsCurrentPage + 1)}
                  disabled={siteProjectsCurrentPage >= siteProjectsLastPage}
                  className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Proxima
                </button>
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
