import { Link } from "react-router-dom";
import { usePublicSite } from "../components/domains/public/public-site-layout";

export function PublicActivityPage() {
  const {
    isLoading,
    mission,
    heroSummary,
    priorities,
    coveredCitiesCount,
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
          Atuacao parlamentar
        </p>
        <h1 className="mt-4 max-w-5xl font-serif text-5xl leading-tight text-primary-strong md:text-6xl">
          Prioridades politicas apresentadas com clareza, compromisso e presenca
          territorial.
        </h1>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="space-y-8">
          <article className="border border-border bg-white p-8">
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-muted">
              Missao
            </p>
            <p className="mt-5 text-base leading-8 text-muted">{mission}</p>
          </article>

          <article className="border border-border bg-[rgba(244,230,200,0.38)] p-8">
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-warning-dark">
              Alcance territorial
            </p>
            <p className="mt-4 font-serif text-5xl text-primary-strong">
              {coveredCitiesCount}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              municipios com iniciativas publicadas e acompanhadas no site.
            </p>
          </article>
        </aside>

        <div>
          <p className="max-w-3xl text-base leading-8 text-muted">
            {heroSummary}
          </p>

          <div className="mt-8 divide-y divide-border border-y border-border bg-white">
            {priorities.length > 0 ? (
              priorities.map((priority, index) => (
                <article
                  key={priority}
                  className="grid gap-4 px-6 py-6 md:grid-cols-[72px_1fr]"
                >
                  <span className="font-serif text-4xl text-primary-strong">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted">
                      Frente prioritaria
                    </p>
                    <h2 className="mt-3 font-serif text-3xl text-primary-strong">
                      {priority}
                    </h2>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-6 py-8 text-sm leading-7 text-muted">
                As frentes prioritarias do mandato serao publicadas em breve.
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link
              to="/projetos"
              className="inline-flex rounded-full bg-primary px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase transition hover:bg-primary-900"
              style={{ color: "#F7F9FC" }}
            >
              Ver projetos acompanhados
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
