import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Heart, Truck, RotateCcw, Plus, Minus, Star, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import useWishlist from '../hooks/useWishlist';
import ProductCard, { fmtPrice } from '../components/ProductCard';
import { getRecentlyViewed, pushRecentlyViewed } from '../hooks/useRecentlyViewed';

const ease = [0.22, 1, 0.36, 1];

function Accordion({ title, children, defaultOpen = false, testid }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} data-testid={testid} className="flex w-full items-center justify-between py-5 text-left">
        <span className="font-display text-sm font-bold uppercase tracking-luxe-sm">{title}</span>
        <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }} className="overflow-hidden">
            <div className="pb-6 text-sm font-light leading-relaxed text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [adding, setAdding] = useState(false);

  const addToCart = useCartStore((s) => s.addToCart);
  const { isWishlisted, toggle } = useWishlist();

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setLoading(true);
    setRecent(getRecentlyViewed());
    api.get(`/products/${slug}`)
      .then((res) => {
        if (!mounted) return;
        const prod = res.data?.product;
        if (!prod) throw new Error('not found');
        setProduct(prod);
        setSelectedImage(0);
        setQty(1);
        const sizeV = prod.variants?.find((v) => v.name?.toLowerCase() === 'size');
        const colorV = prod.variants?.find((v) => v.name?.toLowerCase() === 'color');
        setSelectedSize(sizeV?.value ?? null);
        setSelectedColor(colorV?.value ?? null);
        pushRecentlyViewed(prod);
      })
      .catch(() => { if (mounted) { setProduct(null); toast.error('Product not found'); } })
      .finally(() => { if (mounted) setLoading(false); });

    api.get('/products', { params: { limit: 4 } }).then((res) => mounted && setRelated(res.data.products || [])).catch(() => {});
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="container-luxe grid gap-12 py-12 md:grid-cols-2">
        <div className="aspect-[4/5] animate-pulse bg-surface" />
        <div className="space-y-4"><div className="h-10 w-2/3 animate-pulse bg-surface" /><div className="h-6 w-1/3 animate-pulse bg-surface" /><div className="h-40 w-full animate-pulse bg-surface" /></div>
      </div>
    );
  }
  if (!product) return <div className="py-32 text-center text-muted-foreground">Product not found</div>;

  const images = Array.isArray(product.images) ? product.images : [];
  const activeImage = images[selectedImage] || images[0];
  const sizeVariants = product.variants?.filter((v) => v.name?.toLowerCase() === 'size') ?? [];
  const colorVariants = product.variants?.filter((v) => v.name?.toLowerCase() === 'color') ?? [];
  const reviews = product.reviews || [];
  const qtyStock = product.inventory?.quantity;
  const lowStock = typeof qtyStock === 'number' && qtyStock <= 5 && qtyStock > 0;
  const outOfStock = typeof qtyStock === 'number' && qtyStock <= 0;
  const onSale = product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const wished = isWishlisted(product.id);
  const disabled = outOfStock || (sizeVariants.length > 0 && !selectedSize);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addToCart(product.id, qty);
      window.dispatchEvent(new Event('open-cart'));
      toast.success('Added to bag');
    } catch { toast.error('Please sign in to add items'); }
    finally { setAdding(false); }
  };

  return (
    <div className="bg-background">
      <div className="container-luxe pt-8">
        <Link to="/products" data-testid="back-to-products" className="link-underline inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground">
          <ArrowLeft size={15} /> Back to Collection
        </Link>
      </div>

      <div className="container-luxe grid grid-cols-1 gap-12 py-10 md:grid-cols-2 md:gap-16 lg:gap-24">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-4 md:flex-row">
          <div className="flex gap-3 md:flex-col">
            {images.map((img, i) => (
              <button key={img.id ?? i} onClick={() => setSelectedImage(i)} data-testid={`thumb-${i}`} className={`h-20 w-16 shrink-0 overflow-hidden bg-surface transition-all ${selectedImage === i ? 'ring-1 ring-foreground ring-offset-2' : 'opacity-60 hover:opacity-100'}`}>
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-surface">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage?.url ?? selectedImage}
                src={activeImage?.url}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </AnimatePresence>
            {onSale && <span className="absolute left-4 top-4 bg-sale-red px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-white">Sale</span>}
          </div>
        </div>

        {/* Info */}
        <div className="md:sticky md:top-28 md:h-fit">
          <p className="overline text-muted-foreground">{product.category?.name}{product.brand?.name ? ` · ${product.brand.name}` : ''}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{product.name}</h1>

          <div className="mt-5 flex items-center gap-4">
            <span className="font-display text-2xl font-semibold">{fmtPrice(product.price)}</span>
            {onSale && <span className="text-lg text-muted-foreground line-through">{fmtPrice(product.comparePrice)}</span>}
            {avgRating && (
              <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                <Star size={15} className="fill-gold text-gold" /> {avgRating} ({reviews.length})
              </span>
            )}
          </div>

          {product.shortDescription && <p className="mt-6 max-w-md text-sm font-light leading-relaxed text-muted-foreground">{product.shortDescription}</p>}

          {/* Colors */}
          {colorVariants.length > 0 && (
            <div className="mt-8">
              <p className="overline mb-3 text-foreground">Colour — {selectedColor}</p>
              <div className="flex gap-3">
                {colorVariants.map((c) => (
                  <button key={c.id} onClick={() => setSelectedColor(c.value)} data-testid={`color-${c.value}`} title={c.value}
                    className={`h-9 rounded-full px-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-all ${selectedColor === c.value ? 'bg-foreground text-white' : 'border border-border text-muted-foreground hover:border-foreground'}`}>
                    {c.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizeVariants.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="overline text-foreground">Size</p>
                <span className="text-[11px] uppercase tracking-luxe-sm text-muted-foreground">Size Guide</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {sizeVariants.map((v) => (
                  <button key={v.id} onClick={() => setSelectedSize(v.value)} data-testid={`size-${v.value}`}
                    className={`flex h-12 min-w-[3rem] items-center justify-center border px-3 text-sm font-semibold transition-all ${selectedSize === v.value ? 'border-foreground bg-foreground text-white' : 'border-border hover:border-foreground'}`}>
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + actions */}
          <div className="mt-8 flex items-stretch gap-4">
            <div className="flex items-center border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="qty-minus" className="px-4 py-4 disabled:opacity-30" disabled={qty <= 1}><Minus size={15} /></button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} data-testid="qty-plus" className="px-4 py-4"><Plus size={15} /></button>
            </div>
            <button onClick={handleAdd} disabled={disabled || adding} data-testid="add-to-cart-button"
              className="flex flex-1 items-center justify-center gap-2 bg-foreground text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingBag size={17} /> {outOfStock ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Bag'}
            </button>
            <button onClick={() => { const a = toggle(product); toast(a ? 'Saved to wishlist' : 'Removed'); }} data-testid="wishlist-detail" className="flex w-14 items-center justify-center border border-border transition-colors hover:border-foreground">
              <Heart size={18} className={wished ? 'fill-foreground text-foreground' : ''} />
            </button>
          </div>

          {lowStock && <p className="mt-4 text-xs font-semibold uppercase tracking-luxe-sm text-sale-red">Only {qtyStock} left — almost gone</p>}

          {/* Delivery */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-surface p-4"><Truck size={20} strokeWidth={1.4} /><div><p className="text-xs font-semibold">Free Shipping</p><p className="text-xs text-muted-foreground">3–5 business days</p></div></div>
            <div className="flex items-center gap-3 bg-surface p-4"><RotateCcw size={20} strokeWidth={1.4} /><div><p className="text-xs font-semibold">Free Returns</p><p className="text-xs text-muted-foreground">Within 30 days</p></div></div>
          </div>

          {/* Accordions */}
          <div className="mt-10">
            <Accordion title="Details" defaultOpen testid="acc-details">
              <p className="whitespace-pre-wrap">{product.description || 'No description available.'}</p>
            </Accordion>
            <Accordion title="Delivery & Returns" testid="acc-delivery">
              Complimentary shipping on orders over $50. Standard delivery in 3–5 business days. Enjoy free returns within 30 days of receipt — items must be unworn with tags attached.
            </Accordion>
            <Accordion title="Materials & Care" testid="acc-care">
              Crafted from premium, responsibly-sourced fabrics. Machine wash cold on a gentle cycle, wash inside out, and lay flat to dry to preserve shape and finish.
            </Accordion>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="container-luxe border-t border-border py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">Reviews {reviews.length > 0 && <span className="text-muted-foreground">({reviews.length})</span>}</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No reviews yet — be the first to share your thoughts.</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-border p-6">
                <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < r.rating ? 'fill-gold text-gold' : 'text-border'} />)}</div>
                {r.title && <h4 className="mt-3 font-display text-sm font-bold">{r.title}</h4>}
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{r.comment}</p>
                <p className="mt-4 text-xs uppercase tracking-luxe-sm text-muted-foreground">{r.user?.firstName} {r.user?.lastName?.[0]}.</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="container-luxe border-t border-border py-16">
          <h2 className="mb-10 font-display text-3xl font-bold tracking-tight">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {related.filter((p) => p.id !== product.id).slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recent.filter((p) => p.slug !== slug).length > 0 && (
        <section className="container-luxe border-t border-border py-16">
          <h2 className="mb-10 font-display text-2xl font-bold tracking-tight">Recently Viewed</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {recent.filter((p) => p.slug !== slug).slice(0, 4).map((p) => (
              <Link key={p.id} to={`/products/${p.slug}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden bg-surface"><img src={p.images?.[0]?.url} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
                <p className="mt-3 truncate font-display text-sm font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{fmtPrice(p.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
