import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { LogoutButton } from "../components/app/logout-button";
import {
  clearStoredToken,
  getAuthenticatedUserByToken,
  getStoredToken,
} from "../lib/auth";
import type { AuthUserType } from "../types/auth";

export function DashboardPage() {
  const initialToken = getStoredToken();
  const [user, setUser] = useState<AuthUserType | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialToken));
  const [hasInvalidSession, setHasInvalidSession] = useState(!initialToken);

  useEffect(() => {
    if (!initialToken) {
      return;
    }

    getAuthenticatedUserByToken(initialToken)
      .then((response) => {
        if (!response) {
          clearStoredToken();
          setHasInvalidSession(true);
          return;
        }

        setUser(response);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [initialToken]);

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando painel...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="grid gap-6">
      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Resumo da sessao
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="section-title text-4xl font-semibold text-foreground">
              O contexto do usuario ja chega pronto pela API.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              Esta area exibe o identificador do usuario autenticado, o perfil
              vinculado e a lista de permissoes retornada pelo endpoint protegido
              <code> /api/auth/me</code>.
            </p>
          </div>

          <div className="rounded-[28px] border border-border bg-background-strong p-6">
            <p className="text-xs tracking-[0.2em] uppercase text-muted">
              Perfil atual
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {user.access_profile?.name ?? "Sem perfil"}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              {user.access_profile?.description ??
                "Nenhuma descricao disponivel para este perfil."}
            </p>
            <div className="mt-6">
              <LogoutButton />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Dados do usuario
          </p>
          <dl className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-border bg-surface-strong p-4">
              <dt className="text-xs tracking-[0.2em] uppercase text-muted">
                Nome
              </dt>
              <dd className="mt-2 text-lg font-semibold text-foreground">
                {user.name}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-strong p-4">
              <dt className="text-xs tracking-[0.2em] uppercase text-muted">
                E-mail
              </dt>
              <dd className="mt-2 text-lg font-semibold text-foreground">
                {user.email}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-strong p-4">
              <dt className="text-xs tracking-[0.2em] uppercase text-muted">
                Perfil
              </dt>
              <dd className="mt-2 text-lg font-semibold text-foreground">
                {user.access_profile?.name ?? "Nao informado"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Permissoes do usuario
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user.permissions.length > 0 ? (
              user.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-strong"
                >
                  {permission}
                </span>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted">
                Nenhuma permissao associada ao perfil atual.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
