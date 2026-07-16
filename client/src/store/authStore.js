import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null, 
      isAuthenticated: false,
      
      login: async (data) => {
        const response = await api.post('/auth/login', data);
        
        // The interceptor unwraps the backend envelope, so it's inside response.data
        const token = response?.data?.token;
        const user = response?.data?.user;

        if (token && token !== 'undefined') {
          set({ token, user, isAuthenticated: true }); 
        } else {
          console.error("Token extraction failed. Response:", response.data);
          throw new Error("Failed to save authentication token.");
        }
      },
      
      register: async (data) => {
        const response = await api.post('/auth/register', data);
        const token = response?.data?.token;
        const user = response?.data?.user;

        if (token && token !== 'undefined') {
          set({ token, user, isAuthenticated: true });
        } else {
          console.error("Token extraction failed. Response:", response.data);
          throw new Error("Failed to save authentication token.");
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false }); 
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const user = response?.data?.user;
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ token: null, user: null, isAuthenticated: false }); 
        }
      }
    }),
    { 
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }) 
    }
  )
);

export default useAuthStore;