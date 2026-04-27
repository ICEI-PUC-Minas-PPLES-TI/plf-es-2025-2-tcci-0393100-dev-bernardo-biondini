export interface NewsAuthorType {
  id: number;
  name: string;
}

export interface NewsType {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  author: NewsAuthorType;
}
