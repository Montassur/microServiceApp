import { useState } from 'react';
import './Contact.css';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you would typically send the form data to your backend
        console.log('Form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    const contactInfo = [
        { icon: '📧', label: 'Email', value: 'hello@auraweb.com' },
        { icon: '📞', label: 'Phone', value: '+1 (555) 123-4567' },
        { icon: '📍', label: 'Address', value: '123 Tech Street, San Francisco, CA 94105' },
        { icon: '🕐', label: 'Hours', value: 'Mon-Fri: 9AM - 6PM PST' }
    ];

    return (
        <div className="contact-page">
            <div className="contact-header">
                <h1>Get In Touch</h1>
                <p>Have a question or want to work together? We'd love to hear from you!</p>
            </div>

            <div className="contact-container">
                <div className="contact-info glass-card">
                    <h2>Contact Information</h2>
                    <div className="info-list">
                        {contactInfo.map((info, idx) => (
                            <div key={idx} className="info-item">
                                <div className="info-icon">{info.icon}</div>
                                <div className="info-content">
                                    <div className="info-label">{info.label}</div>
                                    <div className="info-value">{info.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="social-links">
                        <h3>Follow Us</h3>
                        <div className="social-icons">
                            <a href="#" className="social-icon">🐦</a>
                            <a href="#" className="social-icon">💼</a>
                            <a href="#" className="social-icon">📘</a>
                            <a href="#" className="social-icon">📷</a>
                        </div>
                    </div>
                </div>

                <div className="contact-form-container glass-card">
                    <h2>Send Us a Message</h2>
                    {submitted && (
                        <div className="success-message">
                            ✓ Message sent successfully! We'll get back to you soon.
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="contact-form">
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Your name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                placeholder="What is this about?"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows="5"
                                placeholder="Tell us more..."
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Contact;
