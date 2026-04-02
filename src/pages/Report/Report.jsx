import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './Report.css'

const Report = () => {
  const navigate = useNavigate()
  const { addReport } = useStore()
  const [step, setStep] = useState(1) // 1: Capture, 2: Details, 3: Success
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiData, setAiData] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
  })
  
  const [location, setLocation] = useState({
    lat: 12.9716,
    lng: 77.5946,
    address: 'Fetching location...',
  })

  // Simulated AI constraints
  useEffect(() => {
    if (image && step === 1) {
      setAnalyzing(true)
      setTimeout(() => {
        setAiData({
          category: 'pothole',
          confidence: 94,
          severity: 'high',
          identifiedFeatures: ['sharp_edge', 'depth > 2inch', 'traffic_lane'],
        })
        setFormData(prev => ({
          ...prev,
          category: 'pothole',
          severity: 'high',
          title: 'Deep Pothole Detected'
        }))
        setAnalyzing(false)
        setStep(2)
      }, 2500)
    }
  }, [image])
  
  // Simulated Location Fetch
  useEffect(() => {
    setTimeout(() => {
      setLocation({
        lat: 12.9352,
        lng: 77.6245,
        address: 'Outer Ring Road, Near Tech Park, Sector 4'
      })
    }, 1500)
  }, [])

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    addReport({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      severity: formData.severity,
      status: 'pending',
      location: location,
      district: 'Bangalore East', // Mock inferred
      reportedBy: 'citizen_current',
      reporterName: 'Current User',
      assignedTo: null,
      aiConfidence: aiData?.confidence || 0,
      images: [image],
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolution: null,
    })
    
    setStep(3)
  }

  return (
    <div className="report-page container">
      <div className="report-header">
        <h1 className="heading-display heading-md">Report Infrastructure Issue</h1>
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>
      </div>

      <div className="report-content">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="step-container"
            >
              <div className="camera-card glass-panel">
                {!image ? (
                  <div className="upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="camera-input"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="camera-input" className="upload-label">
                      <div className="upload-icon-pulse">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                      <h3 className="heading-display">Capture Issue</h3>
                      <p className="text-secondary">Take a clear photo of the hazard</p>
                      <span className="btn btn-primary mt-4">Open Camera / Gallery</span>
                    </label>
                  </div>
                ) : (
                  <div className="image-preview-area">
                    <img src={image} alt="Issue preview" className="preview-img" />
                    {analyzing && (
                      <div className="ai-scanning-overlay">
                        <div className="scanner-line"></div>
                        <div className="scanner-text text-mono">
                          <span className="animate-pulse">AI VISION PROCESSING...</span>
                        </div>
                        <div className="scanner-corners">
                          <i></i><i></i><i></i><i></i>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="map-preview-card glass-panel-sm mt-4">
                <div className="map-preview-header">
                  <span className="text-mono text-dim">// DETECTED LOCATION</span>
                  <p className="location-text">{location.address}</p>
                </div>
                <div style={{ height: '150px' }}>
                  <MapView 
                    center={[location.lat, location.lng]} 
                    zoom={15} 
                    reports={[{ id: 'curr', location, severity: 'medium', status: 'pending' }]}
                    interactive={false}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="step-container"
            >
              <div className="report-grid">
                <div className="form-column card">
                  <h3 className="heading-display mb-4 text-accent">Submit Details</h3>
                  <form onSubmit={handleSubmit} className="report-form">
                    <div className="input-group">
                      <label className="input-label">Issue Title</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="input-group flex-1">
                        <label className="input-label">Category</label>
                        <select 
                          className="input-field"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="pothole">Pothole</option>
                          <option value="crack">Road Crack</option>
                          <option value="hazard">Obstruction / Hazard</option>
                          <option value="waterlogging">Waterlogging</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div className="input-group flex-1">
                        <label className="input-label">Severity Assessment</label>
                        <select 
                          className="input-field"
                          value={formData.severity}
                          onChange={(e) => setFormData({...formData, severity: e.target.value})}
                          required
                        >
                          <option value="low">Low (Cosmetic)</option>
                          <option value="medium">Medium (Requires attention)</option>
                          <option value="high">High (Dangerous)</option>
                          <option value="critical">Critical (Immediate action)</option>
                        </select>
                      </div>
                    </div>

                    <div className="input-group mt-2">
                      <label className="input-label">Additional Details</label>
                      <textarea
                        className="input-field"
                        rows="3"
                        placeholder="Provide any additional context..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      ></textarea>
                    </div>

                    <div className="form-actions mt-4">
                      <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                        Retake Photo
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Submit Report
                      </button>
                    </div>
                  </form>
                </div>

                <div className="ai-column">
                  <div className="ai-insight-card glass-panel border-accent">
                    <div className="ai-header mb-4">
                      <span className="text-mono text-accent">AI VALIDATION RESULTS</span>
                    </div>
                    
                    <div className="ai-summary flex items-center justify-between mb-4">
                      <div>
                        <p className="text-secondary text-sm">Detected Classification</p>
                        <h4 className="title-lg capitalize">{aiData?.category}</h4>
                      </div>
                      <AiConfidenceBadge confidence={aiData?.confidence || 0} />
                    </div>

                    <div className="ai-features">
                      <p className="text-secondary text-sm mb-2">Identified Signatures:</p>
                      <div className="flex gap-xs flex-wrap">
                        {aiData?.identifiedFeatures.map(f => (
                          <span key={f} className="badge" style={{ background: 'var(--bg-tertiary)' }}>{f.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-surface rounded-md border-dim">
                      <p className="text-sm text-dim">
                        <span className="text-signal-green">✓ Location verified</span><br/>
                        <span className="text-signal-green">✓ Image integrity checked</span><br/>
                        <span className="text-signal-green">✓ Duplicate search negative</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="image-thumb mt-4 rounded-lg overflow-hidden border-dim">
                    <img src={image} alt="Thumb" style={{width: '100%', height: '120px', objectFit: 'cover'}}/>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="success-container glass-panel"
            >
              <div className="success-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 className="heading-display">Report Submitted</h2>
              <p className="text-secondary mb-4 text-center max-w-md">
                Your report has been received and logged into the central system. It will be routed to the appropriate district assigned team shortly.
              </p>
              <div className="tracking-id text-mono mb-4">
                 TRACKING ID: <span className="text-accent">RW-2026-0011</span>
              </div>
              <div className="flex gap-md mt-4">
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </button>
                <button className="btn btn-primary" onClick={() => { setImage(null); setStep(1); }}>
                  Report Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Report
