import { useState, useEffect, useCallback } from 'react';
const KEY = 'storex-wishlist';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export default function useWishlist() {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener('wishlist-updated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('wishlist-updated', sync); window.removeEventListener('storage', sync); };
  }, []);
  const persist = (next) => { localStorage.setItem(KEY, JSON.stringify(next)); setItems(next); window.dispatchEvent(new Event('wishlist-updated')); };
  const isWishlisted = useCallback((id) => items.some((i) => i.id === id), [items]);
  const toggle = useCallback((product) => {
    const exists = read().some((i) => i.id === product.id);
    const next = exists ? read().filter((i) => i.id !== product.id)
      : [...read(), { id: product.id, name: product.name, slug: product.slug, price: product.price, comparePrice: product.comparePrice, image: product.images?.[0]?.url, category: product.category?.name }];
    persist(next);
    return !exists;
  }, []);
  const remove = useCallback((id) => persist(read().filter((i) => i.id !== id)), []);
  return { items, count: items.length, isWishlisted, toggle, remove };
}