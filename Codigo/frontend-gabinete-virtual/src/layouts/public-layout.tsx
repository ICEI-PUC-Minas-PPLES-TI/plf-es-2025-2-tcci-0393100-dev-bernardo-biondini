import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="app-shell min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="rounded-[32px] border border-border bg-background-strong px-8 py-10">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase text-primary"
          >
            Gabinete Virtual
          </Link>

          <div className="mt-10 space-y-5">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Estrutura base
            </p>
            <h2 className="section-title text-4xl font-semibold text-foreground">
              Layout publico padronizado para autenticacao e navegacao.
            </h2>
            <p className="max-w-xl text-base leading-8 text-muted">
              O frontend agora roda em Vite com rotas no cliente e protecao de
              acesso feita pelo token salvo localmente.
            </p>
          </div>
        </aside>

        <div className="flex items-center">{children}</div>
      </div>
    </div>
  );
}
