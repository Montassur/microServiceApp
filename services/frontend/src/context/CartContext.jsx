/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import { cartAPI } from '../api/cart';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(false);

    // Fetch cart on load if user is logged in; clear when user logs out.
    useEffect(() => {
        if (!user) {
            // Reset on logout — legitimate sync with external (auth) state.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCart({ items: [], total: 0 });
            return;
        }
        const fetchCart = async () => {
            try {
                setLoading(true);
                const res = await cartAPI.getCart(user.id);
                setCart(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch cart', err);
                setLoading(false);
            }
        };
        fetchCart();
    }, [user]);

    const addToCart = async (product, quantity = 1) => {
        if (!user) {
            alert('Please login to add to cart'); // Simple fallback
            return;
        }

        try {
            const res = await cartAPI.addItem(user.id, {
                productId: product.id,
                quantity,
                price: product.price
                // In a real app we might verify price on backend to avoid tampering
            });
            setCart(res.data);
            alert('Added to cart!'); // User feedback
        } catch (err) {
            console.error('Failed to add to cart', err);
            alert('Failed to add to cart');
        }
    };

    const clearCart = async () => {
        if (!user) return;
        try {
            await cartAPI.clearCart(user.id);
            setCart({ items: [], total: 0 });
        } catch (err) {
            console.error('Failed to clear cart', err);
        }
    };

    return (
        <CartContext.Provider value={{ cart, loading, addToCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
