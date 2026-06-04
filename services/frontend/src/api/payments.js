import api from './client';

export const paymentAPI = {
    // POST /api/payments — confirms a PaymentIntent on the server
    // body: { orderId, amount, currency, token }  token = PaymentMethod id from Stripe.js
    charge: (data) => api.post('/payments', data),
};
