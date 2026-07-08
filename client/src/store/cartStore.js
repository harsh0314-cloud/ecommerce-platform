import { create } from 'zustand';
import api from '../services/api';

export const useCartStore = create((set, get) => ({
  items: [],
  total: 0,
  
  fetchCart: async () => {
    try {
      const res = await api.get('/cart');
      const cartItems = res.data.cart.items || [];
      const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
      set({ items: cartItems, total });
    } catch (error) {
      console.error("Failed to fetch cart", error);
    }
  },

  addToCart: async (productId, quantity = 1) => {
    try {
      await api.post('/cart', { productId, quantity });
      get().fetchCart(); 
    } catch (error) {
      console.error("Failed to add to cart", error);
      throw error;
    }
  },

  updateQuantity: async (itemId, newQuantity) => {
    try {
      await api.patch(`/cart/${itemId}`, { quantity: newQuantity });
      get().fetchCart();
    } catch (error) {
      console.error("Failed to update quantity", error);
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      get().fetchCart();
    } catch (error) {
      console.error("Failed to remove item", error);
    }
  },

  // NEW: Clear entire cart
  clearCart: async () => {
    try {
      await api.delete('/cart/clear');
      set({ items: [], total: 0 }); // Instantly empty UI without waiting for fetch
    } catch (error) {
      console.error("Failed to clear cart", error);
    }
  }
}));

export default useCartStore;