import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const KEY = 'storex-wishlist';

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } 
  catch { return []; }
};

const saveLocal = (items) => {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('wishlist-updated'));
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
      // Avoid synchronous setState during render/effect — schedule for next tick
      const t = setTimeout(() => setItems(readLocal()), 0);
      return () => clearTimeout(t);
    }
    
    const fetchWishlist = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/wishlist');
        const backendItems = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || res.data?.items || []);

        const formatted = backendItems.map(item => ({
          id: item.product?.id || item.productId || item.id,
          name: item.product?.name || item.name,
          slug: item.product?.slug || item.slug,
          price: item.product?.price || item.price,
          comparePrice: item.product?.comparePrice || item.comparePrice,
          image: item.product?.images?.[0]?.url || item.image,
          category: item.product?.category?.name || item.category,
          wishlistId: item.id,
        })).filter(item => item.id);

        setItems(formatted);
        saveLocal(formatted);
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

  const isWishlisted = useCallback((id) => {
    return items.some((i) => i.id === id);
  }, [items]);

  const toggle = useCallback(async (product) => {
    // Check against CURRENT state (not re-reading from localStorage)
    const exists = items.some((i) => i.id === product.id);

    let next;
    if (exists) {
      // REMOVE
      next = items.filter((i) => i.id !== product.id);
    } else {
      // ADD
      next = [...items, { 
        id: product.id, 
        name: product.name, 
        slug: product.slug, 
        price: product.price, 
        comparePrice: product.comparePrice, 
        image: product.images?.[0]?.url || product.image, 
        category: product.category?.name || product.category
      }];
    }

    // Update state immediately
    setItems(next);
    saveLocal(next);

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
        // Revert on error
        setItems(items);
        saveLocal(items);
        return exists; // Return original state on error
      }
    }

    // Return true if item was ADDED, false if REMOVED
    return !exists;
  }, [items]);

  const remove = useCallback(async (id) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveLocal(next);

    // Sync with backend
    if (isLoggedIn()) {
      try {
        await api.delete(`/wishlist/${id}`);
      } catch (err) {
        console.error('Backend wishlist remove failed:', err.message);
        setItems(items);
        saveLocal(items);
      }
    }
  }, [items]);

  const clear = useCallback(() => {
    setItems([]);
    saveLocal([]);
    if (isLoggedIn()) {
      // Optionally clear all backend wishlist items one by one
    }
  }, []);

  return { items, count: items.length, isWishlisted, toggle, remove, clear, isLoading, isSynced };
}