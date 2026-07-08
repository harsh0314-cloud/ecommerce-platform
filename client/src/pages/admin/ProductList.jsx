import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    api.get('/products')
      .then((res) => setProducts(res.data.products))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      // Note: We need to create this delete route on the backend next!
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      fetchProducts(); // Refresh list
    } catch (error) {
      toast.error('Failed to delete product (Backend route needed)');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading products...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">All Products</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={product.images[0]?.url} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">${product.price}</td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.inventory?.quantity || 0}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}