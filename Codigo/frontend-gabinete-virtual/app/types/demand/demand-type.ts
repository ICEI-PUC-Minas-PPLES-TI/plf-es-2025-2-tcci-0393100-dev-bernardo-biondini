export type DemandStatusType = "open" | "in_progress" | "completed";
export type DemandPriorityType = "low" | "medium" | "high";

export interface DemandType {
  id: number;
  title: string;
  description: string;
  status: DemandStatusType;
  priority: DemandPriorityType;
  responsible_user_id: number;
  city_id: number;
  institution_id: number;
  created_by_user_id: number | null;
  created_by_citizen_id: number | null;
  created_at: string;
  updated_at: string;
}
