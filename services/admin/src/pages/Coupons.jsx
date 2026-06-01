import { useState, useEffect } from 'react';
import { couponAPI } from '../api/coupons';
import { useToast } from '../context/ToastContext';
import './Users.css';

function Coupons() {
    const toast = useToast();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ code: '', discountType: 'percentage', value: '', expirationDate: '', usageLimit: '' });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await couponAPI.getAll();
            setCoupons(response.data);
        } catch (error) {
            // console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await couponAPI.create(formData);
            toast.success('Coupon created');
            setShowModal(false);
            fetchCoupons();
        } catch (error) {
            toast.error('Failed to create coupon');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete coupon?')) return;
        try {
            await couponAPI.delete(id);
            toast.success('Coupon deleted');
            fetchCoupons();
        } catch (error) {
            toast.error('Failed to delete coupon');
        }
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <h1>Coupons Management</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Coupon</button>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Discount</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.map(c => (
                            <tr key={c.id}>
                                <td>{c.code}</td>
                                <td>{c.discount_value}{c.discount_type === 'percentage' ? '%' : '$'}</td>
                                <td>{new Date(c.expiration_date).toLocaleDateString()}</td>
                                <td><button className="btn-icon btn-danger" onClick={() => handleDelete(c.id)}>🗑️</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Create Coupon</h2><button onClick={() => setShowModal(false)} className="modal-close">✖</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label>Code</label><input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
                            <div className="form-group"><label>Type</label>
                                <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })}>
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>
                            <div className="form-group"><label>Value</label><input type="number" required value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} /></div>
                            <div className="form-group"><label>Expiration Details</label><input type="date" required value={formData.expirationDate} onChange={e => setFormData({ ...formData, expirationDate: e.target.value })} /></div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Create</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Coupons;
