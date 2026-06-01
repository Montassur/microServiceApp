import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { analyticsAPI } from '../api/analytics';
import { adminAPI } from '../api/client';
import './Dashboard.css';

function Dashboard() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: 'Total Orders', value: 0, icon: '📦' },
        { label: 'Revenue', value: 0, prefix: '$', icon: '💰' },
        { label: 'Successful Payments', value: 0, icon: '💳' },
        { label: 'Active Sessions', value: '-', icon: '🔥' } // Placeholder for now
    ]);

    const [recentUsers, setRecentUsers] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes, eventsRes] = await Promise.all([
                analyticsAPI.getDashboardStats().catch(() => ({ data: { totalOrders: 0, totalRevenue: 0, successfulPayments: 0 } })),
                adminAPI.getUsers({ limit: 5 }).catch(() => ({ data: { data: { users: [] } } })),
                analyticsAPI.getRecentEvents().catch(() => ({ data: [] }))
            ]);

            // Process Stats
            setStats([
                { label: 'Total Orders', value: statsRes.data.totalOrders, icon: '📦' },
                { label: 'Revenue', value: statsRes.data.totalRevenue, prefix: '$', icon: '💰' },
                { label: 'Successful Payments', value: statsRes.data.successfulPayments, icon: '💳' },
                { label: 'Active Sessions', value: 'N/A', icon: '🔥' }
            ]);

            // Process Users
            setRecentUsers(usersRes.data.data.users.slice(0, 5));

            // Process Events
            const activities = eventsRes.data.map((event, idx) => ({
                id: event.id || idx,
                action: event.event_type.replace('_', ' '), // Clean up enum
                user: 'System',
                time: new Date(event.created_at).toLocaleTimeString(),
                icon: event.event_type.includes('ORDER') ? '🛒' : event.event_type.includes('PAYMENT') ? '💲' : '📝'
            }));
            setRecentActivity(activities);

        } catch (error) {
            console.error('Dashboard load error:', error);
            toast.error('Partially failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = (action) => {
        if (action === 'Refresh') {
            fetchData();
            toast.success('Refreshing data...');
        } else {
            toast.info(`Action: ${action} - Not implemented yet`);
        }
    };

    const formatNumber = (num, prefix = '', suffix = '') => {
        if (num === undefined || num === null) return '-';
        return `${prefix}${num.toLocaleString()}${suffix}`;
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
    };

    if (loading) return <div className="loading-state"><p>Loading dashboard...</p></div>;

    return (
        <div className="dashboard-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="page-subtitle">Real-time overview of system performance.</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleQuickAction('Refresh')}>
                    🔄 Refresh Data
                </button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-value">
                                {formatNumber(stat.value, stat.prefix || '', stat.suffix || '')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Recent Users */}
                <div className="card">
                    <div className="card-header">
                        <h3>Recent Users</h3>
                        <button className="btn btn-sm" onClick={() => window.location.href = '/admin/users'}>
                            View All →
                        </button>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsers.length > 0 ? recentUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">{getInitials(user.firstName, user.lastName)}</div>
                                                <div className="user-info">
                                                    <div className="user-name">{user.firstName} {user.lastName}</div>
                                                    <div className="user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="role-badge">{user.role}</span></td>
                                        <td>
                                            <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>No recent users</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions & Activity */}
                <div className="sidebar-cards">
                    {/* Quick Actions */}
                    <div className="card">
                        <h3>Quick Actions</h3>
                        <div className="quick-actions-grid">
                            <button className="action-card" onClick={() => window.location.href = '/admin/users'}>
                                <span className="action-icon">👤</span>
                                <span className="action-label">Add User</span>
                            </button>
                            <button className="action-card" onClick={() => window.location.href = '/admin/products'}>
                                <span className="action-icon">📦</span>
                                <span className="action-label">Add Product</span>
                            </button>
                            <button className="action-card" onClick={() => window.location.href = '/admin/coupons'}>
                                <span className="action-icon">🎟️</span>
                                <span className="action-label">Add Coupon</span>
                            </button>
                            <button className="action-card" onClick={() => window.location.href = '/admin/settings'}>
                                <span className="action-icon">⚙️</span>
                                <span className="action-label">Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <h3>Recent Activity</h3>
                        <div className="activity-feed">
                            {recentActivity.length > 0 ? recentActivity.map(activity => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">{activity.icon}</div>
                                    <div className="activity-content">
                                        <div className="activity-action">{activity.action}</div>
                                        <div className="activity-meta">
                                            <span className="activity-time">{activity.time}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No recent activity</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
