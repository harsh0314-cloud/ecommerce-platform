import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, Heart, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import useWishlist from '../../hooks/useWishlist';
import CartDrawer from '../CartDrawer';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/products' },
  { label: 'New', to: '/products?sort=newest' },
  { label: 'Sale', to: '/products?sort=price-desc' },
];

const ease = [0.76, 0, 0.24, 1];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchTrigger, setMobileSearchTrigger] = useState(false); // NEW STATE
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchCart(); }, [isAuthenticated]);

  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener('open-cart', open);
    return () => window.removeEventListener('open-cart', open);
  }, []);

  // NEW EFFECT: Listen for Mobile Nav Search Tap
  useEffect(() => {
    const openSearch = () => setMobileSearchTrigger(true);
    window.addEventListener('open-search', openSearch);
    return () => window.removeEventListener('open-search', openSearch);
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); setMobileSearchTrigger(false); }, [location.pathname, location.search]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) { navigate(`/products?search=${encodeURIComponent(query.trim())}`); setQuery(''); setSearchOpen(false); setMobileSearchTrigger(false); }
  };

  const dark = transparent;
  const iconBtn = `relative flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60`;

  // Combined state for Search Overlay
  const isSearchVisible = searchOpen || mobileSearchTrigger;
  const closeSearch = () => { setSearchOpen(false); setMobileSearchTrigger(false); };

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${transparent ? 'bg-transparent' : 'border-b border-border bg-white/80 backdrop-blur-xl'}`}
        data-testid="site-header"
      >
        <div className="container-luxe">
          <div className={`flex items-center justify-between lg:grid lg:grid-cols-3 transition-all duration-500 ${scrolled ? 'h-16' : 'h-20'} ${dark ? 'text-white' : 'text-foreground'}`}>
            {/* Left nav (desktop) */}
            <nav className="hidden flex-1 items-center gap-8 lg:flex">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} data-testid={`nav-${n.label.toLowerCase()}`} className="link-underline text-[12px] font-semibold uppercase tracking-luxe-sm">{n.label}</Link>
              ))}
            </nav>

            {/* Mobile menu btn */}
            <button onClick={() => setMenuOpen(true)} data-testid="mobile-menu-open" className="lg:hidden"><Menu size={22} /></button>

            {/* Logo */}
            <Link to="/" data-testid="logo" className="flex-1 text-center lg:flex-none lg:col-start-2 lg:justify-self-center font-display text-lg font-extrabold uppercase tracking-[0.2em] md:text-2xl md:tracking-[0.3em]">
              StoreX
            </Link>

            {/* Right icons */}
            <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-2">
              <button onClick={() => setSearchOpen(true)} data-testid="search-open" className={iconBtn} aria-label="Search"><Search size={19} /></button>
              <Link to="/wishlist" data-testid="wishlist-link" className={iconBtn} aria-label="Wishlist">
                <Heart size={19} />
                {wishCount > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white">{wishCount}</span>}
              </Link>
              <button onClick={() => setCartOpen(true)} data-testid="cart-open" className={iconBtn} aria-label="Cart">
                <ShoppingBag size={19} />
                {cartItems.length > 0 && <span className="absolute right-0.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-white ring-1 ring-white">{cartItems.length}</span>}
              </button>
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link to={user?.role === 'ADMIN' ? '/admin' : '/profile'} data-testid="account-link" className={iconBtn} aria-label="Account"><User size={19} /></Link>
                  <button onClick={() => { logout(); navigate('/'); }} data-testid="logout-btn" className="link-underline text-[11px] font-semibold uppercase tracking-luxe-sm">Logout</button>
                </div>
              ) : (
                <Link to="/login" data-testid="signin-link" className="link-underline ml-1 hidden text-[11px] font-semibold uppercase tracking-luxe-sm md:block">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[80] bg-white" data-testid="search-overlay">
            <div className="container-luxe pt-8">
              <div className="flex justify-end"><button onClick={closeSearch} data-testid="search-close" className="transition-transform hover:rotate-90"><X size={24} /></button></div>
              <motion.form onSubmit={submitSearch} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.6, ease }} className="mx-auto mt-[12vh] max-w-3xl">
                <p className="overline mb-6 text-muted-foreground">Search the collection</p>
                <div className="flex items-center gap-4 border-b-2 border-foreground pb-4">
                  <Search size={28} />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} data-testid="search-input" placeholder="What are you looking for?" className="w-full border-0 bg-transparent p-0 font-display text-3xl font-semibold tracking-tight placeholder:text-muted-foreground focus:ring-0" />
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  {['Hoodies', 'Jackets', 'Sneakers', 'Trousers'].map((t) => (
                    <button key={t} type="button" onClick={() => { navigate(`/products?search=${t}`); closeSearch(); }} className="border border-border px-5 py-2 text-xs uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">{t}</button>
                  ))}
                </div>
              </motion.form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-foreground text-white" data-testid="mobile-menu">
            <div className="container-luxe flex h-20 items-center justify-between">
              <span className="font-display text-2xl font-extrabold uppercase tracking-[0.3em]">StoreX</span>
              <button onClick={() => setMenuOpen(false)} data-testid="mobile-menu-close"><X size={24} /></button>
            </div>
            <nav className="container-luxe mt-10 flex flex-col gap-2">
              {NAV.map((n, i) => (
                <motion.div key={n.label} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.07 }}>
                  <Link to={n.to} className="font-display text-5xl font-bold tracking-tight">{n.label}</Link>
                </motion.div>
              ))}
              <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-8 text-sm uppercase tracking-luxe-sm">
                <Link to="/wishlist">Wishlist ({wishCount})</Link>
                {isAuthenticated ? (
                  <>
                    <Link to="/profile">My Account</Link>
                    <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }} className="text-left">Logout</button>
                  </>
                ) : <Link to="/login">Sign In</Link>}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}