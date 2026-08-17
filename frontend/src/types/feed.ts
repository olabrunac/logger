import type { MediaItem } from './media';

export interface PostImage {
  id: number;
  url: string;
  is_gif: boolean;
  position: number;
}

export interface PostReply {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  images: PostImage[];
  replies_count: number;
  likes_count: number;
  is_liked: boolean;
  liked_by: { username: string; avatar_url?: string }[];
  created_at: string;
  _type: 'post';
}

export interface GroupItem {
  id: number;
  title: string;
  media_type?: string;
  cover_image_url?: string;
  tmdb_id?: number;
  igdb_id?: number;
  steam_appid?: number;
  google_books_id?: string;
  status?: string;
}

export interface TimelineEntry {
  id: number;
  user: { id: number; username: string; avatar_url?: string } | null;
  media_item: MediaItem | null;
  status: string | null;
  rating: number | null;
  review: string | null;
  platform: string | null;
  log_date: string | null;
  is_favorite: boolean | null;
  hours_spent: number | null;
  family_share?: boolean;
  group_count?: number;
  group_items?: GroupItem[];
  replies_count?: number;
  likes_count?: number;
  is_liked?: boolean;
  liked_by?: { username: string; avatar_url?: string }[];
  _type: 'log';
}

export interface EpisodeTimelineEvent {
  id: string | number;
  user: { id: number; username: string; avatar_url?: string } | null;
  media_item: MediaItem | null;
  event_type: 'watched' | 'reviewed';
  season_number: number;
  episode_start: number;
  episode_end: number;
  review_text?: string | null;
  rating?: number | null;
  created_at: string;
  log_date: string | null;
  replies_count?: number;
  likes_count?: number;
  is_liked?: boolean;
  liked_by?: { username: string; avatar_url?: string }[];
  _type: 'episode_event';
}

export type FeedItem = Post | TimelineEntry | EpisodeTimelineEvent;
