import axios from 'axios';

const make = (tokenKey) => {
  const instance = axios.create({ baseURL: '/api' });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem(tokenKey);
        const path = tokenKey === 'vendorToken' ? '/vendor/login' : '/admin/login';
        window.location.href = path;
      }
      return Promise.reject(err);
    }
  );

  return instance;
};

export const adminApi = make('adminToken');
export const vendorApi = make('vendorToken');
