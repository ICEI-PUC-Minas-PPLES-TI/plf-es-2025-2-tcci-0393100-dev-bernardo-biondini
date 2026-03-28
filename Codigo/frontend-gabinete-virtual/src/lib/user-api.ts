import type { AccessProfileType } from "../types/access-profile";
import type { ManagedUserType } from "../types/user/managed-user-type";
import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { PaginatedType } from "../types/paginated-type";

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  access_profile_id: number;
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

export async function listUsers(
  page = 1,
  perPage = 10,
): Promise<PaginatedType<ManagedUserType>> {
  const response = await authenticatedRequest<{
    data: {
      data: ManagedUserType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/users?page=${page}&per_page=${perPage}`);

  return toPaginatedType(response?.data);
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  await authenticatedRequest<{ message: string; data: ManagedUserType }>(
    "/users",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function listAccessProfilesForUsers(): Promise<AccessProfileType[]> {
  const response = await authenticatedRequest<{
    data:
      | AccessProfileType[]
      | {
          data: AccessProfileType[];
        };
  }>("/access-profiles");

  if (!response?.data) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.data ?? [];
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
