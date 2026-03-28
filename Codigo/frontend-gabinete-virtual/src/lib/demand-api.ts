import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type {
  DemandOptionsType,
  ManagedDemandType,
} from "../types/demand/managed-demand-type";
import type { PaginatedType } from "../types/paginated-type";

interface DemandMutationPayload {
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  responsible_user_id: number;
  city_id: number;
  institution_id: number;
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

    throw new Error(payload?.message ?? "Nao foi possivel processar a requisicao.");
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

export async function listDemands(
  page = 1,
  perPage = 10,
): Promise<PaginatedType<ManagedDemandType>> {
  const response = await authenticatedRequest<{
    data: {
      data: ManagedDemandType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/demands?page=${page}&per_page=${perPage}`);

  return toPaginatedType(response?.data);
}

export async function getDemandOptions(): Promise<DemandOptionsType> {
  const response = await authenticatedRequest<{ data: DemandOptionsType }>(
    "/demands/options",
  );

  return (
    response?.data ?? {
      users: [],
      cities: [],
      institutions: [],
    }
  );
}

export async function createDemand(payload: DemandMutationPayload): Promise<void> {
  await authenticatedRequest<{ message: string; data: ManagedDemandType }>(
    "/demands",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateDemand(
  demandId: number,
  payload: DemandMutationPayload,
): Promise<void> {
  await authenticatedRequest<{ message: string; data: ManagedDemandType }>(
    `/demands/${demandId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function removeDemand(demandId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/demands/${demandId}`, {
    method: "DELETE",
  });
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
