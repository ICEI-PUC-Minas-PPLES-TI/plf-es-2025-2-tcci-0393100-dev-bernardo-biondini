import type { CityType } from "../city/city-type";
import type { SiteProjectStatusType } from "../site-project/site-project-type";

export interface CmsSiteProjectStatusOptionType {
  value: SiteProjectStatusType;
  label: string;
}

export interface CmsOptionsType {
  site_project_statuses: CmsSiteProjectStatusOptionType[];
  cities: CityType[];
}
