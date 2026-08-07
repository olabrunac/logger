import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Resolver de perfil por username com deduplicação de chamadas concorrentes:
// App.tsx e as páginas de perfil (Profile/MediaType/Diary/Calendar/Reviews/Lists)
// disparavam GET /login/by-username/{username} em paralelo. O cache guarda a
// promise in-flight (callers compartilham a mesma request) e é removido após o
// settle, então navegações futuras buscam dados frescos.
const userByUsernameCache = new Map<string, Promise<any>>();

export const resolveUserByUsername = (username: string) => {
  const key = encodeURIComponent(username);
  if (!userByUsernameCache.has(key)) {
    const p = api.get(`/login/by-username/${key}`).then((res) => res.data);
    const settled = p.then(
      (data) => { userByUsernameCache.delete(key); return data; },
      (err) => { userByUsernameCache.delete(key); throw err; }
    );
    userByUsernameCache.set(key, settled);
  }
  return userByUsernameCache.get(key)!;
};

const uploadApi = axios.create({
  baseURL: '/api/v1',
});

export const uploadFile = (url: string, formData: FormData) => {
  return uploadApi.post(url, formData);
};

export const deleteUpload = (userId: number, uploadType: 'banner' | 'avatar') => {
  return api.delete(`/users/${userId}/upload/${uploadType}`);
};

// Top List API
export const getTopList = (userId: number) => {
  return api.get(`/media/users/${userId}/top-list`);
};

export const createTopListItem = (userId: number, data: { media_item_id: number; position: number }) => {
  return api.post(`/media/users/${userId}/top-list`, { media_item_id: data.media_item_id, position: data.position });
};

export const updateTopListItem = (userId: number, itemId: number, data: { position: number }) => {
  return api.put(`/media/users/${userId}/top-list/${itemId}`, { position: data.position });
};

export const deleteTopListItem = (userId: number, itemId: number) => {
  return api.delete(`/media/users/${userId}/top-list/${itemId}`);
};

export const reorderTopList = (userId: number, items: { id: number; position: number }[]) => {
  return api.put(`/media/users/${userId}/top-list/reorder`, items);
};

export const getUserFavorites = (userId: number, mediaType: string) => {
  return api.get(`/media/users/${userId}/favorites`, { params: { media_type: mediaType } });
};

export const getUserWishlist = (userId: number, mediaType?: string) => {
  return api.get('/media/wishlist', { params: { user_id: userId, media_type: mediaType } });
};

// Custom Lists API
export const getUserCustomLists = (userId: number) => {
  return api.get(`/media/users/${userId}/custom-lists`);
};

export const getCustomList = (userId: number, listId: number) => {
  return api.get(`/media/users/${userId}/custom-lists/${listId}`);
};

export const createCustomList = (userId: number, data: { name: string; description?: string }) => {
  return api.post(`/media/users/${userId}/custom-lists`, data);
};

export const updateCustomList = (userId: number, listId: number, data: { name?: string; description?: string }) => {
  return api.put(`/media/users/${userId}/custom-lists/${listId}`, data);
};

export const deleteCustomList = (userId: number, listId: number) => {
  return api.delete(`/media/users/${userId}/custom-lists/${listId}`);
};

export const addCustomListItem = (userId: number, listId: number, mediaItem: { id?: number; title: string; media_type: string; tmdb_id?: number; igdb_id?: number; google_books_id?: string; cover_image_url?: string; release_date?: string; synopsis?: string }) => {
  if (mediaItem.id) {
    return api.post(`/media/users/${userId}/custom-lists/${listId}/items`, { media_item_id: mediaItem.id, position: 0 });
  }
  return api.post(`/media/users/${userId}/custom-lists/${listId}/items`, { media_item: mediaItem, position: 0 });
};

export const removeCustomListItem = (userId: number, listId: number, itemId: number) => {
  return api.delete(`/media/users/${userId}/custom-lists/${listId}/items/${itemId}`);
};

export const reorderCustomListItems = (userId: number, listId: number, itemIds: number[]) => {
  return api.post(`/media/users/${userId}/custom-lists/${listId}/reorder`, itemIds);
};

export const getUserBadges = (userId: number) => {
  return api.get(`/badges/user/${userId}`);
};

export const checkBadges = (userId: number) => {
  return api.post(`/badges/check/${userId}`);
};

export const getLogsReviewsBatch = (logIds: number[]) => {
  return api.post('/media/logs/reviews-batch', logIds);
};

// Global Search API
export const globalSearch = (query: string, userId?: number) => {
  return api.get('/search', { params: { q: query, user_id: userId } });
};

export const getPopularSearches = () => {
  return api.get('/search/popular');
};

export const trackSearch = (query: string) => {
  return api.post('/search/track', { query });
};

export const getMediaByApi = (mediaType: string, apiId: string, userId?: number) => {
  return api.get('/media/items/by-api', { params: { media_type: mediaType, api_id: apiId, user_id: userId } });
};

// Notifications API
export const getNotifications = (userId: number, limit = 50, offset = 0) => {
  return api.get(`/notifications/${userId}`, { params: { limit, offset } });
};

export const getUnreadCount = (userId: number) => {
  return api.get(`/notifications/${userId}/unread-count`);
};

export const markNotificationRead = (notificationId: number, userId: number) => {
  return api.put(`/notifications/${notificationId}/read`, null, { params: { user_id: userId } });
};

export const markAllNotificationsRead = (userId: number) => {
  return api.put(`/notifications/read-all/${userId}`);
};

// Import API
export const getImportJob = (jobId: string) => {
  return api.get(`/import/jobs/${jobId}`);
};

export const letterboxdPreview = (formData: FormData) => {
  return uploadApi.post('/import/letterboxd/preview', formData);
};

export const letterboxdImport = (userId: number, items: object[]) => {
  const formData = new FormData();
  formData.append('user_id', String(userId));
  formData.append('items_json', JSON.stringify(items));
  return uploadApi.post('/import/letterboxd/import', formData);
};

export const steamPreview = (steamId: string) => {
  return api.post('/import/steam/preview', { steam_id: steamId });
};

export const steamImport = (userId: number, steamId: string, items: object[]) => {
  const formData = new FormData();
  formData.append('user_id', String(userId));
  formData.append('steam_id', steamId);
  formData.append('items_json', JSON.stringify(items));
  return uploadApi.post('/import/steam/import', formData);
};

export const traktPreview = (formData: FormData) => {
  return uploadApi.post('/import/trakt/preview', formData);
};

export const traktImport = (userId: number, items: object[]) => {
  const formData = new FormData();
  formData.append('user_id', String(userId));
  formData.append('items_json', JSON.stringify(items));
  return uploadApi.post('/import/trakt/import', formData);
};

// TV Time Import API
export const tvtimePreview = (formData: FormData) => {
  return uploadApi.post('/import/tvtime/preview', formData);
};

export const tvtimeImport = (userId: number, items: object[], zipFile: File) => {
  const formData = new FormData();
  formData.append('user_id', String(userId));
  formData.append('items_json', JSON.stringify(items));
  formData.append('raw_zip', zipFile);
  return uploadApi.post('/import/tvtime/import', formData);
};

export default api;
