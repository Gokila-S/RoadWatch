import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import MapView from '../../components/MapView/MapView'
import useStore from '../../store/useStore'
import logoImg from '../../assets/logo.png'
import './Landing.css'

const Landing = () => {
  const { reports, getStats } = useStore()
  const stats = getStats()
  const [counters, setCounters] = useState({ resolved: 0, active: 0, citizens: 0 })
  const heroRef = useRef(null)

  // Animated counter
  useEffect(() => {
    const targets = { resolved: stats.totalResolved, active: stats.total, citizens: stats.citizenCount }
    const duration = 2000
    const steps = 60
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = Math.min(step / steps, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCounters({
        resolved: Math.round(targets.resolved * eased),
        active: Math.round(targets.active * eased),
        citizens: Math.round(targets.citizens * eased),
      })
      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [])

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      ),
      title: 'Real-Time Tracking',
      description: 'Monitor your reports from submission to resolution with live status updates and SLA tracking.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      title: 'AI Validation',
      description: 'Advanced computer vision validates reports instantly, ensuring accuracy and faster response times.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: 'Geo-Tagged Reports',
      description: 'Automatic location detection pins every report precisely on the city intelligence map.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
      title: 'District Analytics',
      description: 'Deep performance insights help administrators optimize resource allocation across districts.',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  }

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="hero-map-bg">
          <MapView
            reports={reports}
            center={[11.15, 77.65]}
            zoom={9}
            interactive={false}
            height="100%"
            className="hero-map"
          />
          <div className="hero-map-overlay"></div>
        </div>

        <div className="hero-content container">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="hero-badge">
              <span className="badge-dot" style={{ background: 'var(--signal-green)' }}></span>
              <span className="text-mono">SYSTEM ACTIVE — LIVE MONITORING</span>
            </div>
            <h1 className="heading-display heading-xl hero-title">
              ROAD<br />
              <span className="text-accent">INTELLIGENCE</span><br />
              PLATFORM
            </h1>
            <p className="hero-subtitle">
              Report road hazards. Track resolutions. AI-validated civic infrastructure
              monitoring for smarter, safer cities.
            </p>
            <div className="hero-actions">
              <Link to="/report" className="btn btn-primary btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Report an Issue
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                View Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="hero-stats"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="hero-stat glass-panel-sm">
              <div className="hero-stat-value">{counters.resolved.toLocaleString()}</div>
              <div className="hero-stat-label">Issues Resolved</div>
              <div className="hero-stat-bar">
                <motion.div
                  className="hero-stat-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  style={{ background: 'var(--signal-green)' }}
                />
              </div>
            </div>
            <div className="hero-stat glass-panel-sm">
              <div className="hero-stat-value">{counters.active}</div>
              <div className="hero-stat-label">Active Reports</div>
              <div className="hero-stat-bar">
                <motion.div
                  className="hero-stat-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '35%' }}
                  transition={{ duration: 1.5, delay: 0.6 }}
                  style={{ background: 'var(--amber)' }}
                />
              </div>
            </div>
            <div className="hero-stat glass-panel-sm">
              <div className="hero-stat-value">{counters.citizens.toLocaleString()}</div>
              <div className="hero-stat-label">Active Citizens</div>
              <div className="hero-stat-bar">
                <motion.div
                  className="hero-stat-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '72%' }}
                  transition={{ duration: 1.5, delay: 0.7 }}
                  style={{ background: 'var(--signal-cyan)' }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scan line effect */}
        <div className="hero-scanline"></div>
      </section>

      {/* Trust Bar */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-items">
            <div className="trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--signal-green)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Government Validated</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--signal-cyan)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>End-to-End Encrypted</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>
              </svg>
              <span>AI-Powered Validation</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--signal-purple)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span>24/7 SLA Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-mono text-accent">// CAPABILITIES</span>
            <h2 className="heading-display heading-lg">
              Intelligent Infrastructure<br />Monitoring
            </h2>
            <p className="section-subtitle">
              Enterprise-grade tools for citizens and administrators to maintain
              road quality across every district.
            </p>
          </motion.div>

          <motion.div
            className="features-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, i) => (
              <motion.div key={i} className="feature-card card" variants={itemVariants}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
                <div className="feature-line"></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-mono text-accent">// WORKFLOW</span>
            <h2 className="heading-display heading-lg">How RoadWatch Works</h2>
          </motion.div>

          <div className="workflow-steps">
            {[
              { step: '01', title: 'Capture', desc: 'Take a photo of the road issue. Our app auto-detects your GPS location.' },
              { step: '02', title: 'Validate', desc: 'AI analyzes the image for issue classification and severity assessment.' },
              { step: '03', title: 'Route', desc: 'Report is automatically routed to the correct district administrator.' },
              { step: '04', title: 'Resolve', desc: 'Field teams are dispatched. Track progress until resolution.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="workflow-step"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="workflow-number">{item.step}</div>
                <div className="workflow-connector"></div>
                <div className="workflow-content">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-card glass-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta-content">
              <h2 className="heading-display heading-md">
                Your voice shapes better roads.
              </h2>
              <p className="text-muted">
                Join thousands of citizens building safer infrastructure through data-driven reporting.
              </p>
              <div className="cta-actions">
                <Link to="/report" className="btn btn-primary btn-lg">
                  Report an Issue Now
                </Link>
                <Link to="/login" className="btn btn-ghost btn-lg">
                  Sign In as Admin →
                </Link>
              </div>
            </div>
            <div className="cta-decoration">
              <div className="cta-ring cta-ring-1"></div>
              <div className="cta-ring cta-ring-2"></div>
              <div className="cta-ring cta-ring-3"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logoImg} alt="RoadWatch Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>ROADWATCH</span>
              </div>
              <p className="text-muted" style={{ marginTop: '12px', fontSize: '0.82rem', maxWidth: '300px' }}>
                Smart City Road Intelligence Platform. Making civic infrastructure responsive through technology.
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Platform</h4>
                <a href="#">Report Issue</a>
                <a href="#">Dashboard</a>
                <a href="#">Analytics</a>
              </div>
              <div className="footer-col">
                <h4>Resources</h4>
                <a href="#">API Docs</a>
                <a href="#">Open Data</a>
                <a href="#">Status</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">DPDP Act</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="text-mono text-dim">© 2026 ROADWATCH. SMART CITY INITIATIVE.</span>
            <span className="text-mono text-dim">v2.4.1</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
