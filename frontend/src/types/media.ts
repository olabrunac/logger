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
  steam_appid?: number;
  google_books_id?: string;
  title: string;
  media_type: MediaType;
  cover_image_url?: string;
  release_date?: string;
  synopsis?: string;
  genres?: string;
  header_image?: string;
  metacritic_score?: number;
  steam_genres?: string;
  steam_categories?: string;
  steam_price?: string;
  screenshots?: string;
  pc_requirements?: string;
  short_description?: string;
  backdrop_url?: string;
  runtime?: number;
  vote_average?: number;
  director?: string;
  trailer_url?: string;
  page_count?: number;
  publisher?: string;
  book_categories?: string;
  book_language?: string;
  book_rating?: number;
}