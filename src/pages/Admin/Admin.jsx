import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  
  // Admin sees reports based on their district, SuperAdmin sees all
  const adminReports = user?.role === 'superadmin' 
    ? reports 
    : reports.filter(r => r.district === user?.district)

  // Apply filters
  const filteredReports = adminReports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
    return true
  })

  const pendingCount = adminReports.filter(r => r.status === 'pending').length
  const criticalCount = adminReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length

  const handleAction = (status) => {
    if (selectedReport) {
      updateReportStatus(selectedReport.id, status)
      // Mock update local state for immediate feedback
      setSelectedReport({...selectedReport, status})
    }
  }

  return (
    <div className="admin-command-center flex flex-col">
      <div className="command-header flex items-center justify-between p-md border-b border-dim bg-secondary">
        <div className="flex items-center gap-md">
          <h1 className="heading-display text-lg tracking-wide">
            COMMAND CENTER <span className="text-accent text-sm ml-xs">[{user?.district || 'GLOBAL'}]</span>
          </h1>
          <div className="flex gap-sm border-l border-dim pl-md">
            <span className="badge badge-pending">Pending: {pendingCount}</span>
            <span className="badge badge-critical">Critical Active: {criticalCount}</span>
          </div>
        </div>
        
        <div className="filters-bar flex gap-md">
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Any Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select 
            className="filter-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">Any Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="command-workspace flex flex-1 overflow-hidden">
        {/* Map View */}
        <div className="workspace-map flex-1 relative">
          <MapView 
            reports={filteredReports} 
            center={user?.role === 'superadmin' ? [12.9716, 77.5946] : [13.0358, 77.5970]} // Just mock centers
            zoom={12}
            onMarkerClick={(report) => setSelectedReport(report)}
          />
          
          {/* Radar Scanner Overlay */}
          <div className="radar-overlay pointer-events-none"></div>
        </div>

        {/* Side Panel */}
        <div className={`workspace-panel ${selectedReport ? 'panel-open' : ''} bg-secondary border-l border-dim flex flex-col`}>
          {selectedReport ? (
             <AnimatePresence mode="wait">
               <motion.div 
                 key={selectedReport.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="flex-1 flex flex-col overflow-hidden"
               >
                 <div className="panel-header p-md border-b border-dim flex justify-between items-center bg-tertiary">
                   <div>
                     <p className="text-mono text-accent text-xs mb-1">{selectedReport.id}</p>
                     <h2 className="font-semibold">{selectedReport.title}</h2>
                   </div>
                   <button className="btn-icon" onClick={() => setSelectedReport(null)}>✕</button>
                 </div>
                 
                 <div className="panel-body flex-1 overflow-y-auto p-md space-y-lg">
                   {/* Meta */}
                   <div className="flex gap-sm flex-wrap">
                     <StatusBadge status={selectedReport.status} />
                     <SeverityBadge severity={selectedReport.severity} />
                     <span className="badge" style={{background: 'var(--bg-surface)'}}>
                        {selectedReport.category}
                     </span>
                   </div>
                   
                   {/* Details block */}
                   <div>
                     <p className="text-mono text-xs text-dim mb-1">LOCATION</p>
                     <p className="text-sm font-medium">{selectedReport.location.address}</p>
                     <p className="text-xs text-secondary mt-1">Lat: {selectedReport.location.lat}, Lng: {selectedReport.location.lng}</p>
                   </div>
                   
                   <div>
                     <p className="text-mono text-xs text-dim mb-1">DESCRIPTION</p>
                     <p className="text-sm text-secondary leading-relaxed bg-surface p-sm rounded-md border border-subtle">
                       {selectedReport.description}
                     </p>
                   </div>
                   
                   {/* AI block */}
                   <div className="bg-tertiary p-md rounded-md border border-dim relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-10">
                       <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--amber)"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                     </div>
                     <p className="text-mono text-xs text-accent mb-3 relative z-10">AI INTELLIGENCE REPORT</p>
                     <div className="flex items-center gap-md relative z-10">
                       <AiConfidenceBadge confidence={selectedReport.aiConfidence} />
                       <div className="flex-1">
                         <p className="text-xs text-secondary mb-1">System automated validation confirmed issue severity matches citizen report.</p>
                         <p className="text-xs text-dim">SLA Target: {new Date(selectedReport.slaDeadline).toLocaleString()}</p>
                       </div>
                     </div>
                   </div>
                   
                   {/* Dates */}
                   <div className="grid grid-cols-2 gap-sm text-xs">
                     <div>
                       <p className="text-mono text-dim mb-1">REPORTED</p>
                       <p className="font-medium">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                       <p className="text-secondary mt-1">By: {selectedReport.reporterName}</p>
                     </div>
                     <div>
                       <p className="text-mono text-dim mb-1">UPDATED</p>
                       <p className="font-medium">{new Date(selectedReport.updatedAt).toLocaleString()}</p>
                     </div>
                   </div>
                   
                   {/* Images */}
                   <div>
                     <p className="text-mono text-xs text-dim mb-2">EVIDENCE</p>
                     <div className="rounded-md overflow-hidden bg-surface h-32 border border-dim flex items-center justify-center">
                       {selectedReport.images[0].includes('placeholder') ? (
                          <span className="text-mono text-dim text-xs">IMG: {selectedReport.images[0]}</span>
                       ) : (
                          <img src={selectedReport.images[0]} alt="evidence" className="w-full h-full object-cover" />
                       )}
                     </div>
                   </div>
                 </div>
                 
                 {/* Action Bar */}
                 <div className="panel-footer p-md border-t border-dim bg-tertiary">
                   <p className="text-mono text-xs text-dim mb-2">WORKFLOW ACTIONS</p>
                   {selectedReport.status === 'pending' && (
                     <div className="flex gap-sm">
                       <button className="btn btn-secondary flex-1" onClick={() => handleAction('verified')}>Verify Issue</button>
                       <button className="btn btn-danger">Reject</button>
                     </div>
                   )}
                   {selectedReport.status === 'verified' && (
                     <div className="flex gap-sm">
                       <button className="btn btn-primary flex-1" onClick={() => handleAction('assigned')}>Assign Team</button>
                     </div>
                   )}
                   {selectedReport.status === 'assigned' && (
                     <div className="flex gap-sm">
                       <button className="btn btn-primary bg-signal-green text-black flex-1" style={{background: 'var(--signal-green)'}} onClick={() => handleAction('resolved')}>Mark Resolved</button>
                     </div>
                   )}
                   {selectedReport.status === 'resolved' && (
                     <div className="p-sm bg-surface border border-signal-green rounded text-center">
                       <span className="text-signal-green text-sm font-medium">Issue Resolved ✓</span>
                     </div>
                   )}
                 </div>
               </motion.div>
             </AnimatePresence>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-xl text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-subtle)" strokeWidth="1">
                <path d="M12 22A10 10 0 1 1 12 2a10 10 0 0 1 0 20z"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="15" x2="12" y2="22"/>
              </svg>
              <h3 className="text-dim font-medium mt-4">No Report Selected</h3>
              <p className="text-xs text-secondary mt-2">Click on a map marker to view detailed telemetry, AI analysis, and dispatch options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin
