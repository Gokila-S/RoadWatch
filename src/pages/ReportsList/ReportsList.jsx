import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Calendar, MapPin, X,
  ArrowUpDown, Download, CheckSquare, AlertTriangle, CheckCircle2, HardHat, FileBox, XCircle, ChevronRight
} from 'lucide-react'
import useStore from '../../store/useStore'
import { StatusBadge, SeverityBadge, AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import './ReportsList.css'

const ReportsList = () => {
  const { reports, updateReportStatus, user } = useStore()
  
  const adminReports = user?.role === 'superadmin' 
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
  }, [adminReports, dateRange, statusFilter, severityFilter, searchQuery, sortBy])

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

  const handleBulkExecute = () => {
    if (!bulkAction || selectedIds.length === 0) return
    selectedIds.forEach(id => updateReportStatus(id, bulkAction))
    alert(`Successfully applied bulk action [${bulkAction.toUpperCase()}] to ${selectedIds.length} reports.`)
    setSelectedIds([])
    setBulkAction('')
  }
  
  const handlePanelAction = (status) => {
    if (selectedReport) {
      updateReportStatus(selectedReport.id, status)
      setSelectedReport({...selectedReport, status})
      setAssigningMode(false)
    }
  }

  return (
    <div className="reports-container">
      <div className="reports-header-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="reports-title">
              <FileBox size={24} color="var(--signal-blue)" /> Universal Reports Registry
            </h1>
            <p className="reports-subtitle">Manage, filter, and execute operations on jurisdiction reports.</p>
          </div>
          <button className="btn border border-dim hover:bg-surface text-sm flex justify-center items-center gap-2" style={{ height: 'fit-content', padding: '10px 16px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Sleek Toolbar */}
        <div className="reports-toolbar">
          <div className="toolbar-input-group">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search explicitly by ID or location..."
              className="toolbar-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
             <select 
               className="toolbar-select"
               value={dateRange}
               onChange={(e) => setDateRange(e.target.value)}
             >
               <option value="all">Timeframe: All Time</option>
               <option value="today">Timeframe: Today</option>
               <option value="week">Timeframe: This Week</option>
               <option value="month">Timeframe: This Month</option>
             </select>
          </div>

          <select 
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status: All</option>
            <option value="pending">Status: Pending</option>
            <option value="verified">Status: Verified</option>
            <option value="assigned">Status: Assigned</option>
            <option value="resolved">Status: Resolved</option>
          </select>

          <select 
            className="toolbar-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">Severity: All</option>
            <option value="critical">Severity: Critical</option>
            <option value="high">Severity: High</option>
            <option value="medium">Severity: Medium</option>
            <option value="low">Severity: Low</option>
          </select>
          
          <select 
            className="toolbar-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ borderLeft: '4px solid var(--amber)', paddingLeft: '12px' }}
          >
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
            <option value="priority_desc">Sort: Highest Priority</option>
          </select>
        </div>
      </div>

      <div className="reports-body">
        {/* Bulk Actions Banner */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ background: 'rgba(13, 203, 242, 0.1)', border: '1px solid rgba(13, 203, 242, 0.3)', borderRadius: '8px', padding: '12px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckSquare size={18} color="var(--signal-cyan)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{selectedIds.length} Reports Selected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <select 
                     style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-dim)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
                     value={bulkAction}
                     onChange={(e) => setBulkAction(e.target.value)}
                   >
                     <option value="">Select Bulk Action...</option>
                     <option value="verified">Mark as Verified</option>
                     <option value="assigned">Assign to General Dept</option>
                     <option value="resolved">Mark as Resolved</option>
                   </select>
                   <button 
                     onClick={handleBulkExecute}
                     disabled={!bulkAction}
                     className="btn bg-signal-blue text-black hover:brightness-110 font-bold px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     style={{ fontSize: '0.875rem' }}
                   >
                     EXECUTE
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Table */}
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>
                  <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={filteredAndSortedReports.length > 0 && selectedIds.length === filteredAndSortedReports.length}
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th>TICKET ID</th>
                <th>ISSUE & LOCATION</th>
                <th>STATUS</th>
                <th>SEVERITY</th>
                <th>FILED ON</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedReports.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No reports match your selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedReports.map(report => (
                  <tr key={report.id} onClick={() => { setSelectedReport(report); setAssigningMode(false); }}>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        checked={selectedIds.includes(report.id)}
                        onChange={(e) => toggleSelect(e, report.id)}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--signal-cyan)' }}>
                      {report.id}
                    </td>
                    <td>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }} className="line-clamp-1">
                        {report.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }} className="line-clamp-1">
                        <MapPin size={12} style={{ flexShrink: 0 }} /> {report.location.address} <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>|</span> {report.district}
                      </p>
                    </td>
                    <td><StatusBadge status={report.status} /></td>
                    <td><SeverityBadge severity={report.severity} /></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ color: 'var(--border-subtle)' }}><ChevronRight size={18} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                   <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
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
                     <SeverityBadge severity={selectedReport.severity} />
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
