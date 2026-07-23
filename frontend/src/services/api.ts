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

export default api;
