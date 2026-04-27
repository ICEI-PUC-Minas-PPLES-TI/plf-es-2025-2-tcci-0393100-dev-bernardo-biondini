export type CmsSectionKeyType =
  | "deputy_name"
  | "deputy_role"
  | "hero_title"
  | "hero_summary"
  | "hero_image_url"
  | "hero_image_alt"
  | "biography"
  | "priorities"
  | "quote"
  | "mission"
  | "trajectory";

export interface CmsSectionType {
  id: number;
  key: CmsSectionKeyType;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
