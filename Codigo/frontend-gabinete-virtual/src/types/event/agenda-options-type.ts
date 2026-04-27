import type { CityType } from "../city/city-type";
import type { EventDemandOptionType } from "./event-type";

export interface AgendaEventTypeOptionType {
  value: "meeting" | "audience" | "visit" | "session" | "other";
  label: string;
}

export interface AgendaOptionsType {
  types: AgendaEventTypeOptionType[];
  cities: CityType[];
  demands: EventDemandOptionType[];
}
