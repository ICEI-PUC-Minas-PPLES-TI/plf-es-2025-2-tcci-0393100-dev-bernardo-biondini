import type { PaginatedType } from "../types/paginated-type";

interface LaravelPaginatorPayload<T> {
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export function toPaginatedType<T>(
  payload: LaravelPaginatorPayload<T> | undefined,
): PaginatedType<T> {
  return {
    data: payload?.data ?? [],
    meta: {
      total: payload?.total ?? 0,
      per_page: payload?.per_page ?? 10,
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      from: payload?.from ?? 0,
      to: payload?.to ?? 0,
    },
  };
}
