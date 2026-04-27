export interface AlertEventSummaryType {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
}

export interface EventAlertType {
  id: number;
  event_id: number | null;
  title: string;
  message: string | null;
  alert_at: string;
  lead_time_minutes: number | null;
  channel: "email" | "system";
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  event?: AlertEventSummaryType | null;
}
