import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { fmtPrice } from '../components/ProductCard';

export default function Cart() {
  const { items, total, fetchCart, removeItem, updateQuantity, clearCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  if (items.length === 0) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <ShoppingBag size={44} strokeWidth={1} className="text-muted-foreground" />
        <h1 className="font-display text-4xl font-bold tracking-tight">Your bag is empty</h1>
        <p className="max-w-sm text-muted-foreground">You haven’t added anything yet. Explore the collection and find your next essential.</p>
        <Link to="/products" data-testid="cart-shop-link" className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-luxe py-14">
      <h1 className="mb-12 font-display text-5xl font-bold tracking-tight sm:text-6xl">Shopping Bag</h1>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-6 border-b border-border py-6 first:border-t">
              <Link to={`/products/${item.product.slug}`} className="h-36 w-28 shrink-0 overflow-hidden bg-surface">
                <img src={item.product.images?.[0]?.url} alt={item.product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="overline text-muted-foreground">{item.product.category?.name}</p>
                    <Link to={`/products/${item.product.slug}`} className="font-display text-lg font-semibold tracking-tight">{item.product.name}</Link>
                  </div>
                  <span className="font-display text-lg font-semibold">{fmtPrice(item.product.price * item.quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-border">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} data-testid={`cart-dec-${item.id}`} className="px-3 py-2 disabled:opacity-30"><Minus size={13} /></button>
                    <span className="w-9 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} data-testid={`cart-inc-${item.id}`} className="px-3 py-2"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => removeItem(item.id)} data-testid={`cart-remove-${item.id}`} className="flex items-center gap-1 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-foreground"><Trash2 size={14} /> Remove</button>
                </div>
              </div>
            </motion.div>
          ))}
          <button onClick={clearCart} data-testid="clear-cart" className="mt-6 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-sale-red">Clear Bag</button>
        </div>

        {/* Summary */}
        <div className="h-fit bg-surface p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold uppercase tracking-luxe-sm">Order Summary</h2>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{fmtPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{total > 50 ? 'Free' : '$10'}</span></div>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-display text-lg font-bold"><span>Total</span><span>{fmtPrice(total > 50 ? total : total + 10)}</span></div>
          <button onClick={() => navigate('/checkout')} data-testid="checkout-btn" className="mt-8 flex w-full items-center justify-center gap-2 bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold">
            Checkout <ArrowRight size={15} />
          </button>
          <Link to="/products" className="link-underline mx-auto mt-5 block w-fit text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
