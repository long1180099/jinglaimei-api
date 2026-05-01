/**
 * 统一 HTTP 客户端
 * 所有请求通过 setupProxy.js 代理到 localhost:4000
 * 注意：响应拦截器已解包 data.data，调用方直接拿到后端 data 字段内容
 */
import axios, { AxiosInstance } from 'axios';

const _client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动带上 token
_client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一处理
_client.interceptors.response.use(
  (response): any => {
    const data = response.data;
    if (data.code === 0) {
      return data.data; // 直接返回 data 字段
    }
    return Promise.reject(new Error(data.message || '请求失败'));
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);

// 导出为 any，因为拦截器已解包 data.data，调用方拿到的不再是 AxiosResponse
export default _client as any;
