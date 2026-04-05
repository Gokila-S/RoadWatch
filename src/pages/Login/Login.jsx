import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../../store/useStore'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const { login, signupCitizen, isAuthenticated, userRole, authLoading } = useStore()

  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return

    if (userRole === 'citizen') navigate('/dashboard')
    if (userRole === 'district_admin') navigate('/admin/district')
    if (userRole === 'super_admin') navigate('/admin/super')
  }, [isAuthenticated, userRole, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const result = await login(email, password)
      navigate(result.route)
    } catch (err) {
      setError(err.message || 'Unable to login')
    }
  }

  const handleCitizenSignup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await signupCitizen({
        full_name: fullName,
        email: signupEmail,
        password: signupPassword,
        phone,
        district,
      })

      setSuccess('Citizen account created. You can now sign in with email and password.')
      setMode('login')
      setEmail(signupEmail)
      setPassword('')
      setFullName('')
      setPhone('')
      setDistrict('')
      setSignupPassword('')
    } catch (err) {
      setError(err.message || 'Unable to create account')
    }
  }

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <motion.div
          className="login-card glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="login-header">
            <h2 className="heading-display heading-md">System Access</h2>
            <p className="text-secondary">Single login with email and password</p>
          </div>

          <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button
              className={`role-btn ${mode === 'login' ? 'role-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18" />
                <path d="M12 3v18" />
              </svg>
              Sign In
            </button>
            <button
              className={`role-btn ${mode === 'signup' ? 'role-active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
              Citizen Signup
            </button>
          </div>

          {error ? <p className="text-dim" style={{ color: '#ff6b6b', marginTop: '12px' }}>{error}</p> : null}
          {success ? <p className="text-dim" style={{ color: '#65d6a6', marginTop: '12px' }}>{success}</p> : null}

          <div className="login-body">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="login-form">
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full mt-4" disabled={authLoading || !email || !password}>
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <p className="text-dim text-mono login-hint">Role is resolved from your account profile after login.</p>
              </form>
            ) : (
              <form onSubmit={handleCitizenSignup} className="login-form">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="citizen@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+91-9xxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">District</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Chennai Region"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full mt-4" disabled={authLoading}>
                  Create Citizen Account
                </button>
                <p className="text-dim text-mono login-hint">District admins are created only by super admin from backend.</p>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      <div className="login-bg-grid"></div>
    </div>
  )
}

export default Login
