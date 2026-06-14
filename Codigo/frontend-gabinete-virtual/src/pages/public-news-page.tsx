import { usePublicSite } from "../components/domains/public/public-site-layout";

export function PublicNewsPage() {
  const {
    isLoading,
    newsItems,
    formatDate,
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

  const featuredNews = newsItems[0] ?? null;
  const remainingNews = featuredNews ? newsItems.slice(1) : [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <section className="border-b border-border pb-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
          Noticias
        </p>
        <h1 className="mt-4 max-w-5xl font-serif text-5xl leading-tight text-primary-strong md:text-6xl">
          Atualizacoes publicas do mandato, agendas e comunicados do gabinete.
        </h1>
      </section>

      {featuredNews ? (
        <section className="grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden border border-border bg-white">
            {featuredNews.image_url ? (
              <img
                src={featuredNews.image_url}
                alt={featuredNews.title}
                className="h-full min-h-[360px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[360px] items-end bg-[linear-gradient(145deg,#1f3263_0%,#2e4b8c_60%,#d9bf8d_140%)] p-8">
                <p className="font-serif text-4xl text-white">Ultima publicacao</p>
              </div>
            )}
          </div>

          <article className="flex flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
              Publicado em {formatDate(featuredNews.published_at)}
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-primary-strong">
              {featuredNews.title}
            </h2>
            <p className="mt-3 text-sm text-muted">
              Por {featuredNews.author.name}
            </p>
            <p className="mt-6 text-base leading-8 text-muted">
              {truncateText(featuredNews.content, 520)}
            </p>
          </article>
        </section>
      ) : null}

      <section className="divide-y divide-border border-b border-border">
        {remainingNews.length > 0 ? (
          remainingNews.map((news) => (
            <article
              key={news.id}
              className="grid gap-4 py-6 lg:grid-cols-[180px_1fr]"
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
                  {truncateText(news.content, 360)}
                </p>
              </div>
            </article>
          ))
        ) : !featuredNews ? (
          <div className="py-10 text-sm leading-7 text-muted">
            Nenhuma noticia institucional foi publicada ate o momento.
          </div>
        ) : null}
      </section>
    </main>
  );
}
