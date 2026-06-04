/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { authAPI } from '../api/client';

/**
 * Reusable 6-digit code prompt. Used both for:
 *  - enrolling 2FA from Settings
 *  - completing login when the backend says { needs_2fa: true }
 *
 * Props:
 *   email       — the user's email (the OTP was sent there)
 *   title       — heading shown in the modal
 *   onSuccess   — callback({ token?, user? }) when /verify returns ok
 *   onClose     — called when the user dismisses the modal
 *   onResend    — optional callback when the user clicks "Resend code"
 */
function OTPModal({ email, title = 'Verify your email', onSuccess, onClose, onResend }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (code.length !== 6) {
            setError('Code must be 6 digits.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.twoFAVerify(email, code);
            onSuccess(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError('');
        try {
            await authAPI.twoFARequest(email);
            if (onResend) onResend();
        } catch (err) {
            setError(err?.response?.data?.error || 'Could not resend');
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <form
                style={cardStyle}
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
            >
                <h3 style={{ marginTop: 0 }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    We sent a 6-digit code to <strong>{email}</strong>. Check your inbox
                    (and spam folder) — it expires in 10 minutes.
                </p>

                <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    style={inputStyle}
                />

                {error && <div style={errorStyle}>{error}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={resend}
                        style={{ flex: 1 }}
                    >
                        Resend code
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || code.length !== 6}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'Verifying…' : 'Verify'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 12,
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    Cancel
                </button>
            </form>
        </div>
    );
}

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const cardStyle = {
    background: '#16213e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 28,
    maxWidth: 420,
    width: '92%',
    color: 'white',
};

const inputStyle = {
    width: '100%',
    fontSize: 32,
    letterSpacing: 10,
    textAlign: 'center',
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: 'white',
    fontFamily: 'monospace',
};

const errorStyle = {
    marginTop: 10,
    padding: '8px 12px',
    background: 'rgba(255,85,119,0.15)',
    border: '1px solid #ff5577',
    color: '#ff8899',
    borderRadius: 6,
    fontSize: 14,
};

export default OTPModal;
