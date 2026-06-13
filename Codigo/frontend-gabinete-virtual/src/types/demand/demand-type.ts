export type DemandStatusType =
  | "open"
  | "under_review"
  | "in_progress"
  | "completed"
  | "discarded";
export type DemandPriorityType = "low" | "medium" | "high";

export interface DemandType {
  id: number;
  title: string;
  description: string;
  service_area: string | null;
  status: DemandStatusType;
  discard_message: string | null;
  priority: DemandPriorityType | null;
  responsible_user_id: number | null;
  city_id: number;
  institution_id: number;
  created_by_user_id: number | null;
  created_by_citizen_id: number | null;
  created_at: string;
  updated_at: string;
}
