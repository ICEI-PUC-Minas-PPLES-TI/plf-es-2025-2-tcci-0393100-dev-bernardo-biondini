import type { ProjectLawStatusType } from "./project-law-type";

export interface ProjectLawStatusOptionType {
  value: ProjectLawStatusType;
  label: string;
}

export interface ProjectLawOptionsType {
  statuses: ProjectLawStatusOptionType[];
}