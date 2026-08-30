import { supabase } from './supabase';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env['VITE_API_BASE_URL'];
  if (envUrl) return envUrl;
  
  // Auto-detect production backend fallback when running on Vercel (same-origin /api)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return '/api';
  }
  
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Global fetch wrapper with automatic auth header injection
const request = async <T>(
  method: string,
  endpoint: string,
  body?: any,
  isMultipart: boolean = false
): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (response.status === 204) {
      return {} as T;
    }

    const payload = await response.json();
    
    if (!response.ok) {
      throw new Error(payload.error?.message || `HTTP error! Status: ${response.status}`);
    }

    return payload.success ? payload.data : payload;
  } catch (error) {
    console.error(`API Request failed [${method} ${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: any) => request<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body?: any) => request<T>('PUT', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
  
  // Multipart upload helpers
  uploadImage: <T>(productId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>('POST', `/products/${productId}/image`, formData, true);
  },
  
  enhanceImage: <T>(productId: string, file?: File) => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return request<T>('POST', `/products/${productId}/enhance-image`, formData, true);
  },
  
  uploadVoice: <T>(productId: string, file: File, language?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (language) {
      formData.append('language', language);
    }
    return request<T>('POST', `/products/${productId}/voice`, formData, true);
  }
};
