import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const [activeFeature, setActiveFeature] = useState(0);
    const navigate = useNavigate();

    const features = [
        { title: "Modern Design", desc: "Crafted with the latest trends in glassmorphism and gradients." },
        { title: "High Performance", desc: "Powered by Vite for lightning fast HMR and optimized builds." },
        { title: "Secure Scaling", desc: "Dockerized architecture ready for any cloud provider." }
    ];

    return (
        <div className="home-page">
            <main className="hero">
                {/* Left Column: Briefing */}
                <div>
                    <h1>The Future of<br />Web Development</h1>
                    <p>
                        Experience the next generation of digital solutions.
                        Built with React, deployed with Docker, and served with Nginx.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/products')}>Get Started</button>
                        <button className="glass-card btn" style={{ color: 'white', background: 'rgba(255,255,255,0.05)' }} onClick={() => navigate('/about')}>Learn More</button>
                    </div>
                </div>

                {/* Right Column: Interactive Feature List */}
                <div className="glass-card animate-float" style={{ padding: '3rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Core Features</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {features.map((f, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    background: activeFeature === i ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    border: activeFeature === i ? '1px solid var(--primary)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={() => setActiveFeature(i)}
                            >
                                <h4 style={{ marginBottom: '0.5rem', color: activeFeature === i ? 'var(--primary)' : 'white' }}>{f.title}</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
