import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

function Navbar() {
    const location = useLocation();
    const { isAuthenticated, user, logout } = useAuth();
    const { cart } = useCart();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    const cartItemCount = cart.items ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;

    return (
        <nav className="navbar">
            <Link to="/" className="logo">
                Aura<span style={{ color: 'var(--primary)' }}>Web</span>
            </Link>
            <div className="nav-links">
                <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                >
                    Home
                </Link>
                <Link
                    to="/products"
                    className={`nav-link ${isActive('/products') ? 'active' : ''}`}
                >
                    Products
                </Link>
                <Link
                    to="/cart"
                    className={`nav-link ${isActive('/cart') ? 'active' : ''}`}
                >
                    Cart {cartItemCount > 0 && <span style={{ marginLeft: '5px', background: 'var(--primary)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem' }}>{cartItemCount}</span>}
                </Link>
                <Link
                    to="/about"
                    className={`nav-link ${isActive('/about') ? 'active' : ''}`}
                >
                    About
                </Link>
                <Link
                    to="/contact"
                    className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
                >
                    Contact
                </Link>

                {isAuthenticated ? (
                    <>
                        <Link
                            to="/orders"
                            className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
                        >
                            Orders
                        </Link>
                        <Link
                            to="/profile"
                            className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                        >
                            Profile
                        </Link>
                        <Link
                            to="/dashboard"
                            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                        >
                            Dashboard
                        </Link>
                        <button onClick={handleLogout} className="nav-link nav-btn">
                            Logout
                        </button>
                    </>
                ) : (
                    <Link
                        to="/login"
                        className={`nav-link nav-btn-primary ${isActive('/login') ? 'active' : ''}`}
                    >
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
