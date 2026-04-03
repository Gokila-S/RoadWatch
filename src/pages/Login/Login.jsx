import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../../store/useStore'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useStore()
  const [role, setRole] = useState('citizen')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [adminPin, setAdminPin] = useState('')

  const [name, setName] = useState('')

  const handleSendOtp = (e) => {
    e.preventDefault()
    if (phoneNumber.length === 10 && name.trim().length > 0) {
      setOtpSent(true)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otp === '1234') { 
      login('citizen', name)
      navigate('/dashboard')
    } else {
      alert('Invalid OTP. Use 1234')
    }
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (adminPin === 'admin') {
      login('admin')
      navigate('/admin')
    } else if (adminPin === 'super') {
      login('superadmin')
      navigate('/admin')
    } else {
      alert('Invalid pin. Use "admin" or "super"')
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
            <p className="text-secondary">Authenticate to access RoadWatch platform</p>
          </div>

          <div className="role-selector">
            <button
              className={`role-btn ${role === 'citizen' ? 'role-active' : ''}`}
              onClick={() => setRole('citizen')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Citizen
            </button>
            <button
              className={`role-btn ${role === 'admin' ? 'role-active' : ''}`}
              onClick={() => { setRole('admin'); setOtpSent(false) }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Personnel
            </button>
          </div>

          <div className="login-body">
            {role === 'citizen' ? (
              !otpSent ? (
                <form onSubmit={handleSendOtp} className="login-form">
                  <div className="input-group mb-4">
                    <label className="input-label">Full Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mobile Number</label>
                    <div className="phone-input">
                      <span className="phone-prefix">+91</span>
                      <input
                        type="tel"
                        className="input-field"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-full mt-4" disabled={phoneNumber.length !== 10 || name.trim().length === 0}>
                    Request Security OTP
                  </button>
                  <p className="text-dim text-mono login-hint">Use any 10-digit number</p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="login-form">
                  <div className="input-group">
                    <label className="input-label">One-Time Password</label>
                    <input
                      type="text"
                      className="input-field otp-input"
                      placeholder="• • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-full mt-4" disabled={otp.length !== 4}>
                    Verify & Authenticate
                  </button>
                  <button type="button" className="btn btn-ghost w-full mt-2" onClick={() => setOtpSent(false)}>
                    <span className="text-mono">← Back to mobile entry</span>
                  </button>
                  <p className="text-dim text-mono login-hint">Demo OTP: 1234</p>
                </form>
              )
            ) : (
              <form onSubmit={handleAdminLogin} className="login-form">
                <div className="input-group">
                  <label className="input-label">Access PIN</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter security pin"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full mt-4" disabled={adminPin.length === 0}>
                  Authenticate Admin
                </button>
                <div className="admin-hints mt-4 text-center">
                  <p className="text-dim text-mono">District Admin: use <strong className="text-primary">"admin"</strong></p>
                  <p className="text-dim text-mono">Super Admin: use <strong className="text-primary">"super"</strong></p>
                </div>
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
