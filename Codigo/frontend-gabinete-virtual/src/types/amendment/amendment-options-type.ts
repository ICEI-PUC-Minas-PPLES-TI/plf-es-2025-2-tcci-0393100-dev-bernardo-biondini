import type { CityType } from "../city/city-type";
import type {
  AmendmentApplicationAreaType,
  AmendmentStatusType,
} from "./amendment-type";

export interface AmendmentStatusOptionType {
  value: AmendmentStatusType;
  label: string;
}

export interface AmendmentApplicationAreaOptionType {
  value: AmendmentApplicationAreaType;
  label: string;
}

export interface AmendmentOptionsType {
  statuses: AmendmentStatusOptionType[];
  application_areas: AmendmentApplicationAreaOptionType[];
  cities: CityType[];
}
