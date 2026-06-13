import type { CityType } from "../city/city-type";

export type AmendmentStatusType = "planned" | "in_execution" | "completed";
export type AmendmentApplicationAreaType =
  | "health"
  | "education"
  | "infrastructure"
  | "social_assistance"
  | "public_security"
  | "sport";

export interface AmendmentType {
  id: number;
  number: string;
  amount: number;
  status: AmendmentStatusType;
  city_id: number;
  application_area: AmendmentApplicationAreaType;
  city?: CityType | null;
  created_at: string;
  updated_at: string;
}
