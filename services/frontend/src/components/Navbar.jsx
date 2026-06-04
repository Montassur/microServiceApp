import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

function CartIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-5px' }}>
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
    );
}

function Navbar() {
    const location = useLocation();
    const { isAuthenticated, logout } = useAuth();
    const { cart } = useCart();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    const cartItemCount = cart.items ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;

    return (
        <nav className="navbar">
            <Link to="/" className="logo">Ecommerce</Link>

            {/* Center: main navigation */}
            <div className="nav-links nav-links-center">
                <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
                <Link to="/products" className={`nav-link ${isActive('/products') ? 'active' : ''}`}>Products</Link>
                <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
                <Link to="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
                {isAuthenticated && (
                    <>
                        <Link to="/orders" className={`nav-link ${isActive('/orders') ? 'active' : ''}`}>Orders</Link>
                        <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                    </>
                )}
            </div>

            {/* Right: Panier + auth */}
            <div className="nav-links nav-links-right">
                <Link to="/cart" className={`nav-link nav-cart ${isActive('/cart') ? 'active' : ''}`} aria-label="Panier">
                    <CartIcon />
                    <span style={{ marginLeft: 6 }}>Panier</span>
                    {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
                </Link>

                {isAuthenticated ? (
                    <button onClick={handleLogout} className="nav-link nav-btn">Logout</button>
                ) : (
                    <Link to="/login" className={`nav-link nav-btn-primary ${isActive('/login') ? 'active' : ''}`}>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
