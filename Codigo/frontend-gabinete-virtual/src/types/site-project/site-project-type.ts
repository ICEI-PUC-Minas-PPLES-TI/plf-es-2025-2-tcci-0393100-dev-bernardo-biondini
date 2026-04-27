import type { CityType } from "../city/city-type";
import type { NewsAuthorType } from "../news/news-type";

export type SiteProjectStatusType = "planned" | "in_progress" | "completed";

export interface SiteProjectType {
  id: number;
  title: string;
  description: string;
  status: SiteProjectStatusType;
  city_id: number;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  city: CityType;
  author: NewsAuthorType;
}
