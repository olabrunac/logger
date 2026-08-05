export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${window.location.origin}${url}`;
}

export function apiBaseUrl(): string {
  return '/api/v1';
}

import type { MediaItem } from './types/media';
import type { LogEntry } from './types';

export function getApiId(item: MediaItem): string {
  if (item.steam_appid) return String(item.steam_appid);
  if (item.igdb_id) return String(item.igdb_id);
  if (item.tmdb_id) return String(item.tmdb_id);
  if (item.google_books_id) return item.google_books_id;
  return String(item.id!);
}

export function findBestLogForMedia(mediaId: number | undefined, logs: LogEntry[]): LogEntry | undefined {
  if (!mediaId) return undefined;
  const mediaLogs = logs.filter(l => l.media_item.id === mediaId);
  if (mediaLogs.length === 0) return undefined;
  return [...mediaLogs].sort((a, b) => {
    const aFav = !!a.is_favorite;
    const bFav = !!b.is_favorite;
    if (aFav !== bFav) return aFav ? -1 : 1;
    const aActive = a.status !== 'wishlist' && a.status !== 'soon';
    const bActive = b.status !== 'wishlist' && b.status !== 'soon';
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.id - a.id;
  })[0];
}

export function getLogUrl(item: MediaItem): string {
  return `/log/${item.media_type}/${getApiId(item)}`;
}

export function getMediaUrl(item: MediaItem): string {
  return `/media/${item.media_type}/${getApiId(item)}`;
}
