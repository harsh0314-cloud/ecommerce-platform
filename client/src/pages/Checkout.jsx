import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { fmtPrice } from '../components/ProductCard';

const input = 'w-full border-0 border-b border-input bg-transparent px-0 py-2.5 text-sm focus:border-foreground focus:ring-0';
const label = 'overline text-muted-foreground';

export default function Checkout() {
  const { items, total: cartSubtotal, fetchCart } = useCartStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', addressLine1: '', city: '', state: '', postalCode: '', country: 'US' });
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const tax = cartSubtotal * 0.10;
  const shipping = cartSubtotal > 50 ? 0 : 10;
  const finalTotal = Math.max(0, cartSubtotal + tax + shipping - discount).toFixed(2);
  const updateForm = (field, value) => setForm({ ...form, [field]: value });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.post('/orders/validate-coupon', { code: couponCode, subtotal: cartSubtotal });
      setDiscount(parseFloat(res.data.discount));
      setCouponMessage(res.data.message);
      toast.success(res.data.message);
    } catch (error) {
      setDiscount(0);
      setCouponMessage(error.message);
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (paymentMethod === 'COD') {
        await api.post('/orders', { ...form, paymentMethod: 'CASH_ON_DELIVERY' });
        toast.success('Order placed successfully!');
        await fetchCart();
        navigate(`/payment/success?orderId=${orderRes.data.order.id}`);
      } else {
        const res = await api.post('/payments/create-checkout-session', form);
        const stripeUrl = res.data.url;
        if (stripeUrl) { window.location.href = stripeUrl; return; }
        toast.error('Failed to create payment session');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to initiate payment');
    } finally { setLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Your bag is empty</h1>
        <button onClick={() => navigate('/products')} className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Go Shopping</button>
      </div>
    );
  }

  return (
    <div className="container-luxe py-14">
      <h1 className="mb-12 font-display text-5xl font-bold tracking-tight sm:text-6xl">Checkout</h1>

      <div className="grid gap-14 lg:grid-cols-3">
        <div className="space-y-14 lg:col-span-2">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-14">
            <section>
              <h2 className="mb-8 font-display text-lg font-bold uppercase tracking-luxe-sm">01 — Shipping Details</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className={label}>First Name</label><input required type="text" value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} data-testid="checkout-firstname" className={input} /></div>
                  <div><label className={label}>Last Name</label><input required type="text" value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} data-testid="checkout-lastname" className={input} /></div>
                </div>
                <div><label className={label}>Phone</label><input required type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} data-testid="checkout-phone" className={input} /></div>
                <div><label className={label}>Address</label><input required type="text" value={form.addressLine1} onChange={(e) => updateForm('addressLine1', e.target.value)} data-testid="checkout-address" className={input} /></div>
                <div className="grid grid-cols-3 gap-6">
                  <div><label className={label}>City</label><input required type="text" value={form.city} onChange={(e) => updateForm('city', e.target.value)} data-testid="checkout-city" className={input} /></div>
                  <div><label className={label}>State</label><input required type="text" value={form.state} onChange={(e) => updateForm('state', e.target.value)} data-testid="checkout-state" className={input} /></div>
                  <div><label className={label}>Zip</label><input required type="text" value={form.postalCode} onChange={(e) => updateForm('postalCode', e.target.value)} data-testid="checkout-zip" className={input} /></div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-8 font-display text-lg font-bold uppercase tracking-luxe-sm">02 — Payment</h2>
              <div className="space-y-3">
                {[
                  { id: 'STRIPE', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, Amex' },
                  { id: 'UPI', label: 'UPI / QR Code', sub: 'Google Pay, PhonePe (UI only)' },
                  { id: 'COD', label: 'Cash on Delivery', sub: 'Pay when you receive' },
                ].map((m) => (
                  <label key={m.id} data-testid={`payment-${m.id}`} className={`flex cursor-pointer items-center gap-4 border p-5 transition-colors ${paymentMethod === m.id ? 'border-foreground bg-surface' : 'border-border hover:border-foreground/40'}`}>
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={(e) => setPaymentMethod(e.target.value)} className="h-4 w-4 text-foreground focus:ring-0" />
                    <div><p className="text-sm font-semibold">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div>
                  </label>
                ))}
              </div>
            </section>
          </form>
        </div>

        {/* Summary */}
        <div className="h-fit bg-surface p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold uppercase tracking-luxe-sm">Order Summary</h2>
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                <span className="font-semibold">{fmtPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-2 border-t border-border pt-6">
            <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" data-testid="coupon-input" className="flex-1 border-0 border-b border-input bg-transparent px-0 py-2 text-sm focus:border-foreground focus:ring-0" />
            <button type="button" onClick={handleApplyCoupon} data-testid="coupon-apply" className="border border-foreground px-5 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Apply</button>
          </div>
          {couponMessage && <p className="mt-2 text-xs font-semibold text-green-700">{couponMessage}</p>}

          <div className="mt-6 space-y-2 border-t border-border pt-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtPrice(cartSubtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : fmtPrice(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax (10%)</span><span>${tax.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-display text-lg font-bold"><span>Total</span><span>${finalTotal}</span></div>

          <button type="submit" form="checkout-form" disabled={loading} data-testid="place-order-btn" className="mt-8 w-full bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-50">
            {loading ? 'Processing…' : (paymentMethod === 'COD' ? `Place Order · $${finalTotal}` : `Pay · $${finalTotal}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
