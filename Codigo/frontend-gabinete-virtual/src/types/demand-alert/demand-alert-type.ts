export interface DemandAlertType {
  id: number;
  demand_id: number;
  user_id: number | null;
  citizen_id: number | null;
  title: string;
  message: string;
  type: string;
  channel: string;
  status: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
