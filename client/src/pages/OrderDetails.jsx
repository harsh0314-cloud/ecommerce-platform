import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Both admins and customers use this same endpoint. 
    // The backend will allow it because of the fix in Step 3!
    api.get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading order...</div>;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate(isAdmin ? '/admin' : '/orders')} 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft size={20} /> Back to {isAdmin ? 'Dashboard' : 'Orders'}
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="text-xl font-bold text-foreground">{order.orderNumber}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {order.status}
            </span>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Items List */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                  <img src={item.image} className="w-16 h-16 object-cover rounded-lg bg-muted" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-foreground">₹{parseFloat(item.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Totals */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Shipping Address</h3>
            {order.address && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground mb-8 bg-muted/50 p-4 rounded-lg">
                <MapPin size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{order.address.firstName} {order.address.lastName}</p>
                  <p>Phone: {order.address?.phone || 'N/A'}</p>
                  <p>{order.address.addressLine1}</p>
                  <p>{order.address.city}, {order.address.state} {order.address.postalCode}</p>
                  <p>{order.address.country}</p>
                </div>
              </div>
            )}

            <h3 className="font-bold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="font-medium">{order.paymentMethod === 'RAZORPAY' ? 'Online Payment (Razorpay)' : 'Cash on Delivery'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₹{parseFloat(order.shippingCost).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{parseFloat(order.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2"><span>Total</span><span>₹{parseFloat(order.total).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}