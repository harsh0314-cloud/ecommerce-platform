import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const KEY = 'storex-wishlist';

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } 
  catch { return []; }
};

export default function useWishlist() {
  const [items, setItems] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Check if user is logged in
  const isLoggedIn = () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return false;
      const parsed = JSON.parse(authStorage);
      return !!parsed?.state?.token;
    } catch { return false; }
  };

  // Load from backend on mount (if logged in)
  useEffect(() => {
    if (!isLoggedIn()) {
      setItems(readLocal());
      return;
    }

    const fetchWishlist = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/wishlist');
        // After interceptor: response.data is the array directly
        // Before interceptor or if interceptor didn't fire: res.data.data or res.data.items
        const backendItems = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || res.data?.items || []);

        // Transform to local format
        const formatted = backendItems.map(item => ({
          id: item.product?.id || item.productId,
          name: item.product?.name,
          slug: item.product?.slug,
          price: item.product?.price,
          comparePrice: item.product?.comparePrice,
          image: item.product?.images?.[0]?.url || item.product?.image,
          category: item.product?.category?.name,
          wishlistId: item.id,
        })).filter(item => item.id); // Remove any invalid items

        setItems(formatted);
        localStorage.setItem(KEY, JSON.stringify(formatted));
        setIsSynced(true);
      } catch (err) {
        console.warn('Backend wishlist fetch failed, using local:', err.message);
        setItems(readLocal());
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  // Sync when localStorage changes in other tabs
  useEffect(() => {
    const sync = () => setItems(readLocal());
    window.addEventListener('wishlist-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('wishlist-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const persist = (next) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setItems(next);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const isWishlisted = useCallback((id) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback(async (product) => {
    const exists = items.some((i) => i.id === product.id);
    const next = exists 
      ? items.filter((i) => i.id !== product.id)
      : [...items, { 
          id: product.id, 
          name: product.name, 
          slug: product.slug, 
          price: product.price, 
          comparePrice: product.comparePrice, 
          image: product.images?.[0]?.url || product.image, 
          category: product.category?.name || product.category
        }];

    persist(next);

    // Sync with backend if logged in
    if (isLoggedIn()) {
      try {
        if (exists) {
          await api.delete(`/wishlist/${product.id}`);
        } else {
          await api.post('/wishlist', { productId: product.id });
        }
      } catch (err) {
        console.error('Backend wishlist sync failed:', err.message);
        // Optionally: revert local state on error
      }
    }

    return !exists;
  }, [items]);

  const remove = useCallback(async (id) => {
    const next = items.filter((i) => i.id !== id);
    persist(next);

    // Sync with backend
    if (isLoggedIn()) {
      try {
        await api.delete(`/wishlist/${id}`);
      } catch (err) {
        console.error('Backend wishlist remove failed:', err.message);
      }
    }
  }, [items]);

  const clear = useCallback(() => {
    persist([]);
    if (isLoggedIn()) {
      // Optionally clear all backend wishlist items one by one
      // Or add a bulk delete endpoint
    }
  }, []);

  return { items, count: items.length, isWishlisted, toggle, remove, clear, isLoading, isSynced };
}