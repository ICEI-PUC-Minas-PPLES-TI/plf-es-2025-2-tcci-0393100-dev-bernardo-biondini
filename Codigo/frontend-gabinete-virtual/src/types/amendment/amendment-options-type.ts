import type { CityType } from "../city/city-type";
import type { AmendmentStatusType } from "./amendment-type";

export interface AmendmentStatusOptionType {
  value: AmendmentStatusType;
  label: string;
}

export interface AmendmentOptionsType {
  statuses: AmendmentStatusOptionType[];
  cities: CityType[];
}