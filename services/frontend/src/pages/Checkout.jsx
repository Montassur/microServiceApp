import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { orderAPI } from '../api/orders';
import { paymentAPI } from '../api/payments';
import './Products.css';

// Vite exposes env vars prefixed with VITE_ via import.meta.env
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

const cardElementOptions = {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '16px',
            '::placeholder': { color: 'rgba(255,255,255,0.5)' },
        },
        invalid: { color: '#ff5577' },
    },
    hidePostalCode: true,
};

function CheckoutForm() {
    const stripe = useStripe();
    const elements = useElements();
    const { user } = useAuth();
    const { cart, clearCart } = useCart();
    const navigate = useNavigate();

    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [step, setStep] = useState('form');  // form | success

    const total = cart.total || 0;
    const items = cart.items || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!stripe || !elements) {
            setErrorMsg('Stripe is not ready yet — please wait a moment and retry.');
            return;
        }
        if (!user) {
            setErrorMsg('You must be logged in to pay.');
            return;
        }
        if (items.length === 0) {
            setErrorMsg('Your cart is empty.');
            return;
        }

        setProcessing(true);
        try {
            // 1. Create the order first (status PENDING)
            const orderRes = await orderAPI.createOrder({
                userId: user.id,
                products: items,
                totalAmount: total,
            });
            const orderId = orderRes.data?.id || orderRes.data?.orderId;
            if (!orderId) throw new Error('Could not create order');

            // 2. Create a PaymentMethod from the card details entered
            const card = elements.getElement(CardElement);
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card,
                billing_details: {
                    email: user.email,
                    name: user.name,
                },
            });
            if (pmError) throw new Error(pmError.message);

            // 3. Send the PaymentMethod id to our backend, which creates +
            //    confirms the PaymentIntent on the server side (with our
            //    Stripe secret key). On success, the order is marked PAID
            //    by the order-payment service via the PAYMENT_PROCESSED event.
            const paymentRes = await paymentAPI.charge({
                orderId,
                amount: total,
                currency: 'usd',
                token: paymentMethod.id,
            });

            if (paymentRes.data?.status !== 'COMPLETED') {
                throw new Error('Payment was not completed');
            }

            // 4. All good — empty the cart and flip the UI to success
            await clearCart();
            setStep('success');
            setTimeout(() => navigate('/orders'), 2500);
        } catch (err) {
            console.error('Checkout failed', err);
            setErrorMsg(err?.response?.data?.error || err.message || 'Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    if (step === 'success') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '5rem' }}>✅</div>
                <h1>Payment successful</h1>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Your order has been marked as <strong>PAID</strong>. Redirecting to your orders…
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: 560, margin: '0 auto', color: 'white' }}>
            <h1 style={{ marginBottom: '2rem' }}>Checkout</h1>

            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Order summary</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {items.map((it, i) => (
                        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                            <span>Product #{it.productId} × {it.quantity}</span>
                            <span>${(it.price * it.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Card details</h3>
                <div style={{
                    padding: '1rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    <CardElement options={cardElementOptions} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
                    Test card&nbsp;: <code>4242 4242 4242 4242</code> &nbsp;•&nbsp; any future date &nbsp;•&nbsp; any 3-digit CVC
                </p>
            </div>

            {errorMsg && (
                <div style={{
                    background: 'rgba(255,85,119,0.15)',
                    border: '1px solid #ff5577',
                    color: '#ff8899',
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                }}>{errorMsg}</div>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                disabled={!stripe || processing}
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
                {processing ? 'Processing…' : `Pay $${total.toFixed(2)}`}
            </button>
        </form>
    );
}

function Checkout() {
    const navigate = useNavigate();
    const { cart, loading } = useCart();

    useEffect(() => {
        if (!loading && (!cart.items || cart.items.length === 0)) {
            navigate('/cart');
        }
    }, [loading, cart, navigate]);

    if (!STRIPE_PUBLIC_KEY) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'white' }}>
                <h2>Stripe not configured</h2>
                <p>Set <code>VITE_STRIPE_PUBLIC_KEY</code> in the frontend env and rebuild.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <Elements stripe={stripePromise}>
                <CheckoutForm />
            </Elements>
        </div>
    );
}

export default Checkout;
