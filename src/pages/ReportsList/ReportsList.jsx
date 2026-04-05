import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Calendar, MapPin, X,
  ArrowUpDown, Download, CheckSquare, AlertTriangle, CheckCircle2, HardHat, FileBox, XCircle, ChevronRight
} from 'lucide-react'
import useStore from '../../store/useStore'
import { StatusBadge, SeverityBadge, AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './ReportsList.css'

const ReportsList = () => {
  const { reports, updateReportStatus, fetchReports, user } = useStore()

  useEffect(() => {
    fetchReports().catch((error) => {
      console.error('Failed to fetch reports list', error)
    })
  }, [fetchReports])
  
  const adminReports = user?.role === 'super_admin' 
    ? reports 
    : reports.filter(r => r.district === user?.district)

  // Filters State
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [slaFilter, setSlaFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  
  // Side Panel State
  const [selectedReport, setSelectedReport] = useState(null)
  const [assigningMode, setAssigningMode] = useState(false)

  // Derived filtered & sorted data
  const filteredAndSortedReports = useMemo(() => {
    let result = [...adminReports]

    // Searching
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.id.toLowerCase().includes(q) || 
        r.district.toLowerCase().includes(q)
      )
    }

    // Filtering
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)
    if (severityFilter !== 'all') result = result.filter(r => r.severity === severityFilter)
    
    // SLA Filtering
    if (slaFilter !== 'all') {
      const now = new Date('2026-04-03T09:00:00Z')
      result = result.filter(r => {
        if (r.status === 'resolved') return slaFilter === 'safe' // assume resolved is safe or skip
        const diffH = (new Date(r.slaDeadline) - now) / 3600000;
        if (slaFilter === 'breached') return diffH < 0;
        if (slaFilter === 'warning') return diffH >= 0 && diffH < 12;
        if (slaFilter === 'safe') return diffH >= 12;
        return true;
      })
    }

    // AI Confidence Filtering
    if (confidenceFilter !== 'all') {
      result = result.filter(r => {
        if (confidenceFilter === 'high') return r.aiConfidence >= 90;
        if (confidenceFilter === 'medium') return r.aiConfidence >= 70 && r.aiConfidence < 90;
        if (confidenceFilter === 'low') return r.aiConfidence < 70;
        return true;
      })
    }

    // Date Filtering
    if (dateRange !== 'all') {
      const now = new Date('2026-04-03T09:00:00Z')
      const todayStart = new Date(now.setHours(0,0,0,0))
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      result = result.filter(r => {
        const d = new Date(r.createdAt)
        if (dateRange === 'today') return d >= todayStart
        if (dateRange === 'week') return d >= weekStart
        if (dateRange === 'month') return d >= monthStart
        return true
      })
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt)
      if (sortBy === 'priority_desc') {
        const pMap = { critical: 4, high: 3, medium: 2, low: 1 }
        return pMap[b.severity] - pMap[a.severity]
      }
      return 0
    })

    return result
  }, [adminReports, dateRange, statusFilter, severityFilter, searchQuery, sortBy, slaFilter, confidenceFilter])

  // Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedReports.length && filteredAndSortedReports.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredAndSortedReports.map(r => r.id))
    }
  }

  const toggleSelect = (e, id) => {
    e.stopPropagation() // Prevent row click
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkExecute = async () => {
    if (!bulkAction || selectedIds.length === 0) return
    try {
      await Promise.all(selectedIds.map(id => updateReportStatus(id, bulkAction)))
      alert(`Successfully applied bulk action [${bulkAction.toUpperCase()}] to ${selectedIds.length} reports.`)
    } catch (error) {
      alert(error.message || 'Bulk update failed')
    }
    setSelectedIds([])
    setBulkAction('')
  }
  
  const handlePanelAction = async (status) => {
    if (selectedReport) {
      try {
        const updated = await updateReportStatus(selectedReport.id, status)
        setSelectedReport(updated)
      } catch (error) {
        alert(error.message || 'Failed to update report')
      }
      setAssigningMode(false)
    }
  }

  return (
    <div className="reports-container sidebar-layout">
      {/* LEFT SIDEBAR: Advanced Filters & KPIs */}
      <div className="reports-sidebar">
        
        {/* KPI Section */}
        <div className="sidebar-kpi-section">
          <div className="kpi-item-side">
            <span className="kpi-label-side">PENDING</span>
            <span className="kpi-value-side" style={{ color: 'var(--amber)' }}>{adminReports.filter(r => r.status === 'pending').length}</span>
          </div>
          <div className="kpi-item-side">
            <span className="kpi-label-side">ASSIGNED</span>
            <span className="kpi-value-side" style={{ color: 'var(--signal-blue)' }}>{adminReports.filter(r => r.status === 'assigned').length}</span>
          </div>
          <div className="kpi-item-side kpi-critical-side">
            <span className="kpi-label-side" style={{ color: '#FF3B30' }}>CRITICAL</span>
            <span className="kpi-value-side pulse-critical-text" style={{ color: '#FF3B30' }}>
              {adminReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length}
            </span>
          </div>
        </div>

        <div className="sidebar-divider"></div>

        {/* Scrollable Filters Section */}
        <div className="sidebar-filters">
          <div className="filter-group">
            <div className="toolbar-input-group">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search ID or Location..."
                className="toolbar-input-side"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-heading">Status</h4>
            <div className="chip-container-side">
              {['all', 'pending', 'verified', 'assigned', 'resolved'].map(status => (
                <button 
                  key={status}
                  className={`filter-chip-side ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-heading">Severity Feature</h4>
            <div className="chip-container-side">
              {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
                <button 
                  key={sev}
                  className={`filter-chip-side sev-${sev} ${severityFilter === sev ? 'active' : ''}`}
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev === 'all' ? 'All' : sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-heading">SLA Status</h4>
            <div className="chip-container-side">
               {[
                 { id: 'all', label: 'All' },
                 { id: 'safe', label: 'Safe (>12h)' },
                 { id: 'warning', label: 'Warning (<12h)' },
                 { id: 'breached', label: 'Breached' }
               ].map(f => (
                 <button 
                   key={f.id}
                   className={`filter-chip-side ${slaFilter === f.id ? 'active' : ''}`}
                   onClick={() => setSlaFilter(f.id)}
                 >
                   {f.label}
                 </button>
               ))}
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-heading">AI Confidence</h4>
            <div className="chip-container-side">
               {[
                 { id: 'all', label: 'All' },
                 { id: 'high', label: '> 90%' },
                 { id: 'medium', label: '70-90%' },
                 { id: 'low', label: '< 70%' }
               ].map(f => (
                 <button 
                   key={f.id}
                   className={`filter-chip-side ${confidenceFilter === f.id ? 'active' : ''}`}
                   onClick={() => setConfidenceFilter(f.id)}
                 >
                   {f.label}
                 </button>
               ))}
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-heading">Timeframe</h4>
            <div className="chip-container-side">
               {[
                 { id: 'all', label: 'All Time' },
                 { id: 'today', label: 'Today' },
                 { id: 'week', label: '7 Days' },
                 { id: 'month', label: '30 Days' }
               ].map(t => (
                 <button 
                   key={t.id}
                   className={`filter-chip-side ${dateRange === t.id ? 'active' : ''}`}
                   onClick={() => setDateRange(t.id)}
                 >
                   {t.label}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BODY: Grid Layout */}
      <div className="reports-main-area">
        {filteredAndSortedReports.length === 0 ? (
           <div className="empty-state-ui">
             <div className="empty-icon-wrap">
               <CheckCircle2 size={48} color="#34C759" />
             </div>
             <h3>City is running smoothly</h3>
             <p>No active tasks match your current filter parameters or jurisdiction.</p>
           </div>
        ) : (
           <div className="report-card-grid">
             {filteredAndSortedReports.map(report => {
                const isCritical = report.severity === 'critical';
                
                // Rough SLA calc
                const sladeadline = new Date(report.slaDeadline);
                const now = new Date('2026-04-03T09:00:00Z');
                const diffH = (sladeadline - now) / 3600000;
                let slaText = diffH < 0 ? 'BREACHED' : `${Math.floor(diffH)}h left`;
                let slaClass = diffH < 0 ? 'sla-critical' : diffH < 12 ? 'sla-warn' : 'sla-safe';
                if (report.status === 'resolved') {
                  slaText = 'RESOLVED';
                  slaClass = 'sla-resolved';
                }

                return (
                  <div key={report.id} className="mission-card group" onClick={() => setSelectedReport(report)}>
                     <div className="card-header">
                       <span className="card-id">{report.id}</span>
                       <span className={`severity-badge-custom sev-${report.severity} ${isCritical && report.status !== 'resolved' ? 'pulse-critical' : ''}`}>
                         {report.severity.toUpperCase()}
                       </span>
                     </div>

                     <div className="card-image-box">
                       {report.images?.[0] && !report.images[0].includes('placeholder') ? (
                         <img src={report.images[0]} alt="report image" />
                       ) : (
                         <div className="no-image">NO VISUAL</div>
                       )}
                       <div className="status-overlay">
                         <StatusBadge status={report.status} />
                       </div>
                     </div>

                     <div className="card-content">
                       <h3 className="card-title line-clamp-1">{report.title}</h3>
                       <div className="card-location line-clamp-1">
                         <MapPin size={12} style={{ flexShrink: 0, marginTop: '1px' }} /> 
                         <span>{report.location.address}</span>
                       </div>
                       
                       <div className="card-footer">
                         <div className="report-date">
                           <Calendar size={12}/> {new Date(report.createdAt).toLocaleDateString()}
                         </div>
                         <div className={`sla-timer ${slaClass}`}>
                           {slaText}
                         </div>
                       </div>
                     </div>

                     {/* HOVER ACTIONS */}
                     <div className="card-hover-actions">
                       <button className="action-btn primary" onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}>
                         Review Detail
                       </button>
                       {report.status === 'pending' && (
                         <button className="action-btn secondary" onClick={(e) => { e.stopPropagation(); updateReportStatus(report.id, 'verified'); }}>
                           Verify
                         </button>
                       )}
                       {report.status === 'verified' && (
                         <button className="action-btn secondary" onClick={(e) => { e.stopPropagation(); updateReportStatus(report.id, 'assigned'); }}>
                           Assign
                         </button>
                       )}
                     </div>
                  </div>
                )
             })}
           </div>
        )}
      </div>
      
      {/* Slide-in Detail Panel */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 90 }}
              onClick={() => setSelectedReport(null)}
            />
            <motion.div 
              className="report-side-panel"
              initial={{ x: '100%', boxShadow: '-10px 0 0 transparent' }}
              animate={{ x: 0, boxShadow: '-10px 0 40px rgba(0,0,0,0.6)' }}
              exit={{ x: '100%', boxShadow: '-10px 0 0 transparent' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="side-panel-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    TICKET REGISTRY <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{selectedReport.id}</span>
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="side-panel-content">
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', height: '240px', flexShrink: 0, backgroundColor: '#000' }}>
                   {selectedReport.images[0]?.includes('placeholder') ? (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>[ NO IMAGE EVIDENCE ]</div>
                   ) : (
                     <img src={selectedReport.images[0]} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                   )}
                   <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.8)', padding: '4px', borderRadius: '6px' }}>
                     <StatusBadge status={selectedReport.status} />
                   </div>
                   <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', color: '#fff', border: '1px solid var(--border-dim)' }}>
                     <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <MapPin size={16} color="var(--signal-cyan)" flexShrink={0} /> {selectedReport.location.address}
                     </p>
                   </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{selectedReport.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{selectedReport.description}</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                     <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', margin: '0 0 8px 0' }}>CURRENT SEVERITY</p>
                     <span className={`severity-badge-custom sev-${selectedReport.severity} w-full text-center block`}>
                       {selectedReport.severity.toUpperCase()}
                     </span>
                   </div>
                   <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                     <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', margin: '0 0 8px 0' }}>AI CONFIDENCE</p>
                     <AiConfidenceBadge confidence={selectedReport.aiConfidence} />
                   </div>
                </div>
              </div>
              
              <div className="side-panel-footer">
                <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '1px' }}>ACTION TERMINAL</p>
                
                {selectedReport.status === 'pending' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="btn btn-secondary border border-signal-blue text-signal-blue hover:bg-signal-blue/10 flex justify-center items-center gap-2" onClick={() => handlePanelAction('verified')}>
                      <CheckCircle2 size={16} /> Verify
                    </button>
                    <button className="btn btn-danger flex justify-center items-center gap-2" onClick={() => handlePanelAction('resolved')}>
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
                
                {selectedReport.status === 'verified' && (
                  <>
                    {assigningMode ? (
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <select style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)', padding: '10px', borderRadius: '4px', color: 'white', outline: 'none' }}>
                          <option>Dept of Public Works</option>
                          <option>Water & Sewage Board</option>
                        </select>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handlePanelAction('assigned')}>Dispatch</button>
                          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }} onClick={() => setAssigningMode(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-primary flex justify-center items-center gap-2" style={{ padding: '12px' }} onClick={() => setAssigningMode(true)}>
                        <HardHat size={16} /> Assign to Worker
                      </button>
                    )}
                  </>
                )}
                
                {selectedReport.status === 'assigned' && (
                  <button className="btn w-full bg-signal-green text-black hover:brightness-110 font-bold flex justify-center items-center gap-2 py-3" onClick={() => handlePanelAction('resolved')}>
                    <CheckCircle2 size={16} /> Validate & Resolve
                  </button>
                )}
                
                {selectedReport.status === 'resolved' && (
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: 'var(--signal-green)' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Resolved & Archived</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ReportsList
