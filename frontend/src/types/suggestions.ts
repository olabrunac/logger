import type { MediaItem } from './media';

export interface SuggestionItem {
  media: MediaItem;
  match_genres: string[];
  in_wishlist: boolean;
  score: number;
}

export interface IncompleteEntry {
  log_id: number;
  status: string;
  log_date?: string;
  rating?: number | null;
  is_favorite?: boolean;
  platform?: string | null;
  hours_spent?: number | null;
  media: MediaItem;
  watched_episodes?: number;
  total_episodes?: number;
  unlocked_achievements?: number;
  total_achievements?: number;
  pages_read?: number;
  page_count?: number;
  remaining?: number;
  percent?: number;
}

export interface WhatToDoResponse {
  genres: { genre: string; media_type: string; weight: number }[];
  suggestions: SuggestionItem[];
  incomplete: {
    series: IncompleteEntry[];
    games: IncompleteEntry[];
    books: IncompleteEntry[];
  };
}
