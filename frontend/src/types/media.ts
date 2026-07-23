export type MediaType = "movie" | "series" | "game" | "book";

export const MediaTypeValues: MediaType[] = [
  "movie",
  "series",
  "game",
  "book"
];

export interface MediaItem {
  id?: number;
  tmdb_id?: number;
  igdb_id?: number;
  title: string;
  media_type: MediaType;
  cover_image_url?: string;
  release_date?: string;
  synopsis?: string;
  genres?: string[];
}