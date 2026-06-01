import { useState, useEffect } from 'react';
import { productAPI } from '../api/products';
import { useCart } from '../context/CartContext';
import './Products.css';

function Products() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productAPI.getAll();
            // Backend returns { success: true, data: [...products] }
            // So products are at response.data.data
            const productsData = response.data.data || response.data || [];
            setProducts(Array.isArray(productsData) ? productsData : []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            // Fallback for demo purposes if backend isn't populated or running
            setProducts([]);
            setLoading(false);
        }
    };

    const categories = [
        { id: 'all', name: 'All Products' },
        { id: 'infrastructure', name: 'Infrastructure' }, // Fixed ID to match seeder
        { id: 'software', name: 'Software' },
        { id: 'security', name: 'Security' }
    ];

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category === selectedCategory);

    if (loading) return <div className="loading-container">Loading products...</div>;
    // if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="products-page">
            <div className="products-header">
                <h1>Our Products</h1>
                <p>Choose the perfect solution for your business needs</p>
            </div>

            <div className="category-filter">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="products-grid">
                {filteredProducts.length === 0 ? (
                    <p className="no-products">No products found.</p>
                ) : (
                    filteredProducts.map(product => (
                        <div key={product.id} className="product-card glass-card">
                            <div className="product-header">
                                <h3>{product.name}</h3>
                                <span className="product-price">${product.price}</span>
                            </div>
                            <p className="product-description">{product.description}</p>
                            {/* Features might not be in the simple product schema, making it optional */}
                            {product.features && (
                                <ul className="product-features">
                                    {product.features.map((feature, idx) => (
                                        <li key={idx}>
                                            <span className="checkmark">✓</span> {feature}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="product-actions" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => addToCart(product)}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Products;
