import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null, // ADD TOKEN TO STATE
      isAuthenticated: false,
      
      login: async (data) => {
        const response = await api.post('/auth/login', data);
        // The Axios interceptor already unwraps response.data.data, so we just use response.data
        const token = response?.token;
        const user = response?.user;

        if (token && token !== 'undefined') {
          set({ token, user, isAuthenticated: true }); // Zustand persist handles saving to localStorage automatically
        } else {
          throw new Error("Failed to save authentication token.");
        }
      },
      
      register: async (data) => {
        const response = await api.post('/auth/register', data);
        const token = response?.token;
        const user = response?.user;

        if (token && token !== 'undefined') {
          set({ token, user, isAuthenticated: true });
        } else {
          throw new Error("Failed to save authentication token.");
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false }); // Clears everything cleanly
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const user = response?.user;
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ token: null, user: null, isAuthenticated: false }); // Clear token too on failure
        }
      }
    }),
    { 
      name: 'auth-storage',
      // ONLY persist these specific fields to localStorage
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }) 
    }
  )
);

export default useAuthStore;