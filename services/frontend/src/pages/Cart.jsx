import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../api/orders';
import { Link, useNavigate } from 'react-router-dom';
import './Products.css';

function Cart() {
    const { cart, loading, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleCheckout = async () => {
        if (!user) {
            alert('Please login to checkout');
            return;
        }

        try {
            const orderData = {
                userId: user.id,
                products: cart.items,
                totalAmount: cart.total
            };

            await orderAPI.createOrder(orderData);
            await clearCart();
            alert('Order placed successfully!');
            navigate('/orders'); // Assuming Orders page exists
        } catch (error) {
            console.error('Checkout failed', error);
            alert('Failed to place order. Please try again.');
        }
    };

    if (loading) return <div className="loading-container">Loading cart...</div>;

    if (!cart.items || cart.items.length === 0) {
        return (
            <div className="cart-page" style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>
                <h1>Your Cart is Empty</h1>
                <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    Browse Products
                </Link>
            </div>
        );
    }

    return (
        <div className="cart-page" style={{ padding: '2rem' }}>
            <h1 style={{ color: 'white', marginBottom: '2rem' }}>Shopping Cart</h1>

            <div className="glass-card" style={{ padding: '2rem' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Product ID</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Price</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Quantity</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem' }}>{item.productId}</td>
                                <td style={{ padding: '1rem' }}>${item.price}</td>
                                <td style={{ padding: '1rem' }}>{item.quantity}</td>
                                <td style={{ padding: '1rem' }}>${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '2rem', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <h3 style={{ color: 'white' }}>Total: ${cart.total?.toFixed(2) || '0.00'}</h3>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button className="btn" style={{ background: 'rgba(255,50,50,0.2)', color: 'white', border: '1px solid red' }} onClick={clearCart}>
                            Clear Cart
                        </button>
                        <button className="btn btn-primary" onClick={handleCheckout}>
                            Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cart;
