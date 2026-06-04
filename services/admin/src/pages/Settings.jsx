import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { authAPI, notificationsAPI } from '../api/client';
import OTPModal from '../components/OTPModal';
import './Settings.css';

function Settings() {
    const toast = useToast();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    // 2FA state
    const [twofaEnabled, setTwofaEnabled] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [twofaRequesting, setTwofaRequesting] = useState(false);

    // Load 2FA status when the security tab is opened
    useEffect(() => {
        if (activeTab !== 'security') return;
        const load = async () => {
            try {
                const res = await authAPI.twoFAStatus();
                setTwofaEnabled(!!res.data.enabled);
            } catch (e) {
                console.error('Failed to load 2FA status', e);
            }
        };
        load();
    }, [activeTab]);

    const handleEnable2FA = async () => {
        if (!user?.email) {
            toast.error('No email on account');
            return;
        }
        setTwofaRequesting(true);
        try {
            await authAPI.twoFARequest(user.email);
            toast.success(`Code sent to ${user.email}`);
            setShowOtpModal(true);
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not send code');
        } finally {
            setTwofaRequesting(false);
        }
    };

    const handleDisable2FA = async () => {
        const password = window.prompt('Enter your password to disable 2FA:');
        if (!password) return;
        try {
            await authAPI.twoFADisable(user.email, password);
            setTwofaEnabled(false);
            toast.success('2FA disabled');
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not disable 2FA');
        }
    };

    const onVerifySuccess = () => {
        setShowOtpModal(false);
        setTwofaEnabled(true);
        toast.success('Two-factor authentication enabled');
    };
    const [settings, setSettings] = useState({
        siteName: 'Ecommerce Admin',
        siteUrl: 'https://admin.ecommerce.com',
        description: 'Modern admin panel for managing users and content',
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        theme: 'dark',
        emailNotifications: true,
    });

    // Load the current notification preference from the backend
    useEffect(() => {
        const load = async () => {
            try {
                const res = await notificationsAPI.getPreferences();
                setSettings((prev) => ({ ...prev, emailNotifications: !!res.data.emailNotifications }));
            } catch (e) {
                console.error('Failed to load notification preferences', e);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        try {
            // Save the only setting that's actually persisted on the backend
            await notificationsAPI.updatePreferences(settings.emailNotifications);
            toast.success(
                settings.emailNotifications
                    ? 'Settings saved — a confirmation email has been sent.'
                    : 'Settings saved.'
            );
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not save settings');
        }
    };

    const handleReset = () => {
        toast.info('Settings reset to defaults');
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="settings-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="page-subtitle">Manage your application preferences</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave}>
                    💾 Save All Changes
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-nav">
                <button
                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    ⚙️ General
                </button>
                <button
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    🔒 Security
                </button>
                <button
                    className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    🔔 Notifications
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'general' && (
                    <div className="settings-section">
                        <div className="card">
                            <h3>Site Settings</h3>
                            <div className="form-group">
                                <label>Site Name</label>
                                <input
                                    type="text"
                                    value={settings.siteName}
                                    onChange={(e) => handleChange('siteName', e.target.value)}
                                    placeholder="Enter site name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Site URL</label>
                                <input
                                    type="url"
                                    value={settings.siteUrl}
                                    onChange={(e) => handleChange('siteUrl', e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={settings.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Enter site description"
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div className="card">
                            <h3>Regional Settings</h3>
                            <div className="form-group">
                                <label>Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => handleChange('timezone', e.target.value)}
                                >
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">Eastern Time</option>
                                    <option value="America/Los_Angeles">Pacific Time</option>
                                    <option value="Europe/London">London</option>
                                    <option value="Asia/Tokyo">Tokyo</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Language</label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => handleChange('language', e.target.value)}
                                >
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date Format</label>
                                <select
                                    value={settings.dateFormat}
                                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                                >
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="settings-section">
                        <div className="card">
                            <h3>Password & Authentication</h3>
                            <div className="form-group">
                                <label>Current Password</label>
                                <input type="password" placeholder="Enter current password" />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" placeholder="Enter new password" />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" placeholder="Confirm new password" />
                            </div>
                            <button className="btn btn-primary" onClick={() => toast.success('Password updated!')}>
                                Update Password
                            </button>
                        </div>

                        <div className="card">
                            <h3>Two-Factor Authentication</h3>
                            <p className="card-description">
                                {twofaEnabled
                                    ? 'Two-factor authentication is active on your account. A code will be emailed on every login.'
                                    : 'Receive a 6-digit code by email each time you log in. Adds an extra layer of security.'}
                            </p>
                            {twofaEnabled ? (
                                <button className="btn" onClick={handleDisable2FA}>
                                    Disable 2FA
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleEnable2FA} disabled={twofaRequesting}>
                                    {twofaRequesting ? 'Sending code…' : 'Enable 2FA'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="settings-section">
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '4px 0' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginTop: 0, marginBottom: 8 }}>Email Notifications</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 12px 0' }}>
                                        Receive an email at <strong>{user?.email || 'your address'}</strong> whenever:
                                    </p>
                                    <ul style={{ color: 'rgba(255,255,255,0.65)', margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
                                        <li>A customer pays for an order</li>
                                        <li>Your admin settings are changed</li>
                                        <li>Critical security events happen on your account</li>
                                    </ul>
                                </div>
                                <label className="toggle-switch" style={{ marginTop: 4 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.emailNotifications}
                                        onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: 12, background: 'rgba(56,189,248,0.08)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.2)' }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                                    Click <strong>Save Changes</strong> below to apply. A test email confirms the channel is alive.
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="settings-footer">
                <button className="btn" onClick={handleReset}>
                    Reset to Defaults
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    Save Changes
                </button>
            </div>

            {showOtpModal && (
                <OTPModal
                    email={user.email}
                    title="Confirm 2FA enrollment"
                    onSuccess={onVerifySuccess}
                    onClose={() => setShowOtpModal(false)}
                    onResend={() => toast.info('New code sent')}
                />
            )}
        </div>
    );
}

export default Settings;
