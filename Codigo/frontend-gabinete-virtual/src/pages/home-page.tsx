import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="app-shell flex min-h-screen items-center px-6 py-10 md:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex flex-col justify-between rounded-[32px] border border-border bg-primary px-8 py-10 text-white shadow-[0_24px_70px_rgba(33,69,53,0.35)] md:px-12 md:py-14">
          <div className="space-y-6">
            <span className="inline-flex w-fit rounded-full border border-white/20 px-4 py-2 text-sm tracking-[0.2em] uppercase text-white/80">
              Gabinete Virtual
            </span>
            <div className="space-y-4">
              <h1 className="section-title max-w-3xl text-4xl leading-tight font-semibold md:text-6xl">
                Gestao de acesso, permissoes e operacao em uma interface direta.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/78 md:text-lg">
                Cadastre usuarios, entre na plataforma e consulte rapidamente o
                perfil de acesso, o identificador do usuario autenticado e as
                permissoes liberadas pela API.
              </p>
            </div>
          </div>

          <div className="grid gap-4 pt-10 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/14 bg-white/8 p-5">
              <p className="text-sm text-white/64">Autenticacao</p>
              <p className="mt-2 text-2xl font-semibold">Bearer token</p>
            </div>
            <div className="rounded-3xl border border-white/14 bg-white/8 p-5">
              <p className="text-sm text-white/64">Contexto</p>
              <p className="mt-2 text-2xl font-semibold">Perfil + permissoes</p>
            </div>
            <div className="rounded-3xl border border-white/14 bg-white/8 p-5">
              <p className="text-sm text-white/64">Fluxo</p>
              <p className="mt-2 text-2xl font-semibold">Login e cadastro</p>
            </div>
          </div>
        </section>

        <section className="card-surface flex flex-col justify-between rounded-[32px] p-8 md:p-10">
          <div className="space-y-5">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Acesso rapido
            </p>
            <h2 className="section-title text-3xl font-semibold text-foreground">
              Entre no sistema ou crie um novo acesso.
            </h2>
            <p className="text-base leading-7 text-muted">
              A aplicacao agora usa Vite e React Router, com uma estrutura mais
              enxuta para o frontend.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            <Link
              to="/login"
              className="rounded-2xl bg-primary px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              Fazer login
            </Link>
            <Link
              to="/cadastro"
              className="rounded-2xl border border-border bg-surface-strong px-5 py-4 text-center text-sm font-semibold text-foreground transition hover:bg-background-strong"
            >
              Cadastrar usuario
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
