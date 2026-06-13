import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type {
  DemandOptionsType,
  ManagedDemandHistoryType,
  ManagedDemandType,
} from "../types/demand/managed-demand-type";
import type { PaginatedType } from "../types/paginated-type";

interface DemandListFilters {
  search?: string;
  status?: ManagedDemandType["status"] | null;
  responsibleUserId?: number | null;
  cityId?: number | null;
  region?: string | null;
  serviceArea?: string | null;
  sortBy?: "title" | "created_at";
  sortDirection?: "asc" | "desc";
}

async function authenticatedRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (init?.headers) {
    const extraHeaders = new Headers(init.headers);
    extraHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
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

function withMethodOverride(
  payload: FormData,
  method: "PUT",
): FormData {
  const body = new FormData();

  payload.forEach((value, key) => {
    body.append(key, value);
  });

  body.set("_method", method);

  return body;
}

export async function listDemands(
  page = 1,
  perPage = 10,
  filters: DemandListFilters = {},
): Promise<PaginatedType<ManagedDemandType>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: filters.sortBy ?? "created_at",
    sort_direction: filters.sortDirection ?? "desc",
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.responsibleUserId) {
    params.set("responsible_user_id", String(filters.responsibleUserId));
  }

  if (filters.cityId) {
    params.set("city_id", String(filters.cityId));
  }

  if (filters.region?.trim()) {
    params.set("region", filters.region.trim());
  }

  if (filters.serviceArea?.trim()) {
    params.set("service_area", filters.serviceArea.trim());
  }

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
  }>(`/demands?${params.toString()}`);

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
      service_areas: [],
    }
  );
}

export async function listDemandHistories(
  demandId: number,
  page = 1,
  perPage = 5,
): Promise<PaginatedType<ManagedDemandHistoryType>> {
  const response = await authenticatedRequest<{
    data: {
      data: ManagedDemandHistoryType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/demands/${demandId}/histories?page=${page}&per_page=${perPage}`);

  return toPaginatedType(response?.data);
}

export async function createDemand(
  payload: FormData,
): Promise<ManagedDemandType> {
  const response = await authenticatedRequest<{
    message: string;
    data: ManagedDemandType;
  }>(
    "/demands",
    {
      method: "POST",
      body: payload,
    },
  );

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar a demanda.");
  }

  return response.data;
}

export async function updateDemand(
  demandId: number,
  payload: FormData,
): Promise<ManagedDemandType> {
  const response = await authenticatedRequest<{
    message: string;
    data: ManagedDemandType;
  }>(
    `/demands/${demandId}`,
    {
      method: "POST",
      body: withMethodOverride(payload, "PUT"),
    },
  );

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar a demanda.");
  }

  return response.data;
}

export async function removeDemand(demandId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/demands/${demandId}`, {
    method: "DELETE",
  });
}

export async function downloadDemandOficio(
  demandId: number,
  fileName?: string | null,
): Promise<void> {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  const response = await fetch(
    `${API_BASE_URL}/demands/${demandId}/oficio/download`,
    {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(payload?.message ?? "Nao foi possivel baixar o oficio.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName?.trim() || `oficio-demanda-${demandId}`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
