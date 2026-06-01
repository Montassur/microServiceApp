import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { productAPI } from '../api/products';
import './Users.css'; // Reuse Users styles for consistency

function Products() {
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        image_url: ''
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productAPI.getAll();
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
            // toast.error('Failed to load products'); // API might fail if service not ready
            setProducts([]); // partial fallback
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = [...new Set(products.map(p => p.category))];

    const handleSubmit = async (e, isEdit) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock)
            };
            if (isEdit) {
                await productAPI.update(editingProduct.id, data);
                toast.success('Product updated!');
                setShowEditModal(false);
            } else {
                await productAPI.create(data);
                toast.success('Product created!');
                setShowAddModal(false);
            }
            fetchProducts();
            setFormData({ name: '', description: '', price: '', category: '', stock: '', image_url: '' });
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await productAPI.delete(id);
            toast.success('Product deleted');
            fetchProducts();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: product.category || '',
            stock: product.stock,
            image_url: product.image_url || ''
        });
        setShowEditModal(true);
    };

    if (loading) return <div className="loading-state"><p>Loading products...</p></div>;

    return (
        <div className="users-page">
            <div className="page-header">
                <div>
                    <h1>Products Management</h1>
                    <p className="page-subtitle">{filteredProducts.length} total products</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    ➕ Add Product
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td><span className="role-badge">{p.category}</span></td>
                                    <td>${p.price}</td>
                                    <td>{p.stock}</td>
                                    <td>
                                        <button className="btn-icon" onClick={() => openEditModal(p)}>✏️</button>
                                        <button className="btn-icon btn-danger" onClick={() => handleDelete(p.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Logic Reuse (Simplified) */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{showEditModal ? 'Edit' : 'Add'} Product</h2>
                            <button className="modal-close" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>✖</button>
                        </div>
                        <form onSubmit={(e) => handleSubmit(e, showEditModal)}>
                            <div className="form-group">
                                <label>Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price</label>
                                    <input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Stock</label>
                                    <input type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Products;
