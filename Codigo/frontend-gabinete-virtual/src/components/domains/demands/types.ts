import type { ManagedDemandType } from "../../../types/demand/managed-demand-type";

export interface DemandFormState {
  title: string;
  description: string;
  serviceArea: string;
  status: "open" | "under_review" | "in_progress" | "completed" | "discarded";
  priority: "" | "low" | "medium" | "high";
  responsibleUserId: string;
  cityId: string;
  institutionId: string;
}

export interface DemandFilterState {
  search: string;
  status: "" | ManagedDemandType["status"];
  responsibleUserId: string;
  sortBy: "created_at" | "title";
  sortDirection: "asc" | "desc";
  onlyMine: boolean;
}

export type DemandModalMode = "create" | "edit";
