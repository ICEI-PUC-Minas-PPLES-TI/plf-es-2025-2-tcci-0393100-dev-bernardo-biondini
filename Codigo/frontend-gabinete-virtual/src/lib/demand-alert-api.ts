import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import type { DemandAlertType } from "../types/demand-alert/demand-alert-type";

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

    throw new Error(payload?.message ?? "Nao foi possivel processar a requisicao.");
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

export async function listUnreadDemandAlerts(
  limit = 15,
): Promise<DemandAlertType[]> {
  const response = await authenticatedRequest<{ data: DemandAlertType[] }>(
    `/alerts?status=unread&limit=${limit}`,
  );

  return response?.data ?? [];
}

export async function markDemandAlertAsRead(
  alertId: number,
): Promise<DemandAlertType> {
  const response = await authenticatedRequest<{
    message: string;
    data: DemandAlertType;
  }>(`/alerts/${alertId}/read`, {
    method: "POST",
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao marcar o alerta como lido.");
  }

  return response.data;
}

export function toDemandAlertApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
