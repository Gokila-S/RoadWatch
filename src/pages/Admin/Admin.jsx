import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Search, Filter, Clock, MapPin as MapPinIcon, 
  AlertTriangle, CheckCircle2, XCircle, HardHat, AlertOctagon, ScanSearch, Droplets, Construction,
  ChevronDown, X
} from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { StatusBadge, SeverityBadge, AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './Admin.css'

const CATEGORY_CONFIG = {
  pothole: { label: 'Pothole', icon: AlertTriangle },
  waterlogging: { label: 'Waterlogging', icon: Droplets },
  hazard: { label: 'Hazard', icon: AlertOctagon },
  crack: { label: 'Road Crack', icon: Construction },
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  verified: '#3b82f6',
  assigned: '#a855f7',
  resolved: '#22c55e',
}

const DISTRICT_BOUNDARIES = {
  Coimbatore: [
    [10.9, 76.8],
    [11.17, 76.8],
    [11.17, 77.1],
    [10.9, 77.1],
  ],
  Tiruppur: [
    [11.0, 77.15],
    [11.25, 77.15],
    [11.25, 77.45],
    [11.0, 77.45],
  ],
  Erode: [
    [11.2, 77.55],
    [11.52, 77.55],
    [11.52, 77.95],
    [11.2, 77.95],
  ],
  Salem: [
    [11.45, 77.95],
    [11.9, 77.95],
    [11.9, 78.35],
    [11.45, 78.35],
  ],
  Trichy: [
    [10.65, 78.45],
    [11.0, 78.45],
    [11.0, 78.95],
    [10.65, 78.95],
  ],
}

const hasValidReportImage = (report) => Boolean(report?.images?.[0]) && !report.images[0].includes('placeholder')

const Admin = () => {
  const { 
    reports, 
    user, 
    updateReportStatus, 
    fetchReports,
    filterStatus, setFilterStatus, 
    filterSeverity, setFilterSeverity 
  } = useStore()
  
  const [selectedReport, setSelectedReport] = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Read URL search params on mount (from notifications)
  useEffect(() => {
    const statusParam = searchParams.get('status')
    const severityParam = searchParams.get('severity')
    if (statusParam && ['pending', 'verified', 'assigned', 'resolved'].includes(statusParam)) {
      setFilterStatus(statusParam)
      setShowFilters(true)
    }
    if (severityParam && ['critical', 'high', 'medium', 'low'].includes(severityParam)) {
      setFilterSeverity(severityParam)
      setShowFilters(true)
    }
    // Clean up the URL after reading
    if (statusParam || severityParam) {
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReports().catch((error) => {
      console.error('Failed to fetch reports for admin', error)
    })
  }, [fetchReports])

  // District admins see their district, super admins see all
  const adminReports = user?.role === 'super_admin' 
    ? reports 
    : reports.filter(r => r.district === user?.district)

  // Apply filters
  const filteredReports = adminReports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.id.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = adminReports.filter(r => r.status === 'pending').length
  const verifiedCount = adminReports.filter(r => r.status === 'verified').length
  const assignedCount = adminReports.filter(r => r.status === 'assigned').length
  const criticalCount = adminReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length
  const districtBoundary = user?.district ? DISTRICT_BOUNDARIES[user.district] : null

  const activeFilterCount = [filterStatus, filterSeverity, filterCategory].filter(f => f !== 'all').length

  const clearAllFilters = () => {
    setFilterStatus('all')
    setFilterSeverity('all')
    setFilterCategory('all')
    setSearchQuery('')
  }

  const handleAction = async (status, note = '') => {
    if (selectedReport) {
      try {
        const updated = await updateReportStatus(selectedReport.id, status, note)
        setSelectedReport(updated)
      } catch (error) {
        alert(error.message || 'Failed to update report status')
      }
      if (status === 'assigned') setAssigningId(null)
    }
  }

  const getSLAStatus = (deadlineStr) => {
    const deadline = new Date(deadlineStr)
    const now = new Date()
    const diffHours = (deadline - now) / (1000 * 60 * 60)
    
    if (diffHours < 0) return { text: "DEADLINE BREACHED", class: "sla-critical text-xs px-2 py-1 rounded font-mono font-bold" }
    if (diffHours <= 12) return { text: `${Math.floor(diffHours)}h remaining`, class: "sla-critical text-xs px-2 py-1 rounded font-mono" }
    return { text: `${Math.floor(diffHours)}h remaining`, class: "sla-safe text-xs px-2 py-1 rounded font-mono" }
  }

  return (
    <div className="admin-command-center">

      <div className="command-workspace">
        {/* 🗺️ LIVE MAP */}
        <div className="workspace-map">
          <MapView 
            reports={filteredReports} 
            center={user?.role === 'super_admin' ? [11.15, 77.75] : [11.05, 77.65]} 
            zoom={12}
            colorBy="status"
            onMarkerClick={(report) => setSelectedReport(report)}
            districtBoundary={districtBoundary}
            showDistrictBoundary={Boolean(districtBoundary && user?.role !== 'super_admin')}
            focusOnDistrictBoundary={Boolean(districtBoundary && user?.role !== 'super_admin')}
          />
          
          {/* FLOATING STATS OVERLAY */}
          <div className="floating-stats-panel">
            <div className="admin-stat-box stat-clickable" onClick={() => { setFilterStatus('pending'); setShowFilters(false) }}>
              <span className="stat-label">Pending</span>
              <span className="stat-value" style={{ color: STATUS_COLORS.pending }}>{pendingCount}</span>
            </div>
            <div className="admin-stat-box stat-clickable" onClick={() => { setFilterStatus('verified'); setShowFilters(false) }}>
              <span className="stat-label">Verified</span>
              <span className="stat-value" style={{ color: STATUS_COLORS.verified }}>{verifiedCount}</span>
            </div>
            <div className="admin-stat-box stat-clickable" onClick={() => { setFilterStatus('assigned'); setShowFilters(false) }}>
              <span className="stat-label">Assigned</span>
              <span className="stat-value" style={{ color: STATUS_COLORS.assigned }}>{assignedCount}</span>
            </div>
            <div className="admin-stat-box alert-box stat-clickable" style={{ borderRight: 'none' }} onClick={() => { setFilterSeverity('critical'); setShowFilters(false) }}>
              <span className="stat-label" style={{ color: '#f87171' }}>Critical</span>
              <span className="stat-value">{criticalCount}</span>
            </div>
          </div>
          
          {/* Radar Scanner Overlay */}
          <div className="radar-overlay pointer-events-none"></div>
          
          {/* Map Legend */}
          <div className="map-legend">
            <p className="map-legend-title">CLUSTER DENSITY</p>
            <div className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: STATUS_COLORS.pending }}></span> Pending</div>
            <div className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: STATUS_COLORS.verified }}></span> Verified</div>
            <div className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: STATUS_COLORS.assigned }}></span> Assigned</div>
            <div className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: STATUS_COLORS.resolved }}></span> Resolved</div>
          </div>
        </div>

        {/* 📋 RIGHT PANEL */}
        <div className="workspace-panel">
          {!selectedReport ? (
            // LIST VIEW
            <div className="panel-list-view">
               
               {/* Search & Filters */}
               <div className="filter-section">
                 <div className="filter-section-header">
                   <h2 className="filter-section-title">
                     <Clock size={16} color="var(--amber)" /> Live Incident Feed
                   </h2>
                   <button 
                     className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                     onClick={() => setShowFilters(!showFilters)}
                   >
                     <Filter size={14} />
                     Filters
                     {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
                   </button>
                 </div>
                 
                 {/* Search */}
                 <div className="search-wrapper">
                   <Search className="search-icon" size={16} />
                   <input 
                     type="text" 
                     placeholder="Search by title, ID, or location..." 
                     className="search-input" 
                     value={searchQuery} 
                     onChange={(e) => setSearchQuery(e.target.value)} 
                   />
                   {searchQuery && (
                     <button className="search-clear" onClick={() => setSearchQuery('')}>
                       <X size={14} />
                     </button>
                   )}
                 </div>
                 
                 {/* Expandable Filter Panel */}
                 <AnimatePresence>
                   {showFilters && (
                     <motion.div 
                       className="advanced-filters"
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       transition={{ duration: 0.2 }}
                     >
                       {/* Status Filter Chips */}
                       <div className="filter-group">
                         <label className="filter-group-label">STATUS</label>
                         <div className="filter-chips">
                           {[
                             { id: 'all', label: 'All' },
                             { id: 'pending', label: 'Pending', color: STATUS_COLORS.pending },
                             { id: 'verified', label: 'Verified', color: STATUS_COLORS.verified },
                             { id: 'assigned', label: 'Assigned', color: STATUS_COLORS.assigned },
                             { id: 'resolved', label: 'Resolved', color: STATUS_COLORS.resolved },
                           ].map(s => (
                             <button 
                               key={s.id}
                               className={`filter-chip ${filterStatus === s.id ? 'active' : ''}`}
                               onClick={() => setFilterStatus(s.id)}
                               style={filterStatus === s.id && s.color ? { borderColor: s.color, color: s.color, backgroundColor: `${s.color}15` } : {}}
                             >
                               {s.color && <span className="filter-chip-dot" style={{ backgroundColor: s.color }}></span>}
                               {s.label}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Severity Filter Chips */}
                       <div className="filter-group">
                         <label className="filter-group-label">SEVERITY</label>
                         <div className="filter-chips">
                           {[
                             { id: 'all', label: 'All' },
                             { id: 'critical', label: 'Critical', color: '#ef4444' },
                             { id: 'high', label: 'High', color: '#f97316' },
                             { id: 'medium', label: 'Medium', color: '#f59e0b' },
                             { id: 'low', label: 'Low', color: '#22c55e' },
                           ].map(s => (
                             <button 
                               key={s.id}
                               className={`filter-chip ${filterSeverity === s.id ? 'active' : ''}`}
                               onClick={() => setFilterSeverity(s.id)}
                               style={filterSeverity === s.id && s.color ? { borderColor: s.color, color: s.color, backgroundColor: `${s.color}15` } : {}}
                             >
                               {s.label}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Category Filter Chips */}
                       <div className="filter-group">
                         <label className="filter-group-label">CATEGORY</label>
                         <div className="filter-chips">
                           {[
                             { id: 'all', label: 'All' },
                             { id: 'pothole', label: 'Pothole' },
                             { id: 'crack', label: 'Crack' },
                             { id: 'waterlogging', label: 'Waterlogging' },
                             { id: 'hazard', label: 'Hazard' },
                           ].map(s => (
                             <button 
                               key={s.id}
                               className={`filter-chip ${filterCategory === s.id ? 'active' : ''}`}
                               onClick={() => setFilterCategory(s.id)}
                             >
                               {s.label}
                             </button>
                           ))}
                         </div>
                       </div>

                       {activeFilterCount > 0 && (
                         <button className="clear-all-btn" onClick={clearAllFilters}>
                           <X size={12} /> Clear all filters
                         </button>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>

               {/* Reports List */}
               <div className="report-list-scroll">
                 {filteredReports.map(report => {
                   const sla = getSLAStatus(report.slaDeadline)
                   const categoryMeta = CATEGORY_CONFIG[report.category]
                   const CategoryIcon = categoryMeta?.icon || MapPinIcon
                   return (
                     <div 
                       key={report.id} 
                       className="report-list-item"
                       onClick={() => setSelectedReport(report)}
                     >
                       <div className="report-list-thumb">
                         {hasValidReportImage(report) ? (
                           <img src={report.images[0]} alt="Issue" className="report-list-thumb-img" />
                         ) : (
                           <div className="admin-report-thumb-fallback" aria-label={`${categoryMeta?.label || 'Report'} image missing`}>
                             <CategoryIcon size={20} />
                           </div>
                         )}
                       </div>
                       
                       <div className="list-item-content">
                         <div className="list-item-top">
                           <p className="list-item-id">{report.id}</p>
                           <StatusBadge status={report.status} />
                         </div>
                         <h3 className="list-item-title">{report.title}</h3>
                         <div className="list-item-address">
                           <MapPinIcon size={12} style={{ flexShrink: 0 }} /> {report.location.address}
                         </div>
                         <div className="list-item-bottom">
                            <span className={sla.class}>{sla.text}</span>
                            <SeverityBadge severity={report.severity} />
                         </div>
                       </div>
                     </div>
                   )
                 })}
                 {filteredReports.length === 0 && (
                   <div className="report-list-empty">
                     <Filter size={24} />
                     <p>No reports match current filters.</p>
                     {activeFilterCount > 0 && <button className="clear-all-btn" onClick={clearAllFilters}>Clear filters</button>}
                   </div>
                 )}
               </div>
            </div>
          ) : (
             // DETAIL VIEW
             <AnimatePresence mode="wait">
               <motion.div 
                 key={selectedReport.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="detail-view"
               >
                 {/* Header */}
                 <div className="detail-header">
                   <button onClick={() => setSelectedReport(null)} className="detail-back-btn">
                     <ChevronLeft size={16} /> BACK TO LIST
                   </button>
                   <span className="detail-id">{selectedReport.id}</span>
                 </div>
                 
                 <div className="detail-scroll">
                   {/* Visual Context */}
                   <div className="detail-image-block">
                     {hasValidReportImage(selectedReport) ? (
                       <img src={selectedReport.images[0]} alt="evidence" className="detail-evidence-img" />
                     ) : (
                       <div className="admin-detail-fallback" aria-label={`${CATEGORY_CONFIG[selectedReport.category]?.label || 'Report'} image missing`}>
                         {(() => {
                           const DetailIcon = CATEGORY_CONFIG[selectedReport.category]?.icon || MapPinIcon
                           return <DetailIcon size={34} />
                         })()}
                       </div>
                     )}
                     <div className="detail-image-badges">
                       <StatusBadge status={selectedReport.status} />
                       <SeverityBadge severity={selectedReport.severity} />
                     </div>
                     <div className="detail-image-location">
                       <MapPinIcon size={14} color="var(--signal-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
                       <span>{selectedReport.location.address} <br/><span className="detail-coords">LAT: {selectedReport.location.lat} LNG: {selectedReport.location.lng}</span></span>
                     </div>
                   </div>
                   
                   {/* AI Block */}
                   <div className="detail-ai-block">
                     <AlertOctagon className="detail-ai-watermark" size={100} />
                     <h4 className="detail-ai-title">
                       <ScanSearch size={14} /> AI TELEMETRY
                     </h4>
                     <div className="detail-ai-content">
                       <div style={{ flexShrink: 0, transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                         <AiConfidenceBadge confidence={selectedReport.aiConfidence} />
                       </div>
                       <p className="detail-ai-summary">Pattern match: <strong style={{ color: '#fff' }}>{selectedReport.category.toUpperCase()}</strong>. Structural degradation severity estimated at {selectedReport.severity.toUpperCase()}.</p>
                     </div>
                   </div>
                   
                   {/* Meta */}
                   <div className="detail-meta">
                     <h3 className="text-lg font-semibold mb-2">{selectedReport.title}</h3>
                     <p className="detail-description">
                       {selectedReport.description || "No supplemental notes provided by citizen."}
                     </p>
                   </div>
                   
                   <div className="detail-stats-grid">
                     <div className="detail-stat-card">
                       <p className="detail-stat-label">TIME SINCE REPORTED</p>
                       <p className="detail-stat-value">{Math.floor((new Date() - new Date(selectedReport.createdAt)) / 3600000)} Hours Ago</p>
                     </div>
                     <div className="detail-stat-card">
                       <p className="detail-stat-label">SLA DEADLINE</p>
                       <p className="detail-stat-value">
                         <span className={getSLAStatus(selectedReport.slaDeadline).class}>{getSLAStatus(selectedReport.slaDeadline).text}</span>
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* ⚡ Decision Panel */}
                 <div className="decision-panel">
                   <p className="decision-label">ACTION REQUIRED</p>
                   
                   {selectedReport.status === 'pending' && (
                     <div className="decision-actions-grid">
                       <button className="decision-btn decision-btn-verify" onClick={() => handleAction('verified')}>
                         <CheckCircle2 size={16} /> Verify Report
                       </button>
                       <button className="decision-btn decision-btn-reject" onClick={() => handleAction('resolved', 'Rejected - Invalid Report')}>
                         <XCircle size={16} /> Reject
                       </button>
                     </div>
                   )}
                   
                   {selectedReport.status === 'verified' && (
                     <>
                       {assigningId === selectedReport.id ? (
                         <div className="assign-form">
                           <select className="assign-select">
                             <option>Dept of Public Works (Teams A-C)</option>
                             <option>Water & Sewage Board</option>
                             <option>Highway Maintenance</option>
                           </select>
                           <select className="assign-select" style={{ color: '#f87171' }}>
                             <option>Priority: Standard</option>
                             <option>Priority: URGENT (24h)</option>
                           </select>
                           <input type="text" placeholder="Add assignment note..." className="assign-input" defaultValue="Fix within 24 hours" />
                           <div className="assign-form-actions">
                             <button className="btn btn-primary flex-1" onClick={() => handleAction('assigned')}>Confirm Dispatch</button>
                             <button className="decision-btn decision-btn-cancel" onClick={() => setAssigningId(null)}>Cancel</button>
                           </div>
                         </div>
                       ) : (
                         <div className="decision-actions-stack">
                           <button className="btn btn-primary decision-btn-full" onClick={() => setAssigningId(selectedReport.id)}>
                             <HardHat size={16} /> Assign to Worker
                           </button>
                           <button className="decision-btn decision-btn-escalate">
                             <AlertTriangle size={16} /> Mark as Critical Priority
                           </button>
                         </div>
                       )}
                     </>
                   )}
                   
                   {selectedReport.status === 'assigned' && (
                     <div className="decision-assigned-block">
                       <div className="assigned-status-card">
                         <div className="assigned-icon-wrap"><HardHat size={16} /></div>
                         <div>
                           <p className="assigned-title">Dispatched to DPW Team A</p>
                           <p className="assigned-subtitle">Awaiting worker resolution confirmation.</p>
                         </div>
                       </div>
                       <button className="decision-btn decision-btn-resolve" onClick={() => handleAction('resolved')}>
                         <CheckCircle2 size={18} /> Verify & Mark Resolved
                       </button>
                     </div>
                   )}
                   
                   {selectedReport.status === 'resolved' && (
                     <div className="resolved-status-card">
                       <div className="resolved-icon-text">
                         <CheckCircle2 size={24} />
                         <span>Issue Successfully Resolved</span>
                       </div>
                       <p className="resolved-note">Resolution logged in main audit ledger.</p>
                     </div>
                   )}
                 </div>
               </motion.div>
             </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin
