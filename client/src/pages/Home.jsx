import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react';
import api from '../services/api';
import SEO from '../components/SEO';

// Lazy load heavy components
const ProductCard = lazy(() => import('../components/ProductCard'));
const Magnetic = lazy(() => import('../components/Magnetic'));

const ease = [0.76, 0, 0.24, 1];

const HERO = 'https://images.pexels.com/photos/20238915/pexels-photo-20238915.jpeg?auto=compress&cs=tinysrgb&w=1600';
const EDITORIAL = 'https://images.unsplash.com/photo-1739808914849-01ba195c4f93?auto=format&fit=crop&w=1400&q=80';

const collections = [
  { name: 'Hoodies', slug: 'hoodies', image: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?crop=entropy&cs=srgb&fm=jpg&q=85&w=900' },
  { name: 'T-Shirts', slug: 't-shirts', image: 'https://images.unsplash.com/photo-1622445272461-c6580cab8755?crop=entropy&cs=srgb&fm=jpg&q=85&w=900' },
  { name: 'Jackets', slug: 'jackets', image: 'https://images.unsplash.com/photo-1603189343302-e603f7add05a?auto=format&fit=crop&w=900&q=80' },
  { name: 'Trousers', slug: 'trousers', image: 'https://images.unsplash.com/photo-1763888647863-d6d0c7383151?auto=format&fit=crop&w=900&q=80' },
  { name: 'Footwear', slug: 'footwear', image: 'https://images.pexels.com/photos/12317922/pexels-photo-12317922.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { name: 'Accessories', slug: 'accessories', image: 'https://images.pexels.com/photos/20380733/pexels-photo-20380733.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

const marqueeItems = ['New Season 2026', 'Free Shipping Over ₹500', 'Crafted In-House', 'Made To Endure', 'The Icon Collection'];

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealNow({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay, ease }} className={className}>
      {children}
    </motion.div>
  );
}

// Skeleton loader for products
function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-gray-200 rounded-lg" />
      <div className="mt-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '60%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    api.get('/products', { params: { limit: 8 } })
      .then((res) => {
        setProducts(res.data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <>
      <SEO 
        title="StoreX — Luxury Essentials | Premium Clothing & Accessories"
        description="Discover considered essentials and elevated staples. Designed in-house, made to endure. Shop premium hoodies, t-shirts, jackets, and more."
        keywords="luxury clothing, premium fashion, designer wear, online shopping, StoreX, hoodies, t-shirts, jackets, footwear"
        url="https://storex-frontend-gold.vercel.app"
      />

      <div className="overflow-x-hidden">
        {/* HERO */}
        <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
          <motion.div style={{ y: imgY }} className="absolute inset-0">
            <img src={HERO} alt="StoreX Hero" className="h-full w-full object-cover" loading="eager" fetchpriority="high" />
            <div className="absolute inset-0 bg-black/30" />
          </motion.div>
          <motion.div style={{ y: textY, opacity: heroOpacity }} className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <RevealNow>
              <p className="overline mb-6 text-white/80">New Collection 2026</p>
            </RevealNow>
            <RevealNow delay={0.1}>
              <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
                The Essentials
              </h1>
            </RevealNow>
            <RevealNow delay={0.2}>
              <p className="mx-auto mt-6 max-w-md text-base text-white/80 md:text-lg">
                Considered essentials and elevated staples. Designed in-house, made to endure.
              </p>
            </RevealNow>
            <RevealNow delay={0.3}>
              <div className="mt-10 flex gap-4">
                <Link to="/products" className="bg-white px-8 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-colors hover:bg-white/90">
                  Shop Now
                </Link>
                <Link to="/products" className="border border-white px-8 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-white hover:text-foreground">
                  View Lookbook
                </Link>
              </div>
            </RevealNow>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
              <ArrowDown size={20} />
            </motion.div>
          </motion.div>
        </section>

        {/* MARQUEE */}
        <div className="bg-foreground py-4 text-white">
          <div className="flex overflow-hidden whitespace-nowrap">
            <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="flex shrink-0 gap-12 px-6 text-[11px] font-semibold uppercase tracking-luxe-sm">
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* FEATURED */}
        <section className="container-luxe py-24">
          <Reveal>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="overline text-muted-foreground">Curated Selection</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Featured Products</h2>
              </div>
              <Link to="/products" className="hidden items-center gap-2 text-sm font-semibold hover:underline md:flex">
                View All <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              <Suspense fallback={<ProductSkeleton />}>
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </Suspense>
            )}
          </div>
        </section>

        {/* COLLECTIONS */}
        <section className="container-luxe pb-24">
          <Reveal>
            <p className="overline text-muted-foreground">Browse By Category</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Collections</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {collections.map((col, i) => (
              <Reveal key={col.slug} delay={i * 0.08}>
                <Link to={`/products?category=${col.slug}`} className="group relative block aspect-[3/4] overflow-hidden">
                  <img src={col.image} alt={col.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-display text-lg font-semibold">{col.name}</h3>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                      Explore <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* EDITORIAL */}
        <section className="relative">
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-square md:aspect-auto md:h-[600px]">
              <img src={EDITORIAL} alt="Editorial" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="flex items-center bg-surface px-8 py-16 md:px-16">
              <div>
                <Reveal>
                  <p className="overline text-muted-foreground">The Philosophy</p>
                  <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">Designed In-House.<br />Made To Endure.</h2>
                  <p className="mt-6 max-w-md text-muted-foreground leading-relaxed">
                    Every piece is designed with intention — from fabric selection to the final stitch. 
                    We believe in clothing that outlasts trends and becomes part of your daily ritual.
                  </p>
                  <Link to="/products" className="mt-8 inline-block border border-foreground px-8 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">
                    Explore The Collection
                  </Link>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST SIGNALS */}
        <section className="container-luxe py-24">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₹500' },
              { icon: RotateCcw, title: 'Easy Returns', desc: '30-day return policy' },
              { icon: ShieldCheck, title: 'Secure Payment', desc: 'SSL encrypted checkout' },
              { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className="text-center">
                  <item.icon size={24} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section className="bg-foreground py-24 text-white">
          <div className="container-luxe text-center">
            <Reveal>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Join The Inner Circle</h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-white/70">Be the first to know about new drops, exclusive offers, and behind-the-scenes content.</p>
              <form className="mx-auto mt-8 flex max-w-md gap-3" onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed!'); }}>
                <input type="email" placeholder="Enter your email" required className="flex-1 border border-white/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none" />
                <button type="submit" className="bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-opacity hover:opacity-90">Subscribe</button>
              </form>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}