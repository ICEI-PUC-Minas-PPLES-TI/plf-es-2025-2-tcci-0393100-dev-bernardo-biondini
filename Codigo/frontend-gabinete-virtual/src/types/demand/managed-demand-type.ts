export interface DemandOptionUserType {
  id: number;
  name: string;
  email: string;
}

export interface DemandOptionCityType {
  id: number;
  name: string;
  region: string;
}

export interface DemandOptionInstitutionType {
  id: number;
  name: string;
  type: string;
  city_id: number;
}

export interface DemandServiceAreaOptionType {
  value: string;
  label: string;
}

export interface ManagedDemandHistoryType {
  id: number;
  demand_id: number;
  user_id: number | null;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user: DemandOptionUserType | null;
}

export interface ManagedDemandType {
  id: number;
  title: string;
  description: string;
  service_area: string | null;
  status: "open" | "under_review" | "in_progress" | "completed" | "discarded";
  priority: "low" | "medium" | "high" | null;
  responsible_user_id: number | null;
  city_id: number;
  institution_id: number;
  created_by_user_id: number | null;
  created_by_citizen_id: number | null;
  created_at: string;
  updated_at: string;
  user: DemandOptionUserType | null;
  city: DemandOptionCityType | null;
  institution: DemandOptionInstitutionType | null;
}

export interface DemandOptionsType {
  users: DemandOptionUserType[];
  cities: DemandOptionCityType[];
  institutions: DemandOptionInstitutionType[];
  service_areas: DemandServiceAreaOptionType[];
}
