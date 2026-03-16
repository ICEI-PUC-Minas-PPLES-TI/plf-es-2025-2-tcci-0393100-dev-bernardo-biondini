export interface ChatbotSessionType {
  id: number;
  citizen_id: number;
  channel: string;
  started_at: string;
  ended_at: string | null;
}
