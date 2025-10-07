/**
 * Axios Configuration with Authentication Interceptors
 * 
 * Provides centralized HTTP client configuration with automatic token handling,
 * request/response interceptors, and auto-logout on 401 responses.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { clearAuthStorage } from './authStorage';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SUPABASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Info': 'classroom-app'
  }
});

// Request interceptor to add auth headers
axiosInstance.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and auto-logout
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Received 401, attempting auto-logout...');
      
      try {
        // Clear all auth storage
        clearAuthStorage();
        
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        
        return Promise.reject(error);
      } catch (logoutError) {
        console.error('Error during auto-logout:', logoutError);
        return Promise.reject(error);
      }
    }
    
    // Handle other errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
    } else if (error.response?.status >= 400) {
      console.error('Client error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Export configured axios instance
export default axiosInstance;

// Export types for use in other modules
export type { AxiosRequestConfig, AxiosResponse, AxiosError };
