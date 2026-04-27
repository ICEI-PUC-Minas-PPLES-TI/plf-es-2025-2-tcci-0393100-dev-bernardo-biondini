import type { CmsSectionType } from "./cms-section-type";
import type { NewsType } from "../news/news-type";
import type { SiteProjectType } from "../site-project/site-project-type";

export interface CmsPublicOverviewType {
  sections: CmsSectionType[];
  news: NewsType[];
  site_projects: SiteProjectType[];
}
