import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore'
import './Header.css'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, userRole, logout, unreadCount, notifications, markNotificationRead } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setNotifOpen(false)
    setProfileOpen(false)
  }, [location])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = isAuthenticated ? (
    userRole === 'superadmin' ? [
      { path: '/admin', label: 'Command Center' },
      { path: '/analytics', label: 'Analytics' },
    ] : userRole === 'admin' ? [
      { path: '/admin', label: 'Command Center' },
      { path: '/analytics', label: 'Analytics' },
    ] : [
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
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L2 8v12l12 6 12-6V8L14 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M14 2v24M2 8l12 6 12-6" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="14" cy="14" r="3" fill="var(--amber)"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">ROADWATCH</span>
            <span className="logo-tag">SMART CITY INTELLIGENCE</span>
          </div>
        </Link>

        <nav className={`header-nav ${menuOpen ? 'nav-open' : ''}`}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-active' : ''}`}
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
              <div className="notif-wrapper">
                <button
                  className="btn-icon header-icon-btn"
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                  id="notification-bell"
                  aria-label="Notifications"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      className="notif-dropdown glass-panel"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="notif-header">
                        <span className="text-mono">NOTIFICATIONS</span>
                        <span className="badge badge-pending"><span className="badge-dot"></span>{unreadCount} new</span>
                      </div>
                      <div className="notif-list">
                        {notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`notif-item ${!notif.read ? 'notif-unread' : ''}`}
                            onClick={() => markNotificationRead(notif.id)}
                          >
                            <div className={`notif-icon-wrap notif-${notif.type}`}>
                              {notif.type === 'status' && '📋'}
                              {notif.type === 'update' && '🤖'}
                              {notif.type === 'resolved' && '✅'}
                              {notif.type === 'alert' && '🚨'}
                            </div>
                            <div className="notif-content">
                              <p>{notif.message}</p>
                              <span className="notif-time">{notif.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="profile-wrapper">
                <button
                  className="profile-btn"
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                  id="profile-menu"
                >
                  <div className="profile-avatar">
                    {user?.name?.charAt(0)}
                  </div>
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
                    >
                      <div className="profile-info">
                        <div className="profile-avatar profile-avatar-lg">{user?.name?.charAt(0)}</div>
                        <div>
                          <p className="profile-dropdown-name">{user?.name}</p>
                          <p className="text-mono text-dim">{user?.role?.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="profile-divider"></div>
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

          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
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
