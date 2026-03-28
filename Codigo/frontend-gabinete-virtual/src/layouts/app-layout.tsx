import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);

  const canViewUsers = hasPermission(
    permissionCodes,
    PERMISSION_CODES.USERS_VIEW,
  );
  const canViewRoles = hasPermission(
    permissionCodes,
    PERMISSION_CODES.ROLES_VIEW,
  );
  const canManageDemands = hasPermission(
    permissionCodes,
    PERMISSION_CODES.DEMANDS_MANAGE,
  );

  useEffect(() => {
    async function loadPermissions() {
      const token = getStoredToken();

      if (!token) {
        setPermissionCodes([]);
        return;
      }

      const user = await getAuthenticatedUserByToken(token);

      if (!user) {
        setPermissionCodes([]);
        return;
      }

      setPermissionCodes(user.permissions);
    }

    loadPermissions();
  }, []);

  return (
    <div className="app-shell min-h-screen px-6 py-6 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card-surface rounded-[32px] p-6">
          <div className="space-y-3">
            <Link
              to="/painel"
              className="text-sm font-semibold tracking-[0.22em] uppercase text-primary"
            >
              Gabinete Virtual
            </Link>
            <h1 className="section-title text-3xl font-semibold text-foreground">
              Painel interno
            </h1>
          </div>

          <nav className="mt-8 grid gap-2">
            <NavLink
              to="/painel"
              end
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                }`
              }
            >
              Resumo da sessao
            </NavLink>
            {canViewUsers ? (
              <NavLink
                to="/painel/usuarios"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Usuarios
              </NavLink>
            ) : null}
            {canManageDemands ? (
              <NavLink
                to="/painel/demandas"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Demandas
              </NavLink>
            ) : null}
            {canViewRoles ? (
              <NavLink
                to="/painel/papeis"
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-strong text-foreground hover:bg-background-strong"
                  }`
                }
              >
                Papeis
              </NavLink>
            ) : null}
          </nav>

          <div className="mt-8 rounded-[28px] bg-primary px-5 py-6 text-white">
            <p className="text-xs tracking-[0.2em] uppercase text-white/72">
              Sessao ativa
            </p>
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
