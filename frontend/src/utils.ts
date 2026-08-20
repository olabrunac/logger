export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  if (url.startsWith('http')) return url;
  return `${window.location.origin}${url}`;
}

export function bannerPosition(position: string | null | undefined): string {
  if (!position) return 'center';
  const [x, y] = position.split(/\s+/).map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'center';
  return `${x}% ${y}%`;
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

export function sortLogsByDate(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => {
    const aList = a.status === 'wishlist' || a.status === 'soon';
    const bList = b.status === 'wishlist' || b.status === 'soon';
    if (aList !== bList) return aList ? 1 : -1;
    const aDate = a.created_at ? parseServerDate(a.created_at).getTime() : (a.log_date ? parseServerDate(a.log_date).getTime() : 0);
    const bDate = b.created_at ? parseServerDate(b.created_at).getTime() : (b.log_date ? parseServerDate(b.log_date).getTime() : 0);
    if (bDate !== aDate) return bDate - aDate;
    return b.id - a.id;
  });
}

export function isInGameLibrary(log: LogEntry): boolean {
  return log.media_item?.media_type === 'game' && log.status !== 'wishlist' && log.status !== 'soon';
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

export function parseServerDate(dateStr: string | number | null | undefined): Date {
  if (!dateStr) return new Date(0);
  if (typeof dateStr === 'number') return new Date(dateStr);
  const str = /(?:Z|[+-]\d{2}:\d{2})$/i.test(dateStr) ? dateStr : dateStr + 'Z';
  return new Date(str);
}

export function timeAgo(dateStr: string | number | null | undefined): string {
  const diff = Date.now() - parseServerDate(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatHours(hours: number | null | undefined): string | null {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return null;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export function hoursToInput(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return '';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export function parseHoursInput(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const minMatch = v.match(/^(\d+)\s*m(?:in)?$/);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (!Number.isFinite(mins) || mins < 0) return null;
    return Math.round((mins / 60) * 10000) / 10000;
  }
  const hourMatch = v.match(/^(\d+)h(?:\s*(\d{1,2})m?)?$/);
  if (hourMatch) {
    const h = Number(hourMatch[1]);
    const m = hourMatch[2] != null ? Number(hourMatch[2]) : 0;
    if (!Number.isFinite(h) || h < 0) return null;
    if (m < 0 || m >= 60) return null;
    return Math.round((h + m / 60) * 10000) / 10000;
  }
  return null;
}
