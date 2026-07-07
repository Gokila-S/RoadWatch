import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, RotateCcw, ShieldCheck, AlertTriangle, Ban } from 'lucide-react'
import './RoadChecker.css'

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:5000'

const RoadChecker = () => {
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  // ── Classify via CLIP endpoint ───────────────────────────────────
  const classifyImage = useCallback(async (file) => {
    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${AI_SERVICE_URL}/classify`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server returned ${response.status}`)
      }

      const data = await response.json()

      setResult({
        label: data.label,
        confidence: Math.round((data.confidence ?? 0) * 100),
        scores: data.scores || {},
        description: data.description || '',
      })
    } catch (err) {
      setError(
        err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
          ? 'Cannot reach AI service. Make sure the Python server is running (python ai_service/app.py).'
          : err.message
      )
    } finally {
      setAnalyzing(false)
    }
  }, [])

  // ── Handle file selection ────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return

    setResult(null)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => setImage(e.target.result)
    reader.readAsDataURL(file)

    classifyImage(file)
  }, [classifyImage])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  const handleReset = () => {
    setImage(null)
    setResult(null)
    setError('')
    setAnalyzing(false)
  }

  // ── Badge config per label ───────────────────────────────────────
  const badgeConfig = {
    pothole: { className: 'rc-pothole', icon: <AlertTriangle size={16} />, text: 'Pothole Detected' },
    normal:  { className: 'rc-normal',  icon: <ShieldCheck size={16} />,   text: 'Normal Road' },
    not_road:{ className: 'rc-notroad', icon: <Ban size={16} />,           text: 'Not a Road' },
  }

  const fillClass = {
    pothole: 'rc-fill-red',
    normal: 'rc-fill-green',
    not_road: 'rc-fill-orange',
  }

  const badge = result ? badgeConfig[result.label] || badgeConfig.not_road : null

  return (
    <div className="road-checker">
      <div className="rc-container">
        
        {/* Futuristic Civic Header */}
        <div className="rc-header rc-fade-in">
          <div className="sa-header-badge" style={{ margin: '0 auto 16px', width: 'fit-content' }}>
            CIVIC TELEMETRY AUDIT
          </div>
          <h1 className="heading-display text-glow">Road Condition Checker</h1>
          <p className="rc-subtitle">Upload a road photo to run instant CLIP zero-shot neural scanning and condition diagnostic analysis.</p>
        </div>

        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div
                className={`rc-upload-zone glass-panel ${dragging ? 'rc-dragging' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Holographic Corners */}
                <div className="scanner-corners">
                  <i></i><i></i><i></i><i></i>
                </div>

                <div className="rc-upload-icon-wrap">
                  <Upload size={24} className="rc-upload-icon-anim" />
                </div>
                <h3>Drag & drop road image</h3>
                <p className="rc-upload-note">or click to browse local files (JPG, PNG, WEBP)</p>
                <div className="rc-upload-spec">MAXIMUM RESOlUTION: 10MB // CLIP-ViT INPUT</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <div className="rc-preview-card glass-panel">
                <div className="rc-preview-image-wrap">
                  <img src={image} alt="Road to analyze" className="rc-source-img" />

                  <button className="rc-change-btn" onClick={handleReset}>
                    <RotateCcw size={12} /> Reset Scanner
                  </button>

                  {analyzing && (
                    <div className="rc-analyzing-overlay">
                      <div className="rc-scan-line" />
                      <div className="rc-spinner-glow" />
                      <span className="rc-analyzing-text">RUNNING NEURAL PIPELINE...</span>
                      <div className="scanner-corners">
                        <i></i><i></i><i></i><i></i>
                      </div>
                    </div>
                  )}
                </div>

                {/* Result Section */}
                <AnimatePresence>
                  {result && badge && (
                    <motion.div
                      className="rc-result rc-result-enter"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <div className="rc-result-meta-row">
                        <div className={`rc-result-badge ${badge.className}`}>
                          <span className="rc-result-badge-icon">{badge.icon}</span>
                          {badge.text}
                        </div>
                        <span className="rc-timestamp">VERIFIED BY AI</span>
                      </div>

                      {/* Main confidence progress */}
                      <div className="rc-confidence">
                        <div className="rc-confidence-head">
                          <span className="rc-confidence-label">Confidence Rating</span>
                          <span className="rc-confidence-value" style={{ color: badge.dotColor }}>{result.confidence}%</span>
                        </div>
                        <div className="rc-confidence-bar">
                          <div
                            className={`rc-confidence-fill ${fillClass[result.label] || 'rc-fill-orange'}`}
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {result.scores && Object.keys(result.scores).length > 1 && (
                        <div className="rc-scores-breakdown">
                          <span className="rc-breakdown-title">
                            PROBABILITY TELEMETRY
                          </span>
                          {Object.entries(result.scores)
                            .sort(([,a], [,b]) => b - a)
                            .map(([label, score]) => (
                              <div key={label} className="rc-score-row">
                                <span className="rc-score-label">{
                                  label === 'pothole' ? 'Pothole' :
                                  label === 'normal' ? 'Normal Road' :
                                  'Invalid (Non-Road)'
                                }</span>
                                <div className="rc-score-bar-wrap">
                                  <div
                                    className={`rc-score-bar-fill ${
                                      label === 'pothole' ? 'rc-fill-red' :
                                      label === 'normal' ? 'rc-fill-green' :
                                      'rc-fill-orange'
                                    }`}
                                    style={{ width: `${Math.round(score * 100)}%` }}
                                  />
                                </div>
                                <span className="rc-score-pct">{Math.round(score * 100)}%</span>
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="rc-result-desc-wrap">
                        <p className="rc-result-desc">{result.description}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="rc-error-card">
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rc-footer">
          POWERED BY ROADWATCH AI · CLIP DEEP LEARNING TELEMETRY
        </div>
      </div>
    </div>
  )
}

export default RoadChecker
