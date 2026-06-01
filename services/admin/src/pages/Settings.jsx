import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import './Settings.css';

function Settings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        siteName: 'AuraWeb Admin',
        siteUrl: 'https://admin.auraweb.com',
        description: 'Modern admin panel for managing users and content',
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        theme: 'dark',
        emailNotifications: true,
        pushNotifications: false,
        weeklyReports: true,
    });

    const handleSave = () => {
        toast.success('Settings saved successfully!');
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
                <button
                    className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
                    onClick={() => setActiveTab('api')}
                >
                    🔑 API Keys
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
                            <p className="card-description">Add an extra layer of security to your account</p>
                            <button className="btn" onClick={() => toast.info('2FA setup coming soon')}>
                                Enable 2FA
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="settings-section">
                        <div className="card">
                            <h3>Notification Preferences</h3>
                            <div className="toggle-group">
                                <div className="toggle-item">
                                    <div>
                                        <div className="toggle-label">Email Notifications</div>
                                        <div className="toggle-description">Receive email updates about your account</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotifications}
                                            onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div>
                                        <div className="toggle-label">Push Notifications</div>
                                        <div className="toggle-description">Get push notifications in your browser</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.pushNotifications}
                                            onChange={(e) => handleChange('pushNotifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div>
                                        <div className="toggle-label">Weekly Reports</div>
                                        <div className="toggle-description">Receive weekly summary reports</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.weeklyReports}
                                            onChange={(e) => handleChange('weeklyReports', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'api' && (
                    <div className="settings-section">
                        <div className="card">
                            <h3>API Keys</h3>
                            <p className="card-description">Manage your API keys for external integrations</p>
                            <div className="api-key-item">
                                <div className="api-key-info">
                                    <div className="api-key-name">Production API Key</div>
                                    <code className="api-key-value">ak_prod_••••••••••••••••</code>
                                </div>
                                <button className="btn btn-sm" onClick={() => toast.info('API key copied to clipboard')}>
                                    📋 Copy
                                </button>
                            </div>
                            <button className="btn btn-primary" onClick={() => toast.success('New API key generated!')}>
                                ➕ Generate New Key
                            </button>
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
        </div>
    );
}

export default Settings;
