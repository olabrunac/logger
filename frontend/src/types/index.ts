import type { MediaItem } from './media';

export interface User {
  id: number;
  username: string;
  email?: string;
  created_at?: string;
  banner_url?: string;
  banner_position?: string;
  avatar_url?: string;
  accent_color?: string;
  section_order?: string;
  feed_tabs_order?: string;
  social_links?: string;
  country?: string;
  state?: string;
  display_name?: string;
  bio?: string;
  trophy_showcase?: string;
  birth_date?: string;
  birth_date_updated_at?: string;
  profile_public?: boolean;
  show_game_library?: boolean;
  show_achievements?: boolean;
  show_hours?: boolean;
  show_stats?: boolean;
  followers_count?: number;
  following_count?: number;
}

export interface SocialLink {
  label: string;
  url: string;
}


export type LogStatus = 
  | "in_progress"
  | "completed"
  | "dropped"
  | "wishlist"
  | "soon"
  | "platinated"
  | "library";

export const LogStatusValues: LogStatus[] = [
  "in_progress",
  "completed",
  "dropped",
  "wishlist",
  "soon",
  "platinated",
  "library"
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
  family_share?: boolean;
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

export interface UserAchievement {
  id: number;
  log_id: number;
  external_id: string;
  name: string;
  description?: string;
  image_url?: string;
  game_title: string;
  game_cover?: string;
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  from_user_id?: number;
  from_username?: string;
  from_avatar_url?: string;
  post_id?: number;
  post_content?: string;
  reply_content?: string;
  badge_key?: string;
  badge_title?: string;
  badge_icon?: string;
  badge_rarity?: string;
  badge_description?: string;
  read: boolean;
  created_at: string;
}