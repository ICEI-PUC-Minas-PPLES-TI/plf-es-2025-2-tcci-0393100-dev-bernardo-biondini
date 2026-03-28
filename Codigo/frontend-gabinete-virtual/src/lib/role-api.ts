import { API_BASE_URL, extractApiError, getStoredToken } from "./auth";
import { toPaginatedType } from "./pagination";
import type { PermissionType } from "../types/permission/permission-type";
import type { RoleType } from "../types/role/role-type";
import type { PaginatedType } from "../types/paginated-type";

interface RoleMutationPayload {
  name: string;
  description: string;
  permission_ids: number[];
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

export async function listPermissions(): Promise<PermissionType[]> {
  const response = await authenticatedRequest<{ data: PermissionType[] }>(
    "/permissions",
  );

  return response?.data ?? [];
}

export async function listRoles(
  page = 1,
  perPage = 10,
): Promise<PaginatedType<RoleType>> {
  const response = await authenticatedRequest<{
    data: {
      data: RoleType[];
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }>(`/roles?page=${page}&per_page=${perPage}`);

  return toPaginatedType(response?.data);
}

export async function createRole(payload: RoleMutationPayload): Promise<void> {
  await authenticatedRequest<{ message: string; data: RoleType }>("/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRole(
  roleId: number,
  payload: RoleMutationPayload,
): Promise<void> {
  await authenticatedRequest<{ message: string; data: RoleType }>(
    `/roles/${roleId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function removeRole(roleId: number): Promise<void> {
  await authenticatedRequest<{ message: string }>(`/roles/${roleId}`, {
    method: "DELETE",
  });
}

export function toApiError(error: unknown, fallback: string): string {
  return extractApiError(error, fallback);
}
