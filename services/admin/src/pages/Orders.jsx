import { useState, useEffect } from 'react';
import { orderAPI } from '../api/orders';
import './Users.css';

function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll();
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state"><p>Loading orders...</p></div>;

    return (
        <div className="users-page">
            <div className="page-header">
                <h1>Orders Management</h1>
            </div>
            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>User ID</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{order.user_id}</td>
                                    <td>${order.total_amount}</td>
                                    <td><span className={`status-badge ${order.status?.toLowerCase()}`}>{order.status}</span></td>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Orders;
