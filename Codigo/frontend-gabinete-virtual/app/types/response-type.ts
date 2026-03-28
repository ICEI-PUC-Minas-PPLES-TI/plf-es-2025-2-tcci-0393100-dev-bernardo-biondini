import { ErrorType } from "./error-type";
import { PaginatedType } from "./paginated-type";
import { SingleType } from "./single-type";

export interface ResponseType<T> {
  data: SingleType<T> | PaginatedType<T> | null;
  error: ErrorType | null;
}