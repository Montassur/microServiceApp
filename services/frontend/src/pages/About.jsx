import './About.css';

function About() {
    const team = [
        { name: 'Sarah Johnson', role: 'CEO & Founder', image: '👩‍💼' },
        { name: 'Michael Chen', role: 'CTO', image: '👨‍💻' },
        { name: 'Emily Rodriguez', role: 'Head of Design', image: '👩‍🎨' },
        { name: 'David Kim', role: 'Lead Developer', image: '👨‍🔧' }
    ];

    const stats = [
        { value: '10K+', label: 'Active Users' },
        { value: '99.9%', label: 'Uptime' },
        { value: '24/7', label: 'Support' },
        { value: '50+', label: 'Countries' }
    ];

    return (
        <div className="about-page">
            <div className="about-hero glass-card">
                <h1>About AuraWeb</h1>
                <p className="hero-subtitle">
                    Building the future of web development, one innovation at a time
                </p>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card glass-card">
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="mission-section">
                <div className="glass-card">
                    <h2>Our Mission</h2>
                    <p>
                        At AuraWeb, we're committed to delivering cutting-edge web solutions that empower
                        businesses to thrive in the digital age. Our mission is to make advanced technology
                        accessible, reliable, and beautiful.
                    </p>
                </div>

                <div className="glass-card">
                    <h2>Our Vision</h2>
                    <p>
                        We envision a world where every business, regardless of size, has access to
                        enterprise-grade infrastructure and tools. Through innovation and dedication,
                        we're making that vision a reality.
                    </p>
                </div>
            </div>

            <div className="team-section">
                <h2>Meet Our Team</h2>
                <div className="team-grid">
                    {team.map((member, idx) => (
                        <div key={idx} className="team-card glass-card">
                            <div className="team-avatar">{member.image}</div>
                            <h3>{member.name}</h3>
                            <p>{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="values-section glass-card">
                <h2>Our Values</h2>
                <div className="values-grid">
                    <div className="value-item">
                        <div className="value-icon">🚀</div>
                        <h3>Innovation</h3>
                        <p>Constantly pushing boundaries and exploring new possibilities</p>
                    </div>
                    <div className="value-item">
                        <div className="value-icon">🤝</div>
                        <h3>Collaboration</h3>
                        <p>Working together to achieve extraordinary results</p>
                    </div>
                    <div className="value-item">
                        <div className="value-icon">💎</div>
                        <h3>Excellence</h3>
                        <p>Delivering quality in everything we do</p>
                    </div>
                    <div className="value-item">
                        <div className="value-icon">🌟</div>
                        <h3>Integrity</h3>
                        <p>Building trust through transparency and honesty</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;
