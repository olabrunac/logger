import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const uploadApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
});

export const uploadFile = (url: string, formData: FormData) => {
  return uploadApi.post(url, formData);
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

export const addCustomListItem = (userId: number, listId: number, mediaItemId: number) => {
  return api.post(`/media/users/${userId}/custom-lists/${listId}/items`, { media_item_id: mediaItemId, position: 0 });
};

export const removeCustomListItem = (userId: number, listId: number, itemId: number) => {
  return api.delete(`/media/users/${userId}/custom-lists/${listId}/items/${itemId}`);
};

export const reorderCustomListItems = (userId: number, listId: number, itemIds: number[]) => {
  return api.post(`/media/users/${userId}/custom-lists/${listId}/reorder`, itemIds);
};

export default api;
