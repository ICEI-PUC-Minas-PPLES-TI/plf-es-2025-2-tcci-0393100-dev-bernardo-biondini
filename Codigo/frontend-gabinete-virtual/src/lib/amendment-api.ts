import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { PaginatedType } from "../types/paginated-type";
import type { AmendmentOptionsType } from "../types/amendment/amendment-options-type";
import type { AmendmentType } from "../types/amendment/amendment-type";

interface AmendmentMutationPayload {
  number: string;
  amount: number;
  status: AmendmentType["status"];
  city_id: number;
  application_area: string;
}

interface AmendmentListFilters {
  search?: string;
  status?: AmendmentType["status"] | null;
  cityId?: number | null;
  applicationArea?: AmendmentType["application_area"] | null;
  sortBy?: "number" | "amount" | "created_at";
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

export async function listAmendments(
  page = 1,
  perPage = 10,
  filters: AmendmentListFilters = {},
): Promise<PaginatedType<AmendmentType>> {
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

  if (filters.cityId) {
    params.set("city_id", String(filters.cityId));
  }

  if (filters.applicationArea) {
    params.set("application_area", filters.applicationArea);
  }

  const response = await authenticatedRequest<{
    data: {
      data: AmendmentType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/amendments?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function getAmendmentOptions(): Promise<AmendmentOptionsType> {
  const response = await authenticatedRequest<{ data: AmendmentOptionsType }>(
    "/amendments/options",
  );

  return (
    response?.data ?? {
      statuses: [],
      application_areas: [],
      cities: [],
    }
  );
}

export async function createAmendment(
  payload: AmendmentMutationPayload,
): Promise<AmendmentType> {
  const response = await authenticatedRequest<{
    message: string;
    data: AmendmentType;
  }>("/amendments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar a emenda.");
  }

  return response.data;
}

export async function updateAmendment(
  amendmentId: number,
  payload: AmendmentMutationPayload,
): Promise<AmendmentType> {
  const response = await authenticatedRequest<{
    message: string;
    data: AmendmentType;
  }>(`/amendments/${amendmentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar a emenda.");
  }

  return response.data;
}

export async function removeAmendment(amendmentId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/amendments/${amendmentId}`, {
    method: "DELETE",
  });
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
