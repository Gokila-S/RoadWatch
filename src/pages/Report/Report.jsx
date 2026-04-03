import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, CheckCircle2, ChevronRight, AlertTriangle, CloudRain, Construction, MapPinOff, ScanSearch } from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './Report.css'

const Report = () => {
  const navigate = useNavigate()
  const { addReport } = useStore()
  const [step, setStep] = useState(1) // 1: Camera Focus, 2: Details Focus, 3: Success
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiData, setAiData] = useState(null)
  
  const [formData, setFormData] = useState({
    title: 'Reported Issue',
    description: '',
    category: '',
    severity: 'medium',
  })
  
  const [location, setLocation] = useState({
    lat: 12.9716,
    lng: 77.5946,
    address: 'Detecting precise location...',
  })

  // Simulated AI constraints
  useEffect(() => {
    if (image && step === 2) {
      setAnalyzing(true)
      setTimeout(() => {
        const discoveredSeverity = formData.category === 'pothole' ? 'high' : 'medium'
        setAiData({
          category: formData.category || 'unknown',
          confidence: 96,
          severity: discoveredSeverity,
          identifiedFeatures: ['edge_detection_match', 'depth_estimated', 'location_verified'],
        })
        setFormData(prev => ({
          ...prev,
          severity: discoveredSeverity,
          title: prev.category ? `${prev.category.charAt(0).toUpperCase() + prev.category.slice(1)} Detected` : 'Issue Detected'
        }))
        setAnalyzing(false)
      }, 2000)
    }
  }, [image, formData.category, step])
  
  // Simulated Location Fetch
  useEffect(() => {
    setTimeout(() => {
      setLocation({
        lat: 12.9352,
        lng: 77.6245,
        address: 'Sector 4, Outer Ring Road, Bengaluru'
      })
    }, 1200)
  }, [])

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url)
      setStep(2) // Jump straight to details
    }
  }

  const handleCategorySelect = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }))
  }

  const handleSubmit = () => {
    const id = `RW-${Math.floor(1000 + Math.random() * 9000)}`
    addReport({
      id,
      title: formData.title,
      description: formData.description,
      category: formData.category || 'hazard',
      severity: formData.severity,
      status: 'pending',
      location: location,
      district: 'Bangalore East', 
      reportedBy: 'citizen_current',
      reporterName: 'Current User',
      assignedTo: null,
      aiConfidence: aiData?.confidence || 0,
      images: [image],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolution: null,
    })
    
    setStep(3)
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
            className="camera-fullscreen focus-overlay"
          >
             <div className="header-camera">
               <button onClick={() => navigate(-1)} className="btn-icon bg-secondary/80 backdrop-blur" style={{borderRadius: '50%', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}}>✕</button>
               <span className="text-sm font-semibold tracking-wide" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>Capture Issue</span>
               <div style={{width: 40}}></div>
             </div>

             <div className="camera-viewfinder">
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
                  <button 
                     onClick={() => {
                       setImage('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80')
                       setStep(2)
                     }} 
                     className="capture-btn"
                     aria-label="Capture Issue"
                  >
                     <div className="capture-inner"></div>
                  </button>
                  <p className="text-xs font-mono text-center mt-6 tracking-widest text-white/70">TAP TO CAPTURE</p>
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
            className="details-screen container pt-24 pb-24 max-w-4xl mx-auto"
          >
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-dim">
                <button onClick={() => setStep(1)} className="text-secondary text-sm flex gap-xs items-center font-medium hover:text-white transition-colors">
                  ← Retake Photo
                </button>
                <div className="text-xs font-mono text-dim tracking-wider">REPORT CONTEXT // STEP 02</div>
             </div>

             <div className="grid md-grid-2 gap-8">
               {/* Left Column: Media & Location */}
               <div className="flex flex-col gap-6">
                 
                 {/* Image Context with AI Scanner */}
                 <div className="card p-0 overflow-hidden bg-black group h-64 shadow-xl" style={{ position: 'relative' }}>
                   <img src={image} className={`w-full h-full object-cover transition-all duration-700 ${analyzing ? 'opacity-50 grayscale' : 'opacity-90'}`} style={{ display: 'block' }} alt="Captured issue" />
                   
                   {analyzing && (
                      <div className="ai-scanning-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                        <div className="scanner-line"></div>
                        <div className="scanner-text">AI SCANNING</div>
                        <div className="scanner-corners">
                          <i></i><i></i><i></i><i></i>
                        </div>
                      </div>
                   )}
                   
                   {aiData && !analyzing && (
                      <motion.div initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}>
                         <div className="bg-signal-green/20 backdrop-blur-md border border-signal-green text-signal-green px-3 py-1.5 rounded-full text-xs font-mono font-semibold shadow-[0_0_15px_rgba(34,197,94,0.3)]" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                           <CheckCircle2 size={14} /> HI-RES VERIFIED
                         </div>
                      </motion.div>
                   )}
                 </div>

                 {/* Location Box */}
                 <div className="card bg-secondary border border-dim p-5 relative overflow-hidden shadow-lg">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="text-signal-cyan" size={16} />
                        <span className="text-xs text-dim font-mono tracking-wide">AUTO-DETECTED GEO</span>
                      </div>
                      <p className="text-base font-semibold text-primary leading-tight w-2/3">{location.address}</p>
                      <p className="text-xs text-secondary font-mono mt-3">LAT: {location.lat} // LNG: {location.lng}</p>
                    </div>
                    {/* Rendered Map Background Style */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 select-none pointer-events-none fade-left">
                       <MapView center={[location.lat, location.lng]} zoom={14} interactive={false} reports={[{id:'1', location, severity:'medium'}]} />
                    </div>
                 </div>

               </div>

               {/* Right Column: Classification & Action */}
               <div className="flex flex-col gap-6 display-flex-1">
                 
                 <div className="card bg-tertiary border border-dim p-6 shadow-lg">
                   <div className="mb-6">
                     <h3 className="text-lg font-semibold mb-2">Issue Classification</h3>
                     <p className="text-sm text-secondary">Select the primary category to initiate standard operating procedure protocols.</p>
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
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`
                            flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all
                            ${formData.category === cat.id 
                              ? 'border-amber bg-amber/10 text-amber shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber/50' 
                              : 'border-subtle bg-primary text-secondary hover:border-medium hover:bg-surface hover:text-white'}
                          `}
                        >
                          {cat.icon}
                          <span className="font-semibold text-sm">{cat.label}</span>
                        </button>
                     ))}
                   </div>

                   {/* AI Info Inline Log */}
                   <AnimatePresence>
                     {formData.category && (
                       <motion.div
                         initial={{ opacity: 0, y: -10, height: 0 }}
                         animate={{ opacity: 1, y: 0, height: 'auto' }}
                         className="mb-6 overflow-hidden"
                       >
                         {analyzing ? (
                            <div className="flex items-center gap-3 text-signal-cyan font-mono text-xs bg-signal-cyan/10 p-3 rounded border border-signal-cyan/20">
                              <ScanSearch size={16} className="animate-pulse" /> Running computer vision diagnostics...
                            </div>
                         ) : (
                            <div className="flex items-center justify-between text-signal-green font-mono text-xs bg-signal-green/10 p-3 rounded border border-signal-green/20">
                              <div className="flex items-center gap-2"><CheckCircle2 size={16}/> Match Confirmed</div>
                              <span>Confidence: {aiData?.confidence}%</span>
                            </div>
                         )}
                       </motion.div>
                     )}
                   </AnimatePresence>

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
                 </div>

                 <button 
                    onClick={handleSubmit}
                    disabled={!formData.category || analyzing}
                    className={`btn btn-primary btn-lg w-full flex items-center justify-center gap-2 py-4 shadow-lg ${
                      (analyzing || !formData.category) ? 'opacity-50 pointer-events-none grayscale' : 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    }`}
                 >
                    {analyzing ? 'System Analyzing...' : 'Deploy Report Protocol'} <ChevronRight size={18} />
                 </button>
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
                <span className="font-mono text-amber font-semibold tracking-wider">RW-2841</span>
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
