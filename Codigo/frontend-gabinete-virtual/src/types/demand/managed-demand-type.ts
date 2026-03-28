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

export interface ManagedDemandType {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  responsible_user_id: number;
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
}
