import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore'
import logoImg from '../../assets/logo.png'
import './Header.css'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, userRole, logout } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-wrapper')) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = isAuthenticated ? (
    userRole === 'super_admin' ? [
      { path: '/admin/super', label: 'Super Admin' },
      { path: '/admin/announcements', label: 'Announcements' },
      { path: '/reports', label: 'All Reports' },
      { path: '/analytics', label: 'Analytics' },
    ] : userRole === 'district_admin' ? [
      { path: '/admin/district', label: 'Command Center' },
      { path: '/admin/announcements', label: 'Announcements' },
      { path: '/reports', label: 'All Reports' },
      { path: '/analytics', label: 'Analytics' },
    ] : [
      { path: '/announcements', label: 'Announcements' },
      { path: '/dashboard', label: 'My Reports' },
      { path: '/report', label: 'Report Issue' },
    ]
  ) : [
    { path: '/', label: 'Home' },
    { path: '/login', label: 'Sign In' },
  ]

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoImg} alt="RoadWatch Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <span className="logo-name">ROADWATCH</span>
            <span className="logo-tag">SMART CITY INTELLIGENCE</span>
          </div>
        </Link>

        {/* Mobile overlay backdrop */}
        {menuOpen && (
          <div 
            className="mobile-nav-backdrop"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <nav className={`header-nav ${menuOpen ? 'nav-open' : ''}`}>
          {/* Mobile nav close button inside nav */}
          <button className="mobile-nav-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ✕
          </button>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {location.pathname === link.path && (
                <motion.div className="nav-indicator" layoutId="navIndicator" />
              )}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {isAuthenticated && (
            <>
              <div className="profile-wrapper">
                <button
                  className="profile-btn"
                  onClick={() => { setProfileOpen(!profileOpen) }}
                  id="profile-menu"
                >
                  {['district_admin', 'super_admin'].includes(userRole) ? (
                    <div className="admin-avatar-hex-sm" style={{ width: '24px', height: '24px', borderRadius: '4px' }}>
                      <span className="hex-inner-sm" style={{ fontSize: '0.7rem' }}>{user?.name?.charAt(0)}</span>
                    </div>
                  ) : (
                    <div className="profile-avatar">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                  <span className="profile-name">{user?.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="profile-dropdown glass-panel"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{ 
                        width: ['district_admin', 'super_admin'].includes(userRole) ? '320px' : '220px', 
                        padding: ['district_admin', 'super_admin'].includes(userRole) ? '16px' : '12px' 
                      }}
                    >
                      {['district_admin', 'super_admin'].includes(userRole) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, paddingBottom: '12px' }}>
                          <div className="admin-avatar-hex-sm" style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                            <span className="hex-inner-sm" style={{ fontSize: '1.2rem', color: 'var(--signal-cyan)' }}>{user?.name?.charAt(0) || 'A'}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--signal-cyan)', letterSpacing: '0.1em', marginBottom: '2px' }}>
                              COMMANDER // {user?.district?.toUpperCase() || 'GLOBAL'}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{user?.name}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="profile-info">
                          <div className="profile-avatar profile-avatar-lg">{user?.name?.charAt(0)}</div>
                          <div>
                            <p className="profile-dropdown-name">{user?.name}</p>
                            <p className="text-mono text-dim">{user?.role?.toUpperCase()}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="profile-divider" style={{ margin: '8px 0' }}></div>
                      
                      <button className="profile-option" onClick={handleLogout}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <Link to="/login" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          )}

          {/* Hamburger - always rightmost */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{ position: 'relative', zIndex: 10001 }}
          >
            <span className={`hamburger ${menuOpen ? 'hamburger-open' : ''}`}>
              <span></span><span></span><span></span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
