import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { CmsOptionsType } from "../types/cms/cms-options-type";
import type { CmsPublicOverviewType } from "../types/cms/cms-public-overview-type";
import type { CmsSectionKeyType, CmsSectionType } from "../types/cms/cms-section-type";
import type { NewsType } from "../types/news/news-type";
import type { PaginatedType } from "../types/paginated-type";
import type { SiteProjectStatusType, SiteProjectType } from "../types/site-project/site-project-type";

interface NewsListFilters {
  search?: string;
  sortBy?: "published_at" | "title" | "created_at";
  sortDirection?: "asc" | "desc";
}

interface SiteProjectListFilters {
  search?: string;
  status?: SiteProjectStatusType | "";
  cityId?: number | string;
  sortBy?: "created_at" | "title" | "status";
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

async function publicRequest<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
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

export async function getCmsSections(): Promise<CmsSectionType[]> {
  const response = await authenticatedRequest<{ data: CmsSectionType[] }>(
    "/cms/sections",
  );

  return response?.data ?? [];
}

export async function getCmsOptions(): Promise<CmsOptionsType> {
  const response = await authenticatedRequest<{ data: CmsOptionsType }>(
    "/cms/options",
  );

  return response?.data ?? {
    site_project_statuses: [],
    cities: [],
  };
}

export async function updateCmsSection(
  key: CmsSectionKeyType,
  payload: { content: string },
): Promise<CmsSectionType> {
  const response = await authenticatedRequest<{
    message: string;
    data: CmsSectionType;
  }>(`/cms/sections/${key}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar a secao.");
  }

  return response.data;
}

export async function listCmsNews(
  page = 1,
  perPage = 10,
  filters: NewsListFilters = {},
): Promise<PaginatedType<NewsType>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: filters.sortBy ?? "published_at",
    sort_direction: filters.sortDirection ?? "desc",
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const response = await authenticatedRequest<{
    data: {
      data: NewsType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/cms/news?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function createCmsNews(payload: FormData): Promise<NewsType> {
  const response = await authenticatedRequest<{
    message: string;
    data: NewsType;
  }>("/cms/news", {
    method: "POST",
    body: payload,
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar a noticia.");
  }

  return response.data;
}

export async function updateCmsNews(
  newsId: number,
  payload: FormData,
): Promise<NewsType> {
  const response = await authenticatedRequest<{
    message: string;
    data: NewsType;
  }>(`/cms/news/${newsId}`, {
    method: "POST",
    body: withMethodOverride(payload, "PUT"),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar a noticia.");
  }

  return response.data;
}

export async function removeCmsNews(newsId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/cms/news/${newsId}`, {
    method: "DELETE",
  });
}

export async function listCmsSiteProjects(
  page = 1,
  perPage = 10,
  filters: SiteProjectListFilters = {},
): Promise<PaginatedType<SiteProjectType>> {
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

  const response = await authenticatedRequest<{
    data: {
      data: SiteProjectType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/cms/site-projects?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function createCmsSiteProject(
  payload: FormData,
): Promise<SiteProjectType> {
  const response = await authenticatedRequest<{
    message: string;
    data: SiteProjectType;
  }>("/cms/site-projects", {
    method: "POST",
    body: payload,
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar o projeto do site.");
  }

  return response.data;
}

export async function updateCmsSiteProject(
  siteProjectId: number,
  payload: FormData,
): Promise<SiteProjectType> {
  const response = await authenticatedRequest<{
    message: string;
    data: SiteProjectType;
  }>(`/cms/site-projects/${siteProjectId}`, {
    method: "POST",
    body: withMethodOverride(payload, "PUT"),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar o projeto do site.");
  }

  return response.data;
}

export async function removeCmsSiteProject(siteProjectId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(
    `/cms/site-projects/${siteProjectId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getPublicCmsOverview(): Promise<CmsPublicOverviewType> {
  const response = await publicRequest<{ data: CmsPublicOverviewType }>(
    "/site-content",
  );

  return response?.data ?? {
    sections: [],
    news: [],
    site_projects: [],
  };
}

export async function listPublicNews(
  page = 1,
  perPage = 6,
  filters: NewsListFilters = {},
): Promise<PaginatedType<NewsType>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: filters.sortBy ?? "published_at",
    sort_direction: filters.sortDirection ?? "desc",
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const response = await publicRequest<{
    data: {
      data: NewsType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/news?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function listPublicSiteProjects(
  page = 1,
  perPage = 6,
  filters: SiteProjectListFilters = {},
): Promise<PaginatedType<SiteProjectType>> {
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

  const response = await publicRequest<{
    data: {
      data: SiteProjectType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/site-projects?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
