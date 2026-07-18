import { useEffect } from 'react';

export default function SEO({ 
  title = 'StoreX — Luxury Essentials', 
  description = 'Considered essentials and elevated staples. Designed in-house, made to endure.',
  keywords = 'luxury clothing, premium fashion, designer wear, online shopping',
  image = 'https://storex-frontend-gold.vercel.app/og-image.jpg',
  url = 'https://storex-frontend-gold.vercel.app',
  type = 'website'
}) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMeta = (name, content, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        if (property) meta.setAttribute('property', name);
        else meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', image, true);
    updateMeta('og:url', url, true);
    updateMeta('og:type', type, true);
    updateMeta('twitter:title', title, true);
    updateMeta('twitter:description', description, true);
    updateMeta('twitter:image', image, true);
    updateMeta('twitter:card', 'summary_large_image', true);

    // Update canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    return () => {
      // Cleanup not needed for SPA navigation
    };
  }, [title, description, keywords, image, url, type]);

  return null;
}