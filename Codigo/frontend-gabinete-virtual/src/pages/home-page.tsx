import { Link } from "react-router-dom";
import { usePublicSite } from "../components/domains/public/public-site-layout";

export function HomePage() {
  const {
    isLoading,
    deputyName,
    deputyRole,
    heroTitle,
    heroSummary,
    heroImageUrl,
    heroImageAlt,
    priorities,
    siteProjects,
    newsItems,
    coveredCitiesCount,
    formatDate,
    formatProjectStatus,
    truncateText,
  } = usePublicSite();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <p className="text-sm leading-7 text-muted">
          Carregando conteudo institucional...
        </p>
      </main>
    );
  }

  const featuredProject = siteProjects[0] ?? null;
  const latestNews = newsItems.slice(0, 3);

  return (
    <main>
      <section className="border-b border-[rgba(24,35,61,0.12)] bg-[linear-gradient(135deg,#1f3263_0%,#2e4b8c_50%,#d4b47a_140%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:py-20">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-white/74">
              {deputyRole}
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] md:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/84 md:text-lg">
              {heroSummary}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/conheca"
                className="inline-flex rounded-full bg-white px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase transition hover:bg-white/92"
                style={{ color: "#1F3263" }}
              >
                Conheca a deputada
              </Link>
              <Link
                to="/noticias"
                className="inline-flex rounded-full border border-white/24 px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase text-white transition hover:bg-white/10"
              >
                Ultimas noticias
              </Link>
            </div>
          </div>

          <div className="overflow-hidden border border-white/12 bg-[rgba(255,255,255,0.08)]">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={heroImageAlt}
                className="h-full min-h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[420px] items-end p-8">
                <div className="border border-white/18 bg-[rgba(255,255,255,0.08)] p-6">
                  <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-white/72">
                    Representacao institucional
                  </p>
                  <p className="mt-4 font-serif text-4xl">{deputyName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[rgba(248,246,241,0.96)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:px-10 lg:grid-cols-3">
          <article className="border-l-4 border-primary pl-5">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
              Prioridades
            </p>
            <p className="mt-3 font-serif text-4xl text-primary-strong">
              {priorities.length}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              frentes organizadas no mandato.
            </p>
          </article>

          <article className="border-l-4 border-warning pl-5">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
              Projetos publicados
            </p>
            <p className="mt-3 font-serif text-4xl text-primary-strong">
              {siteProjects.length}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              iniciativas acompanhadas no portal.
            </p>
          </article>

          <article className="border-l-4 border-success pl-5">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
              Municipios
            </p>
            <p className="mt-3 font-serif text-4xl text-primary-strong">
              {coveredCitiesCount}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              cidades contempladas nas publicacoes atuais.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
        <article>
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
            Atuacao parlamentar
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-primary-strong md:text-5xl">
            Pautas tratadas com seriedade, presenca e acompanhamento institucional.
          </h2>

          <div className="mt-8 divide-y divide-border border-y border-border bg-white">
            {priorities.slice(0, 4).map((priority, index) => (
              <div
                key={priority}
                className="grid gap-3 px-6 py-5 md:grid-cols-[64px_1fr]"
              >
                <span className="font-serif text-3xl text-primary-strong">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                    Frente prioritaria
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-primary-strong">
                    {priority}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              to="/atuacao"
              className="inline-flex rounded-full bg-primary px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase transition hover:bg-primary-900"
              style={{ color: "#F7F9FC" }}
            >
              Ver atuacao completa
            </Link>
          </div>
        </article>

        <article>
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
            Projeto em destaque
          </p>
          {featuredProject ? (
            <div className="mt-4 border border-border bg-white">
              {featuredProject.cover_image_url ? (
                <img
                  src={featuredProject.cover_image_url}
                  alt={featuredProject.title}
                  className="h-[280px] w-full object-cover"
                />
              ) : (
                <div className="h-[280px] bg-[linear-gradient(145deg,#1f3263_0%,#2e4b8c_62%,#d9bf8d_140%)]" />
              )}

              <div className="grid gap-6 p-8 md:grid-cols-[1fr_120px]">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                    {featuredProject.city.name} • {featuredProject.city.region}
                  </p>
                  <h3 className="mt-3 font-serif text-3xl text-primary-strong">
                    {featuredProject.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-muted">
                    {truncateText(featuredProject.description, 260)}
                  </p>
                </div>

                <div className="border border-border bg-[rgba(248,246,241,0.9)] p-3">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-primary-strong">
                    {formatProjectStatus(featuredProject.status)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 border border-border bg-white p-8 text-sm leading-7 text-muted">
              Nenhuma iniciativa institucional foi publicada ate o momento.
            </div>
          )}
        </article>
      </section>

      <section className="border-t border-border bg-[rgba(248,246,241,0.72)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
                Noticias
              </p>
              <h2 className="mt-4 font-serif text-4xl text-primary-strong md:text-5xl">
                Ultimas publicacoes do gabinete
              </h2>
            </div>

            <Link
              to="/noticias"
              className="text-sm font-semibold uppercase tracking-[0.18em] text-primary hover:text-primary-900"
            >
              Ver todas
            </Link>
          </div>

          <div className="mt-8 divide-y divide-border border-y border-border bg-white">
            {latestNews.length > 0 ? (
              latestNews.map((news) => (
                <article
                  key={news.id}
                  className="grid gap-4 px-6 py-6 lg:grid-cols-[180px_1fr]"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    {formatDate(news.published_at)}
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl text-primary-strong">
                      {news.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">Por {news.author.name}</p>
                    <p className="mt-4 text-base leading-8 text-muted">
                      {truncateText(news.content, 280)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-6 py-8 text-sm leading-7 text-muted">
                Nenhuma noticia institucional foi publicada ate o momento.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
