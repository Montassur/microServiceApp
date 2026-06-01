import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/client';
import { orderAPI } from '../api/orders';
import './Dashboard.css';

function Dashboard() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: ''
    });

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchProfile(), fetchOrders()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const fetchOrders = async () => {
        // Assuming user.id is available from AuthContext. If not, profile request usually returns it.
        // We'll use a fallback or wait for profile if needed, but let's try assuming 'user' object has ID.
        // If 'user' from context is null (initially), this might fail. 
        // Best to use the ID from the profile response or ensure user is loaded.
        // For now, let's assume we can get it after profile fetch or straight from context if stable.
        if (user && user.id) {
            try {
                const res = await orderAPI.getUserOrders(user.id);
                setOrders(res.data);
            } catch (err) {
                console.error('Failed to fetch orders', err);
            }
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await userAPI.getProfile();
            setProfile(response.data.data);
            setFormData({
                firstName: response.data.data.firstName || '',
                lastName: response.data.data.lastName || ''
            });
            // If we didn't have user ID before, we definitely have it now.
            if (response.data.data.id && (!user || !user.id)) {
                try {
                    const res = await orderAPI.getUserOrders(response.data.data.id);
                    setOrders(res.data);
                } catch (err) {
                    console.error('Failed to fetch orders', err);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await userAPI.updateProfile(formData);
            await fetchProfile();
            setEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    if (loading) {
        return <div className="dashboard-loading">Loading...</div>;
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1>User Dashboard</h1>
                <button onClick={handleLogout} className="btn">Logout</button>
            </div>

            <div className="dashboard-grid">
                <div className="card">
                    <h2>Profile Information</h2>
                    {!editing ? (
                        <div className="profile-info">
                            <div className="info-item">
                                <span className="info-label">Name:</span>
                                <span className="info-value">{profile?.firstName} {profile?.lastName}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{profile?.email}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Role:</span>
                                <span className="info-value">{profile?.role}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Member Since:</span>
                                <span className="info-value">
                                    {new Date(profile?.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <button onClick={() => setEditing(true)} className="btn btn-primary">
                                Edit Profile
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="profile-form">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" onClick={() => setEditing(false)} className="btn">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="card">
                    <h2>Account Stats</h2>
                    <div className="stats-list">
                        <div className="stat-item">
                            <div className="stat-icon">👤</div>
                            <div className="stat-content">
                                <div className="stat-label">Account Status</div>
                                <div className="stat-value">Active</div>
                            </div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">📦</div>
                            <div className="stat-content">
                                <div className="stat-label">Total Orders</div>
                                <div className="stat-value">{orders.length}</div>
                            </div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">🔐</div>
                            <div className="stat-content">
                                <div className="stat-label">Security</div>
                                <div className="stat-value">Strong</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card full-width">
                    <h2>Order History</h2>
                    {orders.length === 0 ? (
                        <p className="no-data">No orders found.</p>
                    ) : (
                        <div className="order-list">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id}>
                                            <td>#{order.id}</td>
                                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`status-badge ${order.status.toLowerCase()}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>${order.total_amount}</td>
                                            <td>
                                                <button className="btn btn-sm">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
