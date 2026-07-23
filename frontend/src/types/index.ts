export interface User {
  id: number;
  username: string;
  banner_url?: string;
  avatar_url?: string;
  accent_color?: string;
  section_order?: string;
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
  platform?: string;
  hours_spent?: number;
  review?: string;
  status: LogStatus;
}

export * from './media';