import type { CityType } from "../city/city-type";

export type AmendmentStatusType = "planned" | "in_execution" | "completed";

export interface AmendmentType {
  id: number;
  number: string;
  amount: number;
  status: AmendmentStatusType;
  city_id: number;
  application_area: string;
  city?: CityType | null;
  created_at: string;
  updated_at: string;
}
