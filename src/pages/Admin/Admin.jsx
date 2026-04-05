import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Search, Filter, Clock, MapPin as MapPinIcon, 
  AlertTriangle, CheckCircle2, Factory, XCircle, HardHat, AlertOctagon, ScanSearch
} from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { StatusBadge, SeverityBadge, AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './Admin.css'

const Admin = () => {
  const { 
    reports, 
    user, 
    updateReportStatus, 
    filterStatus, setFilterStatus, 
    filterSeverity, setFilterSeverity 
  } = useStore()
  
  const [selectedReport, setSelectedReport] = useState(null)
  const [assigningId, setAssigningId] = useState(null) // ID of report being assigned
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  
  // District admins see their district, super admins see all
  const adminReports = user?.role === 'super_admin' 
    ? reports 
    : reports.filter(r => r.district === user?.district)

  // Apply filters
  const filteredReports = adminReports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.id.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = adminReports.filter(r => r.status === 'pending').length
  const criticalCount = adminReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length

  const handleAction = (status, note = '') => {
    if (selectedReport) {
      updateReportStatus(selectedReport.id, status)
      // Mock update local state for immediate feedback
      setSelectedReport({...selectedReport, status})
      if (status === 'assigned') setAssigningId(null)
    }
  }

  const getSLAStatus = (deadlineStr) => {
    const deadline = new Date(deadlineStr)
    const now = new Date('2026-04-03T09:00:00Z') // Contextual mock current time
    const diffHours = (deadline - now) / (1000 * 60 * 60)
    
    if (diffHours < 0) return { text: "DEADLINE BREACHED", class: "sla-critical text-xs px-2 py-1 rounded font-mono font-bold" }
    if (diffHours <= 12) return { text: `${Math.floor(diffHours)}h remaining`, class: "sla-critical text-xs px-2 py-1 rounded font-mono" }
    return { text: `${Math.floor(diffHours)}h remaining`, class: "sla-safe text-xs px-2 py-1 rounded font-mono" }
  }

  return (
    <div className="admin-command-center">

      <div className="command-workspace">
        {/* 🗺️ LIVE MAP (70%) */}
        <div className="workspace-map">


          <MapView 
            reports={filteredReports} 
            center={user?.role === 'super_admin' ? [12.9716, 77.5946] : [13.0358, 77.5970]} 
            zoom={12}
            colorBy="status"
            onMarkerClick={(report) => setSelectedReport(report)}
          />
          
          {/* FLOATING STATS OVERLAY */}
          <div className="floating-stats-panel">
            <div className="admin-stat-box">
              <span className="stat-label">Total Assigned</span>
              <span className="stat-value" style={{ color: 'var(--accent)' }}>{adminReports.length}</span>
            </div>
            <div className="admin-stat-box">
              <span className="stat-label">Pending Triage</span>
              <span className="stat-value" style={{ color: 'var(--amber)' }}>{pendingCount}</span>
            </div>
            <div className="admin-stat-box alert-box" style={{ borderRight: 'none' }}>
              <span className="stat-label">Active Critical</span>
              <span className="stat-value">{criticalCount}</span>
            </div>
          </div>
          
          {/* Radar Scanner Overlay */}
          <div className="radar-overlay pointer-events-none"></div>
          
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 400, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '12px', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <p style={{ color: 'var(--accent)', marginBottom: '8px' }}>CLUSTER DENSITY</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--signal-red)' }}></span> Pending (Needs Action)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--signal-blue)' }}></span> Verified & Assigned</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--signal-green)' }}></span> Resolved Cases</div>
          </div>
        </div>

        {/* 📋 RIGHT PANEL (30%) */}
        <div className="workspace-panel">
          {!selectedReport ? (
            // LIST VIEW (Default Control Panel)
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
               
               {/* Search & Filters */}
               <div className="filter-row">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                   <h2 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', margin: 0 }}>
                     <Clock size={16} color="var(--amber)" /> Live Incident Feed
                   </h2>
                 </div>
                 
                 <div style={{ position: 'relative' }}>
                   <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} size={16} />
                   <input type="text" placeholder="Search reports or IDs..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                 </div>
                 
                 <div className="filter-row-controls">
                   <select className="filter-select" style={{ flex: 1, minWidth: 0 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                     <option value="all">Status: All</option>
                     <option value="pending">Pending</option>
                     <option value="verified">Verified</option>
                     <option value="assigned">Assigned</option>
                     <option value="resolved">Resolved</option>
                   </select>
                   <select className="filter-select" style={{ flex: 1, minWidth: 0 }} value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                     <option value="all">Severity: All</option>
                     <option value="critical">Critical</option>
                     <option value="high">High</option>
                     <option value="medium">Medium</option>
                     <option value="low">Low</option>
                   </select>
                 </div>
               </div>
               
               {/* Reports List */}
               <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {filteredReports.map(report => {
                   const sla = getSLAStatus(report.slaDeadline)
                   return (
                     <div 
                       key={report.id} 
                       className="report-list-item"
                       onClick={() => setSelectedReport(report)}
                     >
                       <div style={{ width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#000' }}>
                         {report.images[0]?.includes('placeholder') ? (
                           <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>NO IMG</div>
                         ) : (
                           <img src={report.images[0]} alt="Issue" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                         )}
                       </div>
                       
                       <div className="list-item-content">
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                           <p style={{ color: 'var(--accent)', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: 1, letterSpacing: '1px', margin: 0 }}>{report.id}</p>
                           <StatusBadge status={report.status} />
                         </div>
                         <h3 className="list-item-title">{report.title}</h3>
                         <div className="list-item-address">
                           <MapPinIcon size={12} style={{ flexShrink: 0 }} /> {report.location.address}
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span className={sla.class}>{sla.text}</span>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: report.severity === 'critical' ? 'var(--signal-red)' : report.severity === 'high' ? 'var(--amber)' : 'var(--signal-green)', flexShrink: 0 }}>
                            </span>
                         </div>
                       </div>
                     </div>
                   )
                 })}
                 {filteredReports.length === 0 && (
                   <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>No reports match current filters.</div>
                 )}
               </div>
            </div>
          ) : (
             // DETAIL VIEW (Decision Panel)
             <AnimatePresence mode="wait">
               <motion.div 
                 key={selectedReport.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100%', overflow: 'hidden' }}
               >
                 {/* Header */}
                 <div style={{ padding: '16px', borderBottom: '1px solid var(--border-dim)', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                   <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                     <ChevronLeft size={16} /> BACK TO LIST
                   </button>
                   <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{selectedReport.id}</span>
                 </div>
                 
                 <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   {/* Visual Context */}
                   <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', minHeight: '200px', height: '200px', flexShrink: 0, backgroundColor: '#000' }}>
                     {selectedReport.images[0]?.includes('placeholder') ? (
                       <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>[ NO EVIDENCE SUBMITTED ]</div>
                     ) : (
                       <img src={selectedReport.images[0]} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                     )}
                     <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                       <StatusBadge status={selectedReport.status} />
                       <SeverityBadge severity={selectedReport.severity} />
                     </div>
                     <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid var(--border-dim)' }}>
                       <MapPinIcon size={14} color="var(--signal-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
                       <span style={{ lineHeight: 1.4 }}>{selectedReport.location.address} <br/><span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>LAT: {selectedReport.location.lat} LNG: {selectedReport.location.lng}</span></span>
                     </div>
                   </div>
                   
                   {/* AI Block */}
                   <div style={{ backgroundColor: 'rgba(13, 203, 242, 0.05)', border: '1px solid rgba(13, 203, 242, 0.2)', borderRadius: '8px', padding: '16px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                     <AlertOctagon style={{ position: 'absolute', right: '-16px', top: '-16px', color: 'rgba(13, 203, 242, 0.1)' }} size={100} />
                     <h4 style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--signal-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <ScanSearch size={14} /> AI TELEMETRY
                     </h4>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 10 }}>
                       <div style={{ flexShrink: 0, transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                         <AiConfidenceBadge confidence={selectedReport.aiConfidence} />
                       </div>
                       <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>Pattern match: <strong style={{ color: '#fff' }}>{selectedReport.category.toUpperCase()}</strong>. Structural degradation severity estimated at {selectedReport.severity.toUpperCase()}.</p>
                     </div>
                   </div>
                   
                   {/* Meta */}
                   <div style={{ flexShrink: 0 }}>
                     <h3 className="text-lg font-semibold mb-2">{selectedReport.title}</h3>
                     <p className="text-sm text-secondary leading-relaxed bg-tertiary p-4 rounded-lg border border-subtle">
                       {selectedReport.description || "No supplemental notes provided by citizen."}
                     </p>
                   </div>
                   
                   <div style={{ flexShrink: 0 }} className="grid grid-cols-2 gap-4">
                     <div className="bg-tertiary p-3 border border-dim rounded-lg">
                       <p className="text-[10px] text-dim font-mono mb-1">TIME SINCE REPORTED</p>
                       <p className="text-sm font-semibold">{Math.floor((new Date() - new Date(selectedReport.createdAt)) / 3600000)} Hours Ago</p>
                     </div>
                     <div className="bg-tertiary p-3 border border-dim rounded-lg">
                       <p className="text-[10px] text-dim font-mono mb-1">SLA DEADLINE</p>
                       <p className="text-sm font-semibold">
                         <span className={getSLAStatus(selectedReport.slaDeadline).class}>{getSLAStatus(selectedReport.slaDeadline).text}</span>
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* ⚡ Decision Panel (MOST IMPORTANT) */}
                 <div className="p-5 border-t border-dim bg-secondary shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 flex-shrink-0">
                   <p className="text-[10px] text-dim font-mono tracking-widest mb-3">ACTION REQUIRED</p>
                   
                   {selectedReport.status === 'pending' && (
                     <div className="grid grid-cols-2 gap-3">
                       <button className="btn btn-secondary border border-signal-blue text-signal-blue hover:bg-signal-blue/10 flex justify-center items-center gap-2" onClick={() => handleAction('verified')}>
                         <CheckCircle2 size={16} /> Verify
                       </button>
                       <button className="btn btn-danger flex justify-center items-center gap-2" onClick={() => handleAction('resolved', 'Rejected - Invalid Report')}>
                         <XCircle size={16} /> Reject
                       </button>
                     </div>
                   )}
                   
                   {selectedReport.status === 'verified' && (
                     <>
                       {assigningId === selectedReport.id ? (
                         <div className="space-y-3 bg-tertiary p-3 rounded border border-dim animate-in fade-in slide-in-from-bottom-2">
                           <select className="w-full bg-secondary border border-dim rounded px-3 py-2 text-sm outline-none">
                             <option>Dept of Public Works (Teams A-C)</option>
                             <option>Water & Sewage Board</option>
                             <option>Highway Maintenance</option>
                           </select>
                           <select className="w-full bg-secondary border border-dim rounded px-3 py-2 text-sm outline-none text-signal-red">
                             <option>Priority: Standard</option>
                             <option>Priority: URGENT (24h)</option>
                           </select>
                           <input type="text" placeholder="Add assignment note..." className="w-full bg-secondary border border-dim rounded px-3 py-2 text-sm outline-none focus:border-amber-500" defaultValue="Fix within 24 hours" />
                           <div className="flex gap-2 pt-1">
                             <button className="btn btn-primary flex-1" onClick={() => handleAction('assigned')}>Confirm Dispatch</button>
                             <button className="btn border border-dim hover:bg-surface text-secondary" onClick={() => setAssigningId(null)}>Cancel</button>
                           </div>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 gap-2">
                           <button className="btn btn-primary flex justify-center items-center gap-2 py-3" onClick={() => setAssigningId(selectedReport.id)}>
                             <HardHat size={16} /> Assign to Worker
                           </button>
                           <button className="btn bg-surface border border-signal-red/30 text-signal-red hover:bg-signal-red/10 flex justify-center items-center gap-2">
                             <AlertTriangle size={16} /> Mark as Critical Priority
                           </button>
                         </div>
                       )}
                     </>
                   )}
                   
                   {selectedReport.status === 'assigned' && (
                     <div className="space-y-3">
                       <div className="bg-signal-purple/10 border border-signal-purple/30 p-3 rounded flex items-start gap-3">
                         <div className="w-8 h-8 rounded-full bg-signal-purple/20 flex items-center justify-center text-signal-purple mt-1"><HardHat size={14} /></div>
                         <div>
                           <p className="text-sm font-semibold text-white">Dispatched to DPW Team A</p>
                           <p className="text-xs text-secondary mt-1">Awaiting worker resolution confirmation.</p>
                         </div>
                       </div>
                       <button className="btn w-full bg-signal-green text-black hover:brightness-110 font-bold flex justify-center items-center gap-2 py-3" onClick={() => handleAction('resolved')}>
                         <CheckCircle2 size={16} /> Verify & Mark Resolved
                       </button>
                     </div>
                   )}
                   
                   {selectedReport.status === 'resolved' && (
                     <div className="bg-signal-green/10 border border-signal-green/30 p-4 rounded-lg flex flex-col items-center justify-center gap-3">
                       <div className="flex items-center gap-2 text-signal-green">
                         <CheckCircle2 size={24} />
                         <span className="text-sm font-semibold tracking-wide">Issue Successfully Resolved</span>
                       </div>
                       <p className="text-xs text-secondary font-mono">Resolution logged in main audit ledger.</p>
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
