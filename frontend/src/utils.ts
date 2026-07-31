export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${window.location.origin}${url}`;
}

export function apiBaseUrl(): string {
  return '/api/v1';
}

import type { MediaItem } from './types/media';

export function getApiId(item: MediaItem): string {
  if (item.steam_appid) return String(item.steam_appid);
  if (item.igdb_id) return String(item.igdb_id);
  if (item.tmdb_id) return String(item.tmdb_id);
  if (item.google_books_id) return item.google_books_id;
  return String(item.id!);
}

export function getLogUrl(item: MediaItem): string {
  return `/log/${item.media_type}/${getApiId(item)}`;
}
