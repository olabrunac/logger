import type { MediaItem } from './media';

export interface User {
  id: number;
  username: string;
  email?: string;
  banner_url?: string;
  avatar_url?: string;
  accent_color?: string;
  section_order?: string;
  followers_count?: number;
  following_count?: number;
}


export type LogStatus = 
  | "in_progress"
  | "completed"
  | "dropped"
  | "wishlist"
  | "soon"
  | "platinated";

export const LogStatusValues: LogStatus[] = [
  "in_progress",
  "completed",
  "dropped",
  "wishlist",
  "soon",
  "platinated"
];


export interface LogEntry {
  id: number;
  user_id: number;
  media_item: import('./media').MediaItem;
  log_date: string;
  rating?: number;
  is_favorite?: boolean;
  is_relog?: boolean;
  relog_count?: number;
  platform?: string;
  hours_spent?: number;
  pages_read?: number;
  review?: string;
  status: LogStatus;
  watched_episodes?: number;
  total_episodes?: number;
  unlocked_achievements?: number;
  total_achievements?: number;
}

export * from './media';

export interface TopListItem {
  id: number;
  user_id: number;
  media_item_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  media_item?: MediaItem;
}

export interface TopListItemCreate {
  media_item_id: number;
  position: number;
}

export interface TopListItemUpdate {
  position?: number;
}

export interface LogReview {
  id: number;
  log_id: number;
  review_text?: string;
  rating?: number;
  platform?: string;
  created_at: string;
}

export interface CustomListItem {
  id: number;
  custom_list_id: number;
  media_item_id: number;
  position: number;
  added_at: string;
  media_item?: MediaItem;
}

export interface CustomList {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  items: CustomListItem[];
}

export interface UserBadge {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  unlocked_at: string;
}

export interface BadgeProgress {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  current: number;
  target: number;
}

export interface BadgeResponse {
  unlocked: UserBadge[];
  next_milestones: BadgeProgress[];
}