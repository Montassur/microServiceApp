import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/client'; // Assuming userAPI is exported from client.js

function Profile() {
    const { user, login } = useAuth(); // login function might be needed to update local user state if profile changes
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await userAPI.getProfile();
            const { firstName, lastName, email } = res.data.data;
            setFormData({ firstName, lastName, email });
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch profile', err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const res = await userAPI.updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName
            });
            setMessage('Profile updated successfully!');
            // Optionally update context user state here if needed
        } catch (err) {
            console.error('Failed to update profile', err);
            setMessage('Failed to update profile.');
        }
    };

    if (loading) return <div className="loading-container">Loading profile...</div>;

    return (
        <div className="profile-page" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
            <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>My Profile</h1>

            <div className="glass-card" style={{ padding: '2rem' }}>
                {message && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: '4px',
                        background: message.includes('success') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                        border: message.includes('success') ? '1px solid #4caf50' : '1px solid #f44336'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            disabled
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#aaa',
                                cursor: 'not-allowed'
                            }}
                        />
                        <small style={{ color: '#888' }}>Email cannot be changed</small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Update Profile
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Profile;
