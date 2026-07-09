import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AddProduct() {
  const [form, setForm] = useState({ name: '', slug: '', price: '', description: '', categoryId: '', brandId: '' });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Fetch categories and brands when the page loads
  useEffect(() => {
    api.get('/admin/categories').then(res => setCategories(res.data.categories || [])).catch(() => {});
    api.get('/admin/brands').then(res => setBrands(res.data.brands || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId || !form.brandId) {
      return toast.error("Please select a Category and Brand");
    }
    setLoading(true);
    try {
      await api.post('/admin/products', form);
      toast.success('Product created successfully!');
      setForm({ name: '', slug: '', price: '', description: '', categoryId: '', brandId: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Add New Product</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-2xl p-8">
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Product Name</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="e.g. Wireless Headphones" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Slug (URL)</label>
          <input type="text" required value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="e.g. wireless-headphones" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Price ($)</label>
          <input type="number" required step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="199.99" />
        </div>

        {/* NEW: Category Dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category</label>
          <select 
            required 
            value={form.categoryId} 
            onChange={(e) => setForm({...form, categoryId: e.target.value})} 
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground"
          >
            <option value="">Select a category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* NEW: Brand Dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Brand</label>
          <select 
            required 
            value={form.brandId} 
            onChange={(e) => setForm({...form, brandId: e.target.value})} 
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground"
          >
            <option value="">Select a brand...</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="Product details..." />
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
}