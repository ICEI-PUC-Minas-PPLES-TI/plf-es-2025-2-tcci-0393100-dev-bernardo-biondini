import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { PaginatedType } from "../types/paginated-type";
import type { ProjectLawOptionsType } from "../types/project-law/project-law-options-type";
import type { ProjectLawType } from "../types/project-law/project-law-type";

interface ProjectLawMutationPayload {
  number: string;
  description: string;
  status: ProjectLawType["status"];
  protocol_date: string;
}

interface ProjectLawListFilters {
  search?: string;
  status?: ProjectLawType["status"] | null;
  sortBy?: "number" | "protocol_date" | "created_at";
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

export async function listProjectLaws(
  page = 1,
  perPage = 10,
  filters: ProjectLawListFilters = {},
): Promise<PaginatedType<ProjectLawType>> {
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

  const response = await authenticatedRequest<{
    data: {
      data: ProjectLawType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/project-laws?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function getProjectLawOptions(): Promise<ProjectLawOptionsType> {
  const response = await authenticatedRequest<{ data: ProjectLawOptionsType }>(
    "/project-laws/options",
  );

  return (
    response?.data ?? {
      statuses: [],
    }
  );
}

export async function createProjectLaw(
  payload: ProjectLawMutationPayload,
): Promise<ProjectLawType> {
  const response = await authenticatedRequest<{
    message: string;
    data: ProjectLawType;
  }>("/project-laws", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar o projeto de lei.");
  }

  return response.data;
}

export async function updateProjectLaw(
  projectLawId: number,
  payload: ProjectLawMutationPayload,
): Promise<ProjectLawType> {
  const response = await authenticatedRequest<{
    message: string;
    data: ProjectLawType;
  }>(`/project-laws/${projectLawId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar o projeto de lei.");
  }

  return response.data;
}

export async function removeProjectLaw(projectLawId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/project-laws/${projectLawId}`, {
    method: "DELETE",
  });
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}