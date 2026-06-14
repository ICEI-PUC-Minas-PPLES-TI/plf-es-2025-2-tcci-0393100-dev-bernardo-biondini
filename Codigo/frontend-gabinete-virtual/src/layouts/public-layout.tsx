import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/core";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="app-shell min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card tone="primary" padding="lg" className="px-8 py-10">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase text-primary"
          >
            Gabinete Virtual
          </Link>

          <div className="mt-10 space-y-5">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
              Chiara Biondini
            </p>
            <h2 className="section-title text-4xl font-semibold text-foreground">
              Você pode logar ao painel usando seu usuário e senha do Gabinete da Deputada
            </h2>
          </div>
        </Card>

        <div className="flex items-center">{children}</div>
      </div>
    </div>
  );
}
