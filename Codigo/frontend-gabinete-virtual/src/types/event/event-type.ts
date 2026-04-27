import type { CityType } from "../city/city-type";
import type { EventAlertType } from "./event-alert-type";

export interface EventDemandOptionType {
  id: number;
  title: string;
  status: string;
}

export interface EventType {
  id: number;
  title: string;
  type: "meeting" | "audience" | "visit" | "session" | "other";
  event_at: string;
  starts_at: string;
  ends_at: string;
  location: string;
  context: string;
  description: string | null;
  participants_expected: number | null;
  color: string | null;
  city_id: number | null;
  created_at: string;
  updated_at: string;
  city?: CityType | null;
  demands?: EventDemandOptionType[];
  alerts?: EventAlertType[];
}
