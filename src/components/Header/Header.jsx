import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Bot, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'
import useStore from '../../store/useStore'
import logoImg from '../../assets/logo.png'
import './Header.css'

const formatRelativeTime = (dateValue) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'now'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(1, Math.floor(diffMs / 60000))

  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, userRole, logout, reports, districtAdmins } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [readNotifIds, setReadNotifIds] = useState([])

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

  const actionNotifications = useMemo(() => {
    if (!isAuthenticated) return []

    const activeReports = Array.isArray(reports) ? reports : []
    const notifications = []
    const now = Date.now()

    if (['super_admin', 'district_admin'].includes(userRole)) {
      const unresolvedCritical = activeReports.filter((r) => r.severity === 'critical' && r.status !== 'resolved')
      if (unresolvedCritical.length > 0) {
        notifications.push({
          id: 'admin-critical',
          type: 'alert',
          message: `${unresolvedCritical.length} critical issues need immediate attention.`,
          time: formatRelativeTime(unresolvedCritical[0]?.updatedAt || unresolvedCritical[0]?.createdAt),
          actionPath: '/reports?severity=critical',
        })
      }

      const slaBreached = activeReports.filter((r) => r.status !== 'resolved' && new Date(r.slaDeadline).getTime() < now)
      if (slaBreached.length > 0) {
        notifications.push({
          id: 'admin-sla-breach',
          type: 'update',
          message: `${slaBreached.length} reports have breached SLA. Prioritize escalation.`,
          time: formatRelativeTime(slaBreached[0]?.slaDeadline),
          actionPath: '/reports?status=pending',
        })
      }

      const verificationQueue = activeReports.filter((r) => r.status === 'verified')
      if (verificationQueue.length > 0) {
        notifications.push({
          id: 'admin-verified',
          type: 'status',
          message: `${verificationQueue.length} verified reports are awaiting assignment.`,
          time: formatRelativeTime(verificationQueue[0]?.updatedAt || verificationQueue[0]?.createdAt),
          actionPath: '/reports?status=verified',
        })
      }

      if (userRole === 'super_admin') {
        const inactiveAdmins = (districtAdmins || []).filter((admin) => admin.status !== 'active')
        if (inactiveAdmins.length > 0) {
          notifications.push({
            id: 'super-inactive-admins',
            type: 'alert',
            message: `${inactiveAdmins.length} district admin accounts are inactive and need review.`,
            time: 'now',
            actionPath: '/admin/super#directory',
          })
        }
      }
    } else {
      const assigned = activeReports.filter((r) => r.status === 'assigned')
      if (assigned.length > 0) {
        notifications.push({
          id: `citizen-assigned-${assigned[0].id}`,
          type: 'status',
          message: `Your report ${assigned[0].id} has been assigned to a field team.`,
          time: formatRelativeTime(assigned[0].updatedAt || assigned[0].createdAt),
          actionPath: `/report/${assigned[0].id}`,
        })
      }

      const resolved = activeReports.filter((r) => r.status === 'resolved')
      if (resolved.length > 0) {
        notifications.push({
          id: `citizen-resolved-${resolved[0].id}`,
          type: 'resolved',
          message: `Report ${resolved[0].id} was resolved. Tap to review closure details.`,
          time: formatRelativeTime(resolved[0].updatedAt || resolved[0].createdAt),
          actionPath: `/report/${resolved[0].id}`,
        })
      }

      const pending = activeReports.filter((r) => r.status === 'pending')
      if (pending.length > 0) {
        notifications.push({
          id: `citizen-pending-${pending[0].id}`,
          type: 'update',
          message: `Report ${pending[0].id} is pending verification by district control room.`,
          time: formatRelativeTime(pending[0].createdAt),
          actionPath: '/dashboard',
        })
      }
    }

    if (notifications.length === 0) {
      notifications.push({
        id: 'system-clear',
        type: 'resolved',
        message: 'No pending alerts right now. Operations are stable.',
        time: 'now',
        actionPath: userRole === 'citizen' ? '/dashboard' : '/reports',
      })
    }

    return notifications.slice(0, 6).map((notif) => ({
      ...notif,
      read: readNotifIds.includes(notif.id),
    }))
  }, [isAuthenticated, reports, districtAdmins, userRole, readNotifIds])

  const unreadCount = actionNotifications.filter((n) => !n.read).length

  const handleNotificationClick = (notif) => {
    setReadNotifIds((prev) => (prev.includes(notif.id) ? prev : [...prev, notif.id]))
    setNotifOpen(false)

    if (notif.actionPath) {
      navigate(notif.actionPath)
    }
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
                      <div className="notif-header" style={{ borderBottom: '1px solid var(--signal-cyan)' }}>
                        <span className="text-mono" style={{ color: 'var(--signal-cyan)', fontWeight: 'bold' }}>
                          ACTION CENTER
                        </span>
                        <span className="badge badge-pending"><span className="badge-dot"></span>{unreadCount} new</span>
                      </div>
                      <div className="notif-list">
                        {actionNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`notif-item ${!notif.read ? 'notif-unread' : ''} notif-item-action`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className={`notif-icon-wrap notif-${notif.type}`}>
                              {notif.type === 'status' && <ClipboardList size={20} />}
                              {notif.type === 'update' && <Bot size={20} />}
                              {notif.type === 'resolved' && <CheckCircle size={20} />}
                              {notif.type === 'alert' && <AlertTriangle size={20} />}
                            </div>
                            <div className="notif-content">
                              <p>{notif.message}</p>
                              <span className="notif-time">{notif.time} • View</span>
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
