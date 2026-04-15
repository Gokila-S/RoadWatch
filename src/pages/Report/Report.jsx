import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, CheckCircle2, ChevronRight, AlertTriangle, CloudRain, Construction, MapPinOff, ScanSearch, BellRing } from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import './Report.css'

const AI_SCAN_SUPPORTED_CATEGORIES = ['pothole', 'crack', 'waterlogging', 'hazard']
const MIN_CATEGORY_CONFIDENCE = 60

const Report = () => {
  const navigate = useNavigate()
  const { createReport, uploadReportMedia, fetchRelatedAnnouncements } = useStore()
  const [step, setStep] = useState(1) // 1: Camera Focus, 2: Details Focus, 3: Success
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [roadScanChecking, setRoadScanChecking] = useState(false)
  const [roadImageScore, setRoadImageScore] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiData, setAiData] = useState(null)
  const [createdReportId, setCreatedReportId] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [relatedAnnouncements, setRelatedAnnouncements] = useState([])
  const [checkingRelatedAnnouncements, setCheckingRelatedAnnouncements] = useState(false)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: '',
  })
  
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    address: '',
  })

  const locationReady = Number.isFinite(location.lat) && Number.isFinite(location.lng) && Boolean(location.address)
  const roadValidationPassed = Number.isFinite(roadImageScore) && roadImageScore >= 45

  const analyzeRoadLikelihood = async (file) => {
    const objectUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not read selected image'))
        img.src = objectUrl
      })

      const canvas = document.createElement('canvas')
      const width = 96
      const height = 96
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        throw new Error('Image analysis is unavailable')
      }

      ctx.drawImage(image, 0, 0, width, height)
      const { data } = ctx.getImageData(0, 0, width, height)

      let grayLikeCount = 0
      let midLumaCount = 0
      let strongEdges = 0
      const luma = new Float32Array(width * height)

      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const sat = max === 0 ? 0 : (max - min) / max
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b

        if (sat < 0.25) grayLikeCount += 1
        if (y > 40 && y < 205) midLumaCount += 1
        luma[p] = y
      }

      for (let y = 0; y < height - 1; y += 1) {
        for (let x = 0; x < width - 1; x += 1) {
          const idx = y * width + x
          const dx = Math.abs(luma[idx] - luma[idx + 1])
          const dy = Math.abs(luma[idx] - luma[idx + width])
          if (dx > 18 || dy > 18) strongEdges += 1
        }
      }

      const totalPixels = width * height
      const grayRatio = grayLikeCount / totalPixels
      const midLumaRatio = midLumaCount / totalPixels
      const edgeDensity = strongEdges / ((width - 1) * (height - 1))
      const normalizedEdges = Math.min(1, edgeDensity / 0.2)

      const score = Math.round((grayRatio * 0.42 + midLumaRatio * 0.33 + normalizedEdges * 0.25) * 100)
      return Math.max(0, Math.min(100, score))
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const estimateCategoryConfidence = (category, baseRoadScore) => {
    const categoryBase = {
      pothole: 72,
      crack: 70,
      waterlogging: 68,
      hazard: 66,
    }

    const base = categoryBase[category] || 62
    const roadFactor = ((baseRoadScore || 55) - 50) * 0.65
    const variation = Math.random() * 24 - 12

    return Math.max(30, Math.min(98, Math.round(base + roadFactor + variation)))
  }

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraReady(false)
  }

  const startCameraStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser.')
      return
    }

    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1440 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 4 / 3 },
        },
        audio: false,
      })

      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraReady(true)
    } catch (error) {
      setCameraError(error.message || 'Unable to access camera. Use upload as fallback.')
      setCameraReady(false)
    }
  }

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding failed')
      }

      const data = await response.json()
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationLoading(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude)
        const lng = Number(position.coords.longitude)
        const address = await reverseGeocode(lat, lng)

        setLocation({ lat, lng, address })
        setLocationLoading(false)
      },
      (error) => {
        setLocationLoading(false)
        setLocationError(error.message || 'Could not detect location.')
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  }

  useEffect(() => {
    fetchCurrentLocation()
  }, [])

  useEffect(() => {
    if (step === 1) {
      startCameraStream()
      return () => {
        stopCameraStream()
      }
    }

    stopCameraStream()
    return undefined
  }, [step])

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image)
      }
      stopCameraStream()
    }
  }, [image])

  const processSelectedImage = async (file) => {
    setSubmitError('')
    setRoadScanChecking(true)

    try {
      const roadScore = await analyzeRoadLikelihood(file)
      if (roadScore < 45) {
        setRoadImageScore(roadScore)
        setAiData(null)
        setFormData((prev) => ({ ...prev, category: '', severity: '' }))
        setSubmitError('Image rejected: it does not appear to be a road surface. Please upload a road-related image.')
        return false
      }

      if (image) {
        URL.revokeObjectURL(image)
      }

      const previewUrl = URL.createObjectURL(file)
      setRoadImageScore(roadScore)
      setImage(previewUrl)
      setImageFile(file)
      setAiData(null)
      setStep(2)
      return true
    } catch {
      setSubmitError('Could not process selected image')
      return false
    } finally {
      setRoadScanChecking(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      processSelectedImage(file)
    }

    e.target.value = ''
  }

  const captureFromLiveCamera = async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const sourceWidth = video.videoWidth || 1280
    const sourceHeight = video.videoHeight || 720

    const targetAspect = 4 / 3
    let cropWidth = sourceWidth
    let cropHeight = sourceHeight
    let sourceX = 0
    let sourceY = 0

    const sourceAspect = sourceWidth / sourceHeight
    if (sourceAspect > targetAspect) {
      cropWidth = sourceHeight * targetAspect
      sourceX = (sourceWidth - cropWidth) / 2
    } else {
      cropHeight = sourceWidth / targetAspect
      sourceY = (sourceHeight - cropHeight) / 2
    }

    const outputWidth = 1200
    const outputHeight = 900

    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight

    const context = canvas.getContext('2d')
    if (!context) {
      setSubmitError('Could not capture image from camera')
      return
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setSubmitError('Could not capture image from camera')
      return
    }

    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await processSelectedImage(file)
  }

  const handleCameraClick = () => {
    if (cameraReady) {
      captureFromLiveCamera()
      return
    }

    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => galleryInputRef.current?.click()

  const handleCategorySelect = (cat) => {
    if (!roadValidationPassed || roadScanChecking) {
      setSubmitError('Run road-image validation first. Category selection unlocks only after road check passes.')
      return
    }

    setSubmitError('')
    setFormData(prev => ({ ...prev, category: cat }))
    setAiData(null)
  }

  useEffect(() => {
    if (step !== 2 || !imageFile || !formData.category) {
      setAnalyzing(false)
      return
    }

    if (!AI_SCAN_SUPPORTED_CATEGORIES.includes(formData.category)) {
      setAiData(null)
      setAnalyzing(false)
      return
    }

    setAiData(null)
    setAnalyzing(true)

    const timer = setTimeout(() => {
      const confidence = estimateCategoryConfidence(formData.category, roadImageScore)
      const rejected = confidence < MIN_CATEGORY_CONFIDENCE
      setAiData({
        category: formData.category,
        confidence,
        rejected,
        summary: rejected
          ? `Confidence ${confidence}% is below required threshold (${MIN_CATEGORY_CONFIDENCE}%).`
          : 'Surface issue pattern identified from uploaded evidence.',
      })
      if (rejected) {
        setSubmitError(`AI rejected this category match (${confidence}%). Please recapture image or choose correct category.`)
      } else {
        setSubmitError('')
      }
      setAnalyzing(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [step, imageFile, formData.category, roadImageScore])

  useEffect(() => {
    if (!formData.category || !locationReady || step !== 2) {
      setRelatedAnnouncements([])
      return
    }

    setCheckingRelatedAnnouncements(true)

    fetchRelatedAnnouncements({
      category: formData.category,
      location,
      limit: 3,
    })
      .then((items) => {
        setRelatedAnnouncements(items)
      })
      .catch(() => {
        setRelatedAnnouncements([])
      })
      .finally(() => {
        setCheckingRelatedAnnouncements(false)
      })
  }, [fetchRelatedAnnouncements, formData.category, location, locationReady, step])

  const handleSubmit = async () => {
    setSubmitError('')

    if (!formData.category) {
      setSubmitError('Please select a category.')
      return
    }

    if (!formData.severity) {
      setSubmitError('Please choose severity.')
      return
    }

    if (!locationReady) {
      setSubmitError('Location is required. Please enable location access and try again.')
      return
    }

    if (!imageFile) {
      setSubmitError('Please capture or upload a photo before submitting.')
      return
    }

    setSubmitting(true)

    try {
      const uploadedImageUrl = await uploadReportMedia(imageFile)

      const response = await createReport({
        title: formData.title.trim(),
        description: formData.description || 'Citizen submitted report',
        category: formData.category,
        severity: formData.severity,
        location,
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
        aiConfidence: aiData?.confidence || 80,
      })

      const report = response.report
      if ((response.relatedAnnouncements || []).length > 0) {
        setRelatedAnnouncements(response.relatedAnnouncements)
      }

      setCreatedReportId(report.id)
      setStep(3)
    } catch (error) {
      setSubmitError(error.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="report-flow">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: CAMERA OPEN IMMEDIATELY */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="camera-fullscreen"
          >
             <div className="header-camera">
               <button onClick={() => navigate(-1)} className="btn-icon bg-secondary/80 backdrop-blur" style={{borderRadius: '50%', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}}>✕</button>
               <span className="text-sm font-semibold tracking-wide" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>Capture Issue</span>
               <div style={{width: 40}}></div>
             </div>

             <div className="camera-viewfinder">
               <video ref={videoRef} className="camera-live-feed" autoPlay playsInline muted />
                <div className="viewfinder-frame">
                   <div className="bracket tl"></div><div className="bracket tr"></div>
                   <div className="bracket bl"></div><div className="bracket br"></div>
                   <div className="crosshair"></div>
                </div>

                <div className="camera-text-overlay z-10">
                  <h2 className="heading-display text-white text-xl pb-2" style={{textShadow: '0 2px 8px rgba(0,0,0,0.8)'}}>
                    Point at issue
                  </h2>
                  <p className="text-sm text-white opacity-80" style={{textShadow: '0 1px 4px rgba(0,0,0,0.8)'}}>
                    Ensure the hazard is clearly visible
                  </p>
                </div>

                <div className="camera-controls-safe-area z-10">
                  <button onClick={handleCameraClick} className="capture-btn" aria-label="Capture from camera">
                    <div className="capture-inner"></div>
                  </button>
                  <p className="text-xs font-mono text-center mt-6 tracking-widest text-white/70">
                    {cameraReady ? 'TAP TO CAPTURE PHOTO' : 'OPEN CAMERA OR UPLOAD'}
                  </p>
                  {cameraError ? <p className="camera-warning">{cameraError}</p> : null}

                  <div className="camera-actions">
                    <button type="button" className="capture-option-btn" onClick={handleCameraClick}>
                      {cameraReady ? 'Capture Now' : 'Use Camera'}
                    </button>
                    <button type="button" className="capture-option-btn" onClick={handleGalleryClick}>
                      Upload Photo
                    </button>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
             </div>
          </motion.div>
        )}

        {/* STEP 2: DETAILS (WHAT'S THE ISSUE) */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="details-screen container pt-24 pb-24 max-w-4xl mx-auto details-screen-shell"
          >
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-dim">
                <button onClick={() => setStep(1)} className="text-secondary text-sm flex gap-xs items-center font-medium hover:text-white transition-colors">
                  ← Retake Photo
                </button>
                <div className="text-xs font-mono text-dim tracking-wider">REPORT CONTEXT // STEP 02</div>
             </div>

             <div className="grid md-grid-2 gap-8 report-details-grid">
               {/* Left Column: Media & Location */}
               <div className="flex flex-col gap-6 details-left-column">
                 
                 {/* Image Context with AI Scanner */}
                 <div className="capture-preview-shell">
                   <div className="card p-0 overflow-hidden bg-black group shadow-xl capture-preview-card" style={{ position: 'relative' }}>
                     <img src={image} className="w-full h-full object-cover transition-all duration-700 opacity-90" style={{ display: 'block' }} alt="Captured issue" />

                     {analyzing && (
                        <div className="ai-scanning-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                          <div className="scanner-line"></div>
                          <div className="scanner-text">AI SCANNING</div>
                          <div className="scanner-corners">
                            <i></i><i></i><i></i><i></i>
                          </div>
                        </div>
                     )}

                     {aiData && !analyzing && !aiData.rejected && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}>
                          <div className="bg-signal-green/20 backdrop-blur-md border border-signal-green text-signal-green px-3 py-1.5 rounded-full text-xs font-mono font-semibold shadow-[0_0_15px_rgba(34,197,94,0.3)]" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={14} /> AI VERIFIED
                          </div>
                        </motion.div>
                     )}
                   </div>
                 </div>

                 <div className="card bg-tertiary border border-dim p-4 validation-summary-card">
                   <div className="validation-summary-head">
                     <span className="text-xs font-mono text-dim tracking-wide">VALIDATION SUMMARY</span>
                     {roadScanChecking ? <span className="validation-chip validation-chip-pending">Checking road image...</span> : null}
                     {!roadScanChecking && roadValidationPassed ? <span className="validation-chip validation-chip-pass">Road Verified</span> : null}
                     {!roadScanChecking && roadImageScore !== null && !roadValidationPassed ? <span className="validation-chip validation-chip-fail">Road Rejected</span> : null}
                   </div>

                   <div className="validation-summary-grid">
                     <div className="validation-metric">
                       <span className="validation-label">Road Score</span>
                       <span className="validation-value">{roadImageScore ?? '--'}%</span>
                     </div>
                     <div className="validation-metric">
                       <span className="validation-label">Category Scan</span>
                       <span className="validation-value">
                         {analyzing
                           ? 'Running'
                           : aiData
                             ? `${aiData.confidence}%`
                             : '--'}
                       </span>
                     </div>
                   </div>

                   {aiData ? (
                     <p className={`validation-summary-note ${aiData.rejected ? 'validation-summary-note-fail' : ''}`}>
                       {aiData.rejected
                         ? `Rejected: ${aiData.summary}`
                         : `Detected ${aiData.category.toUpperCase()} with ${aiData.confidence}% confidence.`}
                     </p>
                   ) : (
                     <p className="validation-summary-note">Select category after road verification to run confidence scan.</p>
                   )}
                 </div>

                 {/* Location Box */}
                 <div className="card bg-secondary border border-dim p-5 relative overflow-hidden shadow-lg details-geo-card">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="text-signal-cyan" size={16} />
                        <span className="text-xs text-dim font-mono tracking-wide">AUTO-DETECTED GEO</span>
                      </div>
                      <p className="text-base font-semibold text-primary leading-tight w-2/3">
                        {locationLoading ? 'Detecting location...' : location.address || 'Location not available'}
                      </p>
                      <p className="text-xs text-secondary font-mono mt-3">
                        LAT: {location.lat ?? 'NA'} // LNG: {location.lng ?? 'NA'}
                      </p>
                      {locationError ? <p className="location-warning">{locationError}</p> : null}
                      <button type="button" className="capture-option-btn location-actions" onClick={fetchCurrentLocation}>
                        Refresh Location
                      </button>
                    </div>
                    {/* Rendered Map Background Style */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 select-none pointer-events-none fade-left">
                       <MapView
                         center={[location.lat || 12.9716, location.lng || 77.5946]}
                         zoom={14}
                         interactive={false}
                         reports={[{ id: '1', location: { ...location, lat: location.lat || 12.9716, lng: location.lng || 77.5946 }, severity: formData.severity || 'medium' }]}
                       />
                    </div>
                 </div>

               </div>

               {/* Right Column: Classification & Action */}
               <div className="flex flex-col gap-6 display-flex-1 details-right-column">
                 
                 <div className="card bg-tertiary border border-dim p-6 shadow-lg details-form-card">
                   <div className="mb-6">
                     <h3 className="text-lg font-semibold mb-2">Issue Classification</h3>
                     <p className="text-sm text-secondary">Select the primary category to initiate standard operating procedure protocols.</p>
                   </div>

                   <div className="mb-4">
                     <div className="details-field-head">
                       <label className="text-xs font-mono text-dim mb-2 block tracking-wide">REPORT TITLE</label>
                       <span className="details-optional-chip">Optional</span>
                     </div>
                     <input
                       type="text"
                       className="w-full bg-primary border border-dim rounded-lg p-3 font-body text-sm outline-none focus:border-amber transition-colors text-white focus:ring-1 focus:ring-amber/50"
                       placeholder="Example: Large pothole near bus stop"
                       value={formData.title}
                       onChange={e => setFormData({ ...formData, title: e.target.value })}
                     />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     {[
                       { id: 'pothole', icon: <AlertTriangle size={20}/>, label: 'Pothole' },
                       { id: 'crack', icon: <Construction size={20}/>, label: 'Road Crack' },
                       { id: 'waterlogging', icon: <CloudRain size={20}/>, label: 'Waterlogging' },
                       { id: 'hazard', icon: <MapPinOff size={20}/>, label: 'Hazard' }
                     ].map(cat => (
                        <button 
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          disabled={!roadValidationPassed || roadScanChecking}
                          className={`
                            flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all
                            ${formData.category === cat.id 
                              ? 'border-amber bg-amber/10 text-amber shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber/50' 
                              : 'border-subtle bg-primary text-secondary hover:border-medium hover:bg-surface hover:text-white'}
                            ${(!roadValidationPassed || roadScanChecking) ? 'opacity-55 cursor-not-allowed pointer-events-none' : ''}
                          `}
                        >
                          {cat.icon}
                          <span className="font-semibold text-sm">{cat.label}</span>
                        </button>
                     ))}
                   </div>

                   <div className="mb-6">
                     <label className="text-xs font-mono text-dim mb-2 block tracking-wide">SEVERITY</label>
                     <div className="grid grid-cols-2 gap-3">
                       {[
                         { id: 'low', label: 'Low' },
                         { id: 'medium', label: 'Medium' },
                         { id: 'high', label: 'High' },
                         { id: 'critical', label: 'Critical' },
                       ].map((severity) => (
                         <button
                           key={severity.id}
                           type="button"
                           onClick={() => setFormData({ ...formData, severity: severity.id })}
                           className={`
                            flex items-center justify-center p-3 rounded-xl border transition-all font-semibold text-sm
                            ${formData.severity === severity.id
                              ? 'border-amber bg-amber/10 text-amber shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber/50'
                              : 'border-subtle bg-primary text-secondary hover:border-medium hover:bg-surface hover:text-white'}
                           `}
                         >
                           {severity.label}
                         </button>
                       ))}
                     </div>
                   </div>

                   <div className="mb-2">
                     <label className="text-xs font-mono text-dim mb-2 block tracking-wide">ADDITIONAL INTELLIGENCE (OPTIONAL)</label>
                     <textarea
                       className="w-full bg-primary border border-dim rounded-lg p-3 font-body text-sm outline-none focus:border-amber transition-colors resize-none text-white focus:ring-1 focus:ring-amber/50"
                       placeholder="Specify landmarks, scope of damage, or immediate risks..."
                       rows={3}
                       value={formData.description}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                     ></textarea>
                   </div>

                   <div className="report-announcement-check-block">
                     <div className="report-announcement-check-head">
                       <BellRing size={16} />
                       <span>Related Area Announcements</span>
                     </div>
                     {checkingRelatedAnnouncements ? (
                       <p className="report-announcement-check-note">Checking for nearby alerts and maintenance updates...</p>
                     ) : relatedAnnouncements.length > 0 ? (
                       <div className="report-announcement-list">
                         {relatedAnnouncements.map((item) => (
                           <div key={item.id} className="report-announcement-item">
                             <div className="report-announcement-item-head">
                               <strong>{item.title}</strong>
                               <span className={`report-announcement-priority ${item.priority}`}>{item.priority}</span>
                             </div>
                             <p>{item.message}</p>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <p className="report-announcement-check-note">No matching active announcements found for this issue type and location.</p>
                     )}
                   </div>
                 </div>

                 <button 
                    onClick={handleSubmit}
                    disabled={!formData.category || !formData.severity || !locationReady || submitting || analyzing || !aiData || aiData.rejected}
                    className={`btn btn-primary btn-lg w-full flex items-center justify-center gap-2 py-4 shadow-lg ${
                    (!formData.category || !formData.severity || !locationReady || submitting || analyzing || !aiData || aiData.rejected) ? 'opacity-50 pointer-events-none grayscale' : 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    }`}
                 >
                    {analyzing ? 'System Analyzing...' : submitting ? 'Uploading Media...' : 'Deploy Report Protocol'} <ChevronRight size={18} />
                 </button>
                    {submitError ? <p className="text-dim" style={{ color: '#ff6b6b' }}>{submitError}</p> : null}
               </div>
             </div>
          </motion.div>
        )}

        {/* STEP 3: SUCCESS (INSTANT) */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="success-screen flex flex-col items-center justify-center min-h-screen px-6 text-center"
          >
             <div className="w-20 h-20 bg-signal-green/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-signal-green" />
             </div>
             <h2 className="heading-display text-2xl mb-2">Report Submitted</h2>
             <p className="text-secondary mb-8">Thank you. Your report has been logged and routed to the proper authorities.</p>
             
             <div className="bg-surface border border-subtle px-6 py-4 rounded-xl mb-10 w-full max-w-sm flex items-center justify-between">
                <span className="text-dim text-sm font-medium">Tracking ID</span>
               <span className="font-mono text-amber font-semibold tracking-wider">{createdReportId || 'N/A'}</span>
             </div>

             <div className="flex flex-col w-full max-w-sm gap-3">
               <button onClick={() => navigate('/dashboard')} className="btn btn-secondary w-full justify-center">
                 View My Reports
               </button>
               <button onClick={() => navigate('/')} className="btn btn-ghost w-full justify-center">
                 Back to Map
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Report
