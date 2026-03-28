import type { AccessProfileType } from "../types/access-profile";
import type { AuthApiResponseType, AuthUserType } from "../types/auth";

export const AUTH_STORAGE_KEY = "gv_auth_token";
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function getAuthenticatedUserByToken(
  token: string,
): Promise<AuthUserType | null> {
  const response = await fetchApi<{ user: AuthUserType }>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response?.user ?? null;
}

export async function getAccessProfiles(): Promise<AccessProfileType[]> {
  const response = await fetchApi<{
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

export function getStoredToken(): string | null {
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function storeToken(token: string): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredToken());
}

export function extractApiError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function parseAuthResponse(
  response: Response,
): Promise<AuthApiResponseType> {
  const payload = (await response.json().catch(() => null)) as
    | AuthApiResponseType
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "Nao foi possivel autenticar.");
  }

  if (!payload) {
    throw new Error("Resposta de autenticacao invalida.");
  }

  return payload as AuthApiResponseType;
}
