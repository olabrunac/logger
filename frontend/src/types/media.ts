export const enum MediaType {
  Movie = "movie",
  Series = "series",
  Game = "game",
  Book = "book",
}

export interface MediaItem {
  id?: number; // Made optional as it might not exist on creation from search
  tmdb_id?: number;
  igdb_id?: number;
  title: string;
  media_type: MediaType;
  cover_image_url?: string;
  release_date?: string;
  synopsis?: string;
}

