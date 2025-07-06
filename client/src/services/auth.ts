import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const authAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Important for session cookies
});

export interface User {
  id: number;
  username: string;
  email?: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

export const authApi = {
  // Login with username/password
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await authAxios.post('/auth/login', credentials);
    return response.data;
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await authAxios.post('/auth/register', userData);
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await authAxios.get('/auth/user');
    return response.data;
  },

  // Logout
  logout: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await authAxios.post('/auth/logout');
    return response.data;
  },

  // Check authentication status
  getAuthStatus: async (): Promise<AuthStatus> => {
    const response = await authAxios.get('/auth/status');
    return response.data;
  }
};
