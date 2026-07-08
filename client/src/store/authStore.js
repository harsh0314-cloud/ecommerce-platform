import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (data) => {
        const response = await api.post('/auth/login', data);
        
        // BULLETPROOF CHECK: Look for the token in either the raw response OR the unwrapped response
        const token = response?.data?.token || response?.token;
        const user = response?.data?.user || response?.user;

        if (token && token !== 'undefined') {
          localStorage.setItem('token', token);
          set({ user, isAuthenticated: true });
        } else {
          console.error("Token extraction failed. Response:", response);
          throw new Error("Failed to save authentication token.");
        }
      },
      
      register: async (data) => {
        const response = await api.post('/auth/register', data);
        
        const token = response?.data?.token || response?.token;
        const user = response?.data?.user || response?.user;

        if (token && token !== 'undefined') {
          localStorage.setItem('token', token);
          set({ user, isAuthenticated: true });
        } else {
          console.error("Token extraction failed. Response:", response);
          throw new Error("Failed to save authentication token.");
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const user = response?.data?.user || response?.user;
          set({ user, isAuthenticated: true });
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, isAuthenticated: false });
        }
      }
    }),
    { name: 'auth-storage' }
  )
);

export default useAuthStore;