import { Link } from "react-router-dom";
import { usePublicSite } from "../components/domains/public/public-site-layout";

export function AboutPage() {
  const {
    isLoading,
    deputyName,
    deputyRole,
    biography,
    trajectory,
    quote,
    heroImageUrl,
    heroImageAlt,
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
          Biografia
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight text-primary-strong md:text-6xl">
          {deputyName}
        </h1>
        <p className="mt-4 text-lg text-muted">{deputyRole}</p>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="overflow-hidden border border-border bg-white">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={heroImageAlt}
              className="h-full min-h-[420px] w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[420px] items-end bg-[linear-gradient(145deg,#1f3263_0%,#2e4b8c_55%,#d9bf8d_130%)] p-8">
              <div className="max-w-sm border border-white/18 bg-[rgba(255,255,255,0.08)] p-6 text-white">
                <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-white/76">
                  Representacao institucional
                </p>
                <p className="mt-4 font-serif text-4xl">{deputyName}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <article className="border-b border-border pb-8">
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-muted">
              Quem e
            </p>
            <div className="mt-5 space-y-5 text-base leading-8 text-muted">
              <p>{biography}</p>
              <p>{trajectory}</p>
            </div>
          </article>

          <article className="border-l-4 border-warning pl-6">
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-warning-dark">
              Declaracao de mandato
            </p>
            <p className="mt-4 font-serif text-3xl leading-tight text-primary-strong">
              “{quote}”
            </p>
          </article>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/atuacao"
              className="inline-flex rounded-full bg-primary px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase transition hover:bg-primary-900"
              style={{ color: "#F7F9FC" }}
            >
              Ver atuacao parlamentar
            </Link>
            <Link
              to="/noticias"
              className="inline-flex rounded-full border border-primary-200 px-5 py-3 text-xs font-semibold tracking-[0.18em] uppercase text-primary-strong transition hover:bg-primary-50"
            >
              Acompanhar noticias
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
