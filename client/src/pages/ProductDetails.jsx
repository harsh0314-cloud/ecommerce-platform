import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { useCartStore } from '../store/cartStore';
import useWishlist from '../hooks/useWishlist';
import { fmtPrice } from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';

const ProductCard = lazy(() => import('../components/ProductCard'));

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);
  const { isWishlisted, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`)
      .then((res) => {
        const p = res.data?.product || res.data?.data?.product;
        setProduct(p);
        if (p?.category?.id) {
          api.get(`/products?category=${p.category.id}&limit=4`)
            .then((r) => setRelated((r.data?.products || []).filter((x) => x.id !== p.id)));
        }
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container-luxe py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="aspect-square bg-gray-100 animate-pulse rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 animate-pulse rounded w-3/4" />
            <div className="h-6 bg-gray-100 animate-pulse rounded w-1/4" />
            <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
            <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
            <div className="h-12 bg-gray-100 animate-pulse rounded w-1/2 mt-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const wished = isWishlisted(product.id);
  const onSale = product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discount = onSale ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100) : 0;

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      window.dispatchEvent(new Event('open-cart'));
      toast.success(`${product.name} added to bag`);
    } catch {
      toast.error('Please sign in to add items');
    } finally {
      setAdding(false);
    }
  };

  const handleWish = async () => {
    const added = await toggle(product);
    toast(added ? 'Saved to wishlist' : 'Removed from wishlist', { icon: added ? '♥' : '♡' });
  };

  return (
    <>
      <SEO 
        title={`${product.name} — StoreX`}
        description={product.description?.substring(0, 160) || `Shop ${product.name} at StoreX. Premium quality, designed in-house.`}
        keywords={`${product.name}, ${product.category?.name}, luxury clothing, StoreX`}
        image={product.images?.[0]?.url}
        url={`https://storex-frontend-gold.vercel.app/products/${slug}`}
      />

      <div className="container-luxe py-14">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Images */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              <img src={product.images?.[selectedImage]?.url} alt={product.name} className="h-full w-full object-cover" loading="eager" />
              {onSale && <span className="absolute left-4 top-4 bg-sale-red px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-white">-{discount}%</span>}
            </motion.div>
            {product.images?.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition-colors ${selectedImage === i ? 'border-foreground' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="overline text-muted-foreground">{product.category?.name}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-2xl font-semibold">{fmtPrice(product.price)}</span>
              {onSale && <span className="text-lg text-muted-foreground line-through">{fmtPrice(product.comparePrice)}</span>}
            </div>
            <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

            {/* Quantity */}
            <div className="mt-8 flex items-center gap-4">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center border border-border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 text-sm hover:bg-surface">-</button>
                <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 text-sm hover:bg-surface">+</button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-4">
              <button onClick={handleAdd} disabled={adding} className="flex-1 bg-foreground py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {adding ? 'Adding...' : 'Add to Bag'}
              </button>
              <button onClick={handleWish} className="flex h-[52px] w-[52px] items-center justify-center border border-border transition-colors hover:bg-surface">
                <Heart size={20} className={wished ? 'fill-red-500 text-red-500' : ''} />
              </button>
            </div>

            {/* Trust */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-8">
              {[
                { icon: Truck, label: 'Free Shipping', desc: 'Over ₹500' },
                { icon: RotateCcw, label: 'Easy Returns', desc: '30 days' },
                { icon: ShieldCheck, label: 'Secure', desc: 'SSL Checkout' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <item.icon size={20} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ReviewSection productId={product.id} />

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-24">
            <h2 className="font-display text-2xl font-bold tracking-tight">You May Also Like</h2>
            <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Suspense fallback={<div className="aspect-[4/5] bg-gray-100 animate-pulse rounded-lg" />}>
                {related.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </>
  );
}