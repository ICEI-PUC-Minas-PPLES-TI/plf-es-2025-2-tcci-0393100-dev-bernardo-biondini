import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { PaginatedType } from "../types/paginated-type";
import type { AgendaOptionsType } from "../types/event/agenda-options-type";
import type { EventAlertType } from "../types/event/event-alert-type";
import type { EventType } from "../types/event/event-type";

interface ApiErrorWithDetails extends Error {
  details?: Record<string, unknown> | null;
}

interface AgendaEventMutationPayload {
  title: string;
  type: EventType["type"];
  starts_at: string;
  ends_at: string;
  location: string;
  description?: string | null;
  participants_expected?: number | null;
  color?: string | null;
  city_id?: number | null;
  demand_ids?: number[];
}

interface AgendaAlertMutationPayload {
  event_id?: number | null;
  title: string;
  message?: string | null;
  alert_at: string;
  lead_time_minutes?: number | null;
  channel: "email" | "system";
  is_recurring?: boolean;
}

interface AgendaEventListFilters {
  search?: string;
  cityId?: number | null;
  month?: number;
  year?: number;
  sortBy?: "starts_at" | "title" | "created_at";
  sortDirection?: "asc" | "desc";
}

interface AgendaAlertListFilters {
  search?: string;
  eventId?: number | null;
  month?: number;
  year?: number;
  status?: "all" | "pending" | "unread";
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
      | Record<string, unknown>
      | null;

    const error = new Error(
      (payload as { message?: string } | null)?.message ??
        "Nao foi possivel processar a requisicao.",
    ) as ApiErrorWithDetails;

    error.details = payload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

export async function listAgendaEvents(
  page = 1,
  perPage = 10,
  filters: AgendaEventListFilters = {},
): Promise<PaginatedType<EventType>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: filters.sortBy ?? "starts_at",
    sort_direction: filters.sortDirection ?? "asc",
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.cityId) {
    params.set("city_id", String(filters.cityId));
  }

  if (filters.month) {
    params.set("month", String(filters.month));
  }

  if (filters.year) {
    params.set("year", String(filters.year));
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  const response = await authenticatedRequest<{
    data: {
      data: EventType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/agenda/events?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function getAgendaOptions(): Promise<AgendaOptionsType> {
  const response = await authenticatedRequest<{ data: AgendaOptionsType }>(
    "/agenda/events/options",
  );

  return (
    response?.data ?? {
      types: [],
      cities: [],
      demands: [],
    }
  );
}

export async function createAgendaEvent(
  payload: AgendaEventMutationPayload,
): Promise<EventType> {
  const response = await authenticatedRequest<{
    message: string;
    data: EventType;
  }>("/agenda/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar o evento.");
  }

  return response.data;
}

export async function updateAgendaEvent(
  eventId: number,
  payload: AgendaEventMutationPayload,
): Promise<EventType> {
  const response = await authenticatedRequest<{
    message: string;
    data: EventType;
  }>(`/agenda/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao atualizar o evento.");
  }

  return response.data;
}

export async function removeAgendaEvent(eventId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/agenda/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function listAgendaAlerts(
  page = 1,
  perPage = 10,
  filters: AgendaAlertListFilters = {},
): Promise<PaginatedType<EventAlertType>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.eventId) {
    params.set("event_id", String(filters.eventId));
  }

  if (filters.month) {
    params.set("month", String(filters.month));
  }

  if (filters.year) {
    params.set("year", String(filters.year));
  }

  const response = await authenticatedRequest<{
    data: {
      data: EventAlertType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/agenda/alerts?${params.toString()}`);

  return toPaginatedType(response?.data);
}

export async function createAgendaAlert(
  payload: AgendaAlertMutationPayload,
): Promise<EventAlertType> {
  const response = await authenticatedRequest<{
    message: string;
    data: EventAlertType;
  }>("/agenda/alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao criar o alerta.");
  }

  return response.data;
}

export async function removeAgendaAlert(alertId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/agenda/alerts/${alertId}`, {
    method: "DELETE",
  });
}

export async function markAgendaAlertAsRead(alertId: number): Promise<EventAlertType> {
  const response = await authenticatedRequest<{
    message: string;
    data: EventAlertType;
  }>(`/agenda/alerts/${alertId}/read`, {
    method: "POST",
  });

  if (!response?.data) {
    throw new Error("Resposta invalida ao marcar o lembrete como lido.");
  }

  return response.data;
}

export function extractAgendaConflicts(error: unknown): Array<Record<string, unknown>> {
  const details = (error as ApiErrorWithDetails | null | undefined)?.details;

  if (!details || typeof details !== "object") {
    return [];
  }

  const conflicts = (details as { conflicts?: unknown }).conflicts;

  if (!Array.isArray(conflicts)) {
    return [];
  }

  return conflicts.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object",
  );
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
