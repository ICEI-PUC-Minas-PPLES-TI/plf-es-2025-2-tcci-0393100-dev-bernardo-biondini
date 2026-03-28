import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  clearStoredToken,
  getAuthenticatedUserByToken,
  getStoredToken,
} from "../lib/auth";
import { hasPermission, type PermissionCode } from "../lib/permission-codes";

interface PermissionRouteProps {
  children: ReactNode;
  permission: PermissionCode;
  redirectTo?: string;
}

export function PermissionRoute({
  children,
  permission,
  redirectTo = "/painel",
}: PermissionRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    async function checkPermission() {
      const token = getStoredToken();

      if (!token) {
        setRequiresLogin(true);
        setIsLoading(false);
        return;
      }

      const user = await getAuthenticatedUserByToken(token);

      if (!user) {
        clearStoredToken();
        setRequiresLogin(true);
        setIsLoading(false);
        return;
      }

      setIsAllowed(hasPermission(user.permissions, permission));
      setIsLoading(false);
    }

    checkPermission();
  }, [permission]);

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Validando permissao...</p>
        </section>
      </main>
    );
  }

  if (requiresLogin) {
    return <Navigate to="/login" replace />;
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
