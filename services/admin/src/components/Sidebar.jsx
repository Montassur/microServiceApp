import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuth();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
        window.location.href = '/admin/login';
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Admin Panel</h2>
                {user && (
                    <div className="admin-info">
                        <p className="admin-name">{user.firstName} {user.lastName}</p>
                        <p className="admin-role">{user.role}</p>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <Link
                    to="/admin"
                    className={`nav-item ${isActive('/admin') || isActive('/admin/') ? 'active' : ''}`}
                >
                    <span className="nav-icon">📊</span>
                    Dashboard
                </Link>
                <Link
                    to="/admin/users"
                    className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}
                >
                    <span className="nav-icon">👥</span>
                    Users
                </Link>
                <Link
                    to="/admin/products"
                    className={`nav-item ${isActive('/admin/products') ? 'active' : ''}`}
                >
                    <span className="nav-icon">📦</span>
                    Products
                </Link>
                <Link
                    to="/admin/orders"
                    className={`nav-item ${isActive('/admin/orders') ? 'active' : ''}`}
                >
                    <span className="nav-icon">🛒</span>
                    Orders
                </Link>
                <Link
                    to="/admin/coupons"
                    className={`nav-item ${isActive('/admin/coupons') ? 'active' : ''}`}
                >
                    <span className="nav-icon">🎟️</span>
                    Coupons
                </Link>
                <Link
                    to="/admin/settings"
                    className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}
                >
                    <span className="nav-icon">⚙️</span>
                    Settings
                </Link>
                <Link
                    to="/admin/reports"
                    className={`nav-item ${isActive('/admin/reports') ? 'active' : ''}`}
                >
                    <span className="nav-icon">📈</span>
                    Reports
                </Link>
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <span className="nav-icon">🚪</span>
                    Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
