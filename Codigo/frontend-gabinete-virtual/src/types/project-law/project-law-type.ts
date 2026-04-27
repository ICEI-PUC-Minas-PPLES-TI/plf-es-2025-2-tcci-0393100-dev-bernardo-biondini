export type ProjectLawStatusType =
  | "in_committee"
  | "in_voting"
  | "approved"
  | "sanctioned";

export interface ProjectLawType {
  id: number;
  number: string;
  description: string;
  status: ProjectLawStatusType;
  protocol_date: string;
  created_at: string;
  updated_at: string;
}