import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import type { DashboardOverviewType } from "../types/dashboard/dashboard-overview-type";

interface DashboardFilters {
  cityId?: number | null;
  region?: string | null;
}

async function authenticatedRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(
      payload?.message ?? "Nao foi possivel carregar o dashboard.",
    );
  }

  return (await response.json()) as T;
}

export async function getDashboardOverview(
  filters: DashboardFilters = {},
): Promise<DashboardOverviewType> {
  const params = new URLSearchParams();

  if (filters.cityId) {
    params.set("city_id", String(filters.cityId));
  }

  if (filters.region?.trim()) {
    params.set("region", filters.region.trim());
  }

  const queryString = params.toString();
  const path = queryString ? `/dashboard?${queryString}` : "/dashboard";

  const response = await authenticatedRequest<{ data: DashboardOverviewType }>(
    path,
  );

  if (!response?.data) {
    throw new Error("Resposta invalida ao carregar o dashboard.");
  }

  return response.data;
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
