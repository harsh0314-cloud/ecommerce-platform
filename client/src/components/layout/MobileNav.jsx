import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import useWishlist from '../../hooks/useWishlist';

export default function MobileNav() {
  const location = useLocation();
  const cartItems = useCartStore((s) => s.items);
  const { count } = useWishlist();

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/products', icon: Search, label: 'Shop' },
    { to: '/wishlist', icon: Heart, label: 'Saved', badge: count },
    { to: '/cart', icon: ShoppingBag, label: 'Bag', badge: cartItems.length },
    { to: '/profile', icon: User, label: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-white/90 px-2 py-2 backdrop-blur-xl lg:hidden" data-testid="mobile-bottom-nav">
      {links.map((link) => {
        const active = location.pathname === link.to;
        return (
          <Link key={link.to} to={link.to} data-testid={`mnav-${link.label.toLowerCase()}`} className={`relative flex flex-col items-center gap-1 px-3 py-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
            <link.icon size={20} strokeWidth={active ? 2.4 : 1.6} />
            {link.badge > 0 && <span className="absolute right-1.5 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-white">{link.badge}</span>}
            <span className="text-[9px] font-semibold uppercase tracking-luxe-sm">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
