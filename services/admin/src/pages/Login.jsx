import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPModal from '../components/OTPModal';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pending2faEmail, setPending2faEmail] = useState(null);
    const { login, completeLoginWith2FA } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);
            // Step-up: backend asked for an OTP, show the modal instead of redirecting.
            if (result && result.needs2fa) {
                setPending2faEmail(result.email);
                return;
            }
            navigate('/admin');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed';

            if (errorMessage.includes('Admin role required')) {
                setError('Access denied: You must be an administrator to access this panel');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const on2FASuccess = (data) => {
        try {
            completeLoginWith2FA(data);
            setPending2faEmail(null);
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Login failed');
            setPending2faEmail(null);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-container">
                <div className="admin-login-header">
                    <h1>Admin Panel</h1>
                    <p>Sign in to access the dashboard</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="admin-login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="admin@example.com"
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="admin-login-footer">
                    <p>⚠️ Admin access only</p>
                </div>
            {pending2faEmail && (
                <OTPModal
                    email={pending2faEmail}
                    title="Two-factor verification"
                    onSuccess={on2FASuccess}
                    onClose={() => setPending2faEmail(null)}
                />
            )}

            </div>
        </div>
    );
}

export default Login;
