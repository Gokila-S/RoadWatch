import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Lock, Eye, EyeOff, X, Key } from 'lucide-react'
import useStore from '../../store/useStore'
import logoImg from '../../assets/logo.png'
import './Header.css'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, userRole, logout, theme, toggleTheme, changePassword } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Password change states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setChangePasswordError('')
    setChangePasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long')
      return
    }

    setChangePasswordLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setChangePasswordSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowChangePasswordModal(false)
        setChangePasswordSuccess('')
      }, 1500)
    } catch (err) {
      setChangePasswordError(err.message || 'Failed to update password')
    } finally {
      setChangePasswordLoading(false)
    }
  }

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
      { path: '/check-road', label: 'Check Road' },
      { path: '/announcements', label: 'Announcements' },
      { path: '/dashboard', label: 'My Reports' },
      { path: '/report', label: 'Report Issue' },
    ]
  ) : [
    { path: '/', label: 'Home' },
    { path: '/check-road', label: 'Check Road' },
    { path: '/login', label: 'Sign In' },
  ]

  return (
    <>
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
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle Theme"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              marginRight: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--border-medium)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

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
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{user?.name}</div>
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
                      
                      <button className="profile-option" onClick={() => { setShowChangePasswordModal(true); setProfileOpen(false); }} style={{ gap: '10px' }}>
                        <Key size={16} style={{ color: 'var(--amber)', transform: 'rotate(-45deg)' }} />
                        Change Password
                      </button>

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
      
      {/* 🔐 CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <>
            <motion.div 
              className="sa-modal-backdrop" 
              style={{ zIndex: 99999 }}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowChangePasswordModal(false)} 
            />
            <div className="sa-modal-center-wrap" style={{ zIndex: 100000 }}>
              <motion.div 
                className="sa-modal glass-panel" 
                style={{ maxWidth: '420px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="sa-modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={20} className="text-accent" />
                    <div>
                      <h3 className="sa-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Change Password</h3>
                      <p className="sa-modal-sub" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Update your security credentials</p>
                    </div>
                  </div>
                  <button className="sa-modal-close" onClick={() => setShowChangePasswordModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                <form onSubmit={handleChangePassword}>
                  {changePasswordError && (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--signal-red)', fontSize: '0.78rem', marginBottom: '16px' }}>
                      {changePasswordError}
                    </div>
                  )}
                  {changePasswordSuccess && (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--signal-green)', fontSize: '0.78rem', marginBottom: '16px' }}>
                      {changePasswordSuccess}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    <div className="sa-field">
                      <label className="sa-label" htmlFor="curr_pw" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Current Password</label>
                      <div className="sa-input-wrap" style={{ position: 'relative' }}>
                        <Lock size={14} className="sa-input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input 
                          id="curr_pw"
                          type={showCurrentPassword ? 'text' : 'password'} 
                          className="sa-input" 
                          style={{ width: '100%', paddingLeft: '36px', paddingRight: '36px', height: '40px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)' }}
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                        />
                        <button type="button" className="sa-pw-toggle" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="sa-field">
                      <label className="sa-label" htmlFor="new_pw" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>New Password</label>
                      <div className="sa-input-wrap" style={{ position: 'relative' }}>
                        <Lock size={14} className="sa-input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input 
                          id="new_pw"
                          type={showNewPassword ? 'text' : 'password'} 
                          className="sa-input" 
                          style={{ width: '100%', paddingLeft: '36px', paddingRight: '36px', height: '40px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)' }}
                          placeholder="Min 8 characters"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <button type="button" className="sa-pw-toggle" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="sa-field">
                      <label className="sa-label" htmlFor="confirm_pw" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Confirm New Password</label>
                      <div className="sa-input-wrap" style={{ position: 'relative' }}>
                        <Lock size={14} className="sa-input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input 
                          id="confirm_pw"
                          type={showConfirmPassword ? 'text' : 'password'} 
                          className="sa-input" 
                          style={{ width: '100%', paddingLeft: '36px', paddingRight: '36px', height: '40px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)' }}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <button type="button" className="sa-pw-toggle" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="sa-form-actions sa-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button type="button" className="sa-btn sa-btn-ghost" style={{ padding: '8px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowChangePasswordModal(false)}>Cancel</button>
                    <button type="submit" className="sa-btn sa-btn-primary" style={{ padding: '8px 16px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }} disabled={changePasswordLoading}>
                      {changePasswordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
