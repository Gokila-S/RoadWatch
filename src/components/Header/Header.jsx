import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Bot, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'
import useStore from '../../store/useStore'
import logoImg from '../../assets/logo.png'
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
    userRole === 'super_admin' ? [
      { path: '/admin/super', label: 'Super Admin' },
      { path: '/reports', label: 'All Reports' },
      { path: '/analytics', label: 'Analytics' },
    ] : userRole === 'district_admin' ? [
      { path: '/admin/district', label: 'Command Center' },
      { path: '/reports', label: 'All Reports' },
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
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoImg} alt="RoadWatch Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
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
                  {notifOpen && (() => {
                    const isAdmin = ['district_admin', 'super_admin'].includes(userRole)
                    
                    const adminNotifs = [
                      { id: 901, type: 'alert', message: '[CRITICAL ALERT] Severe road hazard detected in Sector 4. Immediate dispatch required.', time: '2m ago', read: false },
                      { id: 902, type: 'update', message: '[AI INTELLIGENCE] Detected cluster of 5 related pothole reports near Bellary Road. Auto-merged.', time: '1h ago', read: false },
                      { id: 903, type: 'status', message: '[DISPATCH] Field Unit Alpha arrived on site at NH-48.', time: '2h ago', read: true },
                      { id: 904, type: 'resolved', message: '[SLA MET] 3 high-severity anomalies resolved within 48h limit.', time: '5h ago', read: true }
                    ]
                    
                    const displayNotifs = isAdmin ? adminNotifs : notifications
                    const activeUnread = displayNotifs.filter(n => !n.read).length
                    
                    return (
                      <motion.div
                        className="notif-dropdown glass-panel"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="notif-header" style={{ borderBottom: isAdmin ? '1px solid var(--signal-cyan)' : '1px solid var(--border-dim)' }}>
                          <span className="text-mono" style={{ color: isAdmin ? 'var(--signal-cyan)' : 'inherit', fontWeight: isAdmin ? 'bold' : 'normal' }}>
                            {isAdmin ? 'SYSTEM ALERT LOG' : 'NOTIFICATIONS'}
                          </span>
                          <span className="badge badge-pending"><span className="badge-dot"></span>{activeUnread} new</span>
                        </div>
                        <div className="notif-list">
                          {displayNotifs.map(notif => (
                            <div
                              key={notif.id}
                              className={`notif-item ${!notif.read ? 'notif-unread' : ''}`}
                              onClick={() => markNotificationRead(notif.id)}
                            >
                              <div className={`notif-icon-wrap notif-${notif.type}`} style={{ borderRadius: isAdmin ? '4px' : 'var(--radius-md)' }}>
                                {notif.type === 'status' && <ClipboardList size={20} />}
                                {notif.type === 'update' && <Bot size={20} />}
                                {notif.type === 'resolved' && <CheckCircle size={20} />}
                                {notif.type === 'alert' && <AlertTriangle size={20} />}
                              </div>
                              <div className="notif-content">
                                <p style={{ fontFamily: isAdmin ? 'var(--font-mono)' : 'var(--font-body)', fontSize: isAdmin ? '0.75rem' : '0.82rem' }}>
                                  {notif.message}
                                </p>
                                <span className="notif-time">{notif.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>

              <div className="profile-wrapper">
                <button
                  className="profile-btn"
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
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
