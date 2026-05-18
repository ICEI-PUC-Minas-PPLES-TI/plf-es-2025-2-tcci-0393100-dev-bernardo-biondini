export type DashboardActivityType =
  | "demand"
  | "project_law"
  | "amendment"
  | "event";

export interface DashboardFilterCityType {
  id: number;
  name: string;
  region: string;
}

export interface DashboardDemandServiceAreaOptionType {
  value: string;
  label: string;
}

export interface DashboardFilterOptionsType {
  regions: string[];
  cities: DashboardFilterCityType[];
  demand_service_areas: DashboardDemandServiceAreaOptionType[];
}

export interface DashboardSummaryType {
  active_demands: number;
  completed_demands: number;
  project_laws_total: number;
  amendments: number;
  amendment_amount_total: number;
  events_this_month: number;
  institutions: number;
  resolution_rate: number;
}

export interface DashboardScopeType {
  label: string;
  description: string;
}

export interface DashboardChartDatumType {
  key: string;
  label: string;
  value: number;
  description?: string | null;
}

export interface DashboardAmountChartDatumType
  extends DashboardChartDatumType {
  amount_total: number;
}

export interface DashboardChartsType {
  demands_by_status: DashboardChartDatumType[];
  demands_by_service_area: DashboardChartDatumType[];
  demands_by_city: DashboardChartDatumType[];
  amendments_by_city: DashboardAmountChartDatumType[];
}

export interface DashboardRecentActivityType {
  id: string;
  type: DashboardActivityType;
  title: string;
  description: string;
  occurred_at: string;
  link: string;
}

export interface DashboardOverviewType {
  filters: {
    city_id: number | null;
    region: string | null;
  };
  scope: DashboardScopeType;
  options: DashboardFilterOptionsType;
  summary: DashboardSummaryType;
  charts: DashboardChartsType;
  recent_activities: DashboardRecentActivityType[];
  generated_at: string;
}
