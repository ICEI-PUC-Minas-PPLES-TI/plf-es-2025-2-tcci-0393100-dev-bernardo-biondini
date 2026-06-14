import { usePublicSite } from "../components/domains/public/public-site-layout";

export function PublicProjectsPage() {
  const {
    isLoading,
    siteProjects,
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <section className="border-b border-border pb-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary">
          Projetos e iniciativas
        </p>
        <h1 className="mt-4 max-w-5xl font-serif text-5xl leading-tight text-primary-strong md:text-6xl">
          Acompanhamento publico de iniciativas vinculadas aos municipios e ao
          trabalho do gabinete.
        </h1>
      </section>

      <section className="divide-y divide-border border-b border-border">
        {siteProjects.length > 0 ? (
          siteProjects.map((project) => (
            <article
              key={project.id}
              className="grid gap-6 py-8 lg:grid-cols-[280px_1fr_120px]"
            >
              <div className="overflow-hidden border border-border bg-white">
                {project.cover_image_url ? (
                  <img
                    src={project.cover_image_url}
                    alt={project.title}
                    className="h-full min-h-[180px] w-full object-cover"
                  />
                ) : (
                  <div className="flex min-h-[180px] items-end bg-[linear-gradient(145deg,#1f3263_0%,#2e4b8c_60%,#d9bf8d_140%)] p-6">
                    <p className="font-serif text-2xl text-white">{project.city.name}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                  {project.city.name} • {project.city.region}
                </p>
                <h2 className="mt-3 font-serif text-3xl text-primary-strong">
                  {project.title}
                </h2>
                <p className="mt-4 text-base leading-8 text-muted">
                  {truncateText(project.description, 340)}
                </p>
              </div>

              <div className="border border-border bg-white p-3">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-primary-strong">
                  {formatProjectStatus(project.status)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="py-10 text-sm leading-7 text-muted">
            Nenhum projeto institucional foi publicado ate o momento.
          </div>
        )}
      </section>
    </main>
  );
}
