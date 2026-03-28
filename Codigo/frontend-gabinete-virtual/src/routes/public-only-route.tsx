import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../lib/auth";

interface PublicOnlyRouteProps {
  children: ReactNode;
  allowHome?: boolean;
}

export function PublicOnlyRoute({
  children,
  allowHome = false,
}: PublicOnlyRouteProps) {
  if (!allowHome && isAuthenticated()) {
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
