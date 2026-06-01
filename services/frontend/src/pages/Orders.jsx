import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../api/orders';
import { Link } from 'react-router-dom';

function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            const res = await orderAPI.getOrders(user.id);
            setOrders(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch orders', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-container">Loading orders...</div>;

    if (!orders || orders.length === 0) {
        return (
            <div className="orders-page" style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>
                <h1>No Orders Found</h1>
                <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="orders-page" style={{ padding: '2rem' }}>
            <h1 style={{ color: 'white', marginBottom: '2rem' }}>Your Orders</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map((order) => (
                    <div key={order.id} className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                            <h3 style={{ color: 'white', margin: 0 }}>Order #{order.id}</h3>
                            <span style={{
                                background: order.status === 'COMPLETED' ? '#4caf50' : '#ff9800',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                color: 'white'
                            }}>
                                {order.status}
                            </span>
                        </div>
                        <div style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                            <p>Total: <strong>${parseFloat(order.total_amount).toFixed(2)}</strong></p>
                        </div>
                        {/* If we had order items in the response, we could list them here. 
                            For now, assuming the API returns basic order info. */}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Orders;
