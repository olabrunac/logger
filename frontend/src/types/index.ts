export interface User {
  id: number;
  username: string;
}



export const enum LogStatus {
  InProgress = "in_progress",
  Completed = "completed",
  Dropped = "dropped",
  Wishlist = "wishlist",
  Soon = "soon",
  Platinated = "platinated",
}



export interface LogEntry {
  id: number;
  user_id: number;
  media_item: MediaItem;
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
