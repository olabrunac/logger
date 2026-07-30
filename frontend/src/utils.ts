export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${window.location.origin}${url}`;
}

export function apiBaseUrl(): string {
  return '/api/v1';
}
