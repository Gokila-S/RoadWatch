import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Calendar, MapPin, X, SlidersHorizontal,
  ArrowUpDown, Download, CheckSquare, AlertTriangle, CheckCircle2, 
  HardHat, FileBox, XCircle, ChevronRight, Droplets, AlertOctagon, 
  Construction, ScanSearch, Tag, Clock, ChevronDown, RotateCcw
} from 'lucide-react'
import useStore from '../../store/useStore'
import Loader from '../../components/Loader/Loader'
import { StatusBadge, SeverityBadge, AiConfidenceBadge } from '../../components/StatusBadge/StatusBadge'
import { getReportImage, FALLBACK_IMAGES } from '../../utils/imageFallback'
import './ReportsList.css'

const CATEGORY_CONFIG = {
  pothole: { label: 'Pothole', icon: AlertTriangle, color: '#f59e0b' },
  waterlogging: { label: 'Waterlogging', icon: Droplets, color: '#3b82f6' },
  hazard: { label: 'Hazard', icon: AlertOctagon, color: '#ef4444' },
  crack: { label: 'Road Crack', icon: Construction, color: '#a855f7' },
}

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending', color: '#f59e0b' },
  { id: 'verified', label: 'Verified', color: '#3b82f6' },
  { id: 'assigned', label: 'Assigned', color: '#a855f7' },
  { id: 'resolved', label: 'Resolved', color: '#22c55e' },
]

const SEVERITY_OPTIONS = [
  { id: 'critical', label: 'Critical', color: '#ef4444' },
  { id: 'high', label: 'High', color: '#f97316' },
  { id: 'medium', label: 'Medium', color: '#eab308' },
  { id: 'low', label: 'Low', color: '#22c55e' },
]

const SLA_OPTIONS = [
  { id: 'safe', label: 'On Track', color: '#22c55e' },
  { id: 'warning', label: 'At Risk', color: '#f59e0b' },
  { id: 'breached', label: 'Breached', color: '#ef4444' },
]

const DATE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
]

const SORT_OPTIONS = [
  { id: 'date_desc', label: 'Newest First' },
  { id: 'date_asc', label: 'Oldest First' },
  { id: 'priority_desc', label: 'Highest Priority' },
]
// Removed hasValidReportImage
const ReportsList = () => {
  const { reports, updateReportStatus, fetchReports, user } = useStore()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const query = {}

    const status = params.get('status')
    const severity = params.get('severity')
    const district = params.get('district')
    const category = params.get('category')

    if (status) query.status = status
    if (severity) query.severity = severity
    if (district) query.district = district
    if (category) query.category = category

    setLoading(true)
    fetchReports(query)
      .catch((error) => {
        console.error('Failed to fetch reports list', error)
      })
      .finally(() => setLoading(false))

    if (status) setStatusFilter(status)
    if (severity) setSeverityFilter(severity)
    if (district) setDistrictFilter(district)
    if (category) setCategoryFilter(category)
  }, [fetchReports, location.search])
  
  const adminReports = user?.role === 'super_admin' 
    ? reports 
    : reports.filter(r => r.district === user?.district)

  // Filters State
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [slaFilter, setSlaFilter] = useState('all')
  const [confidenceRange, setConfidenceRange] = useState([0, 100])
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})
  const [loading, setLoading] = useState(false)
  
  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  
  // Side Panel State
  const [selectedReport, setSelectedReport] = useState(null)
  const [assigningMode, setAssigningMode] = useState(false)

  const districtOptions = useMemo(() => {
    const unique = new Set(
      adminReports
        .map((report) => report.district)
        .filter((name) => Boolean(name && typeof name === 'string')),
    )

    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [adminReports])

  // Count active filters
  const activeFilters = useMemo(() => {
    const tags = []
    if (statusFilter !== 'all') tags.push({ key: 'status', label: `Status: ${statusFilter}`, color: STATUS_OPTIONS.find(s => s.id === statusFilter)?.color, clear: () => setStatusFilter('all') })
    if (severityFilter !== 'all') tags.push({ key: 'severity', label: `Severity: ${severityFilter}`, color: SEVERITY_OPTIONS.find(s => s.id === severityFilter)?.color, clear: () => setSeverityFilter('all') })
    if (categoryFilter !== 'all') tags.push({ key: 'category', label: `Type: ${CATEGORY_CONFIG[categoryFilter]?.label || categoryFilter}`, color: CATEGORY_CONFIG[categoryFilter]?.color, clear: () => setCategoryFilter('all') })
    if (districtFilter !== 'all') tags.push({ key: 'district', label: `District: ${districtFilter}`, color: '#06b6d4', clear: () => setDistrictFilter('all') })
    if (slaFilter !== 'all') tags.push({ key: 'sla', label: `SLA: ${SLA_OPTIONS.find(s => s.id === slaFilter)?.label}`, color: SLA_OPTIONS.find(s => s.id === slaFilter)?.color, clear: () => setSlaFilter('all') })
    if (confidenceRange[0] > 0 || confidenceRange[1] < 100) tags.push({ key: 'confidence', label: `AI: ${confidenceRange[0]}%–${confidenceRange[1]}%`, color: '#06b6d4', clear: () => setConfidenceRange([0, 100]) })
    if (dateRange !== 'all') tags.push({ key: 'date', label: `Time: ${DATE_OPTIONS.find(d => d.id === dateRange)?.label}`, color: '#9a9aab', clear: () => setDateRange('all') })
    if (searchQuery) tags.push({ key: 'search', label: `Search: "${searchQuery}"`, color: '#9a9aab', clear: () => setSearchQuery('') })
    return tags
  }, [statusFilter, severityFilter, categoryFilter, districtFilter, slaFilter, confidenceRange, dateRange, searchQuery])

  const clearAllFilters = useCallback(() => {
    setStatusFilter('all')
    setSeverityFilter('all')
    setCategoryFilter('all')
    setDistrictFilter('all')
    setSlaFilter('all')
    setConfidenceRange([0, 100])
    setDateRange('all')
    setSearchQuery('')
    setSortBy('date_desc')
  }, [])

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
    if (categoryFilter !== 'all') result = result.filter(r => r.category === categoryFilter)
    if (districtFilter !== 'all') result = result.filter(r => r.district === districtFilter)
    
    // SLA Filtering
    if (slaFilter !== 'all') {
      const now = new Date()
      result = result.filter(r => {
        if (r.status === 'resolved') return slaFilter === 'safe'
        const diffH = (new Date(r.slaDeadline) - now) / 3600000;
        if (slaFilter === 'breached') return diffH < 0;
        if (slaFilter === 'warning') return diffH >= 0 && diffH < 12;
        if (slaFilter === 'safe') return diffH >= 12;
        return true;
      })
    }

    // AI Confidence Range Filtering
    if (confidenceRange[0] > 0 || confidenceRange[1] < 100) {
      result = result.filter(r => {
        const c = r.aiConfidence || 0
        return c >= confidenceRange[0] && c <= confidenceRange[1]
      })
    }

    // Date Filtering
    if (dateRange !== 'all') {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0,0,0,0)
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
  }, [adminReports, dateRange, statusFilter, severityFilter, categoryFilter, districtFilter, searchQuery, sortBy, slaFilter, confidenceRange])

  // Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedReports.length && filteredAndSortedReports.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredAndSortedReports.map(r => r.id))
    }
  }

  const toggleSelect = (e, id) => {
    e.stopPropagation()
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

  const getSLAStatus = (report) => {
    const deadline = new Date(report.slaDeadline)
    const now = new Date()
    const diffH = (deadline - now) / 3600000
    
    if (report.status === 'resolved') return { text: 'RESOLVED', class: 'sla-resolved' }
    if (diffH < 0) return { text: 'BREACHED', class: 'sla-critical' }
    if (diffH < 12) return { text: `${Math.floor(diffH)}h left`, class: 'sla-warn' }
    return { text: `${Math.floor(diffH)}h left`, class: 'sla-safe' }
  }

  // KPI counts
  const pendingCount = adminReports.filter(r => r.status === 'pending').length
  const assignedCount = adminReports.filter(r => r.status === 'assigned').length
  const criticalCount = adminReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length
  const resolvedCount = adminReports.filter(r => r.status === 'resolved').length

  return (
    <div className="reports-page">
      {/* TOP COMMAND BAR */}
      <div className="reports-command-bar">
        <div className="command-bar-left">
          <div className="command-kpi-row">
            <button className={`kpi-pill ${statusFilter === 'pending' ? 'kpi-pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}>
              <span className="kpi-pill-dot" style={{ background: '#f59e0b' }}></span>
              <span className="kpi-pill-label">Pending</span>
              <span className="kpi-pill-value" style={{ color: '#f59e0b' }}>{pendingCount}</span>
            </button>
            <button className={`kpi-pill ${statusFilter === 'assigned' ? 'kpi-pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'assigned' ? 'all' : 'assigned')}>
              <span className="kpi-pill-dot" style={{ background: '#a855f7' }}></span>
              <span className="kpi-pill-label">Assigned</span>
              <span className="kpi-pill-value" style={{ color: '#a855f7' }}>{assignedCount}</span>
            </button>
            <button className={`kpi-pill kpi-pill-critical ${severityFilter === 'critical' ? 'kpi-pill-active' : ''}`} onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}>
              <span className="kpi-pill-dot kpi-dot-pulse" style={{ background: '#ef4444' }}></span>
              <span className="kpi-pill-label">Critical</span>
              <span className="kpi-pill-value" style={{ color: '#ef4444' }}>{criticalCount}</span>
            </button>
            <button className={`kpi-pill ${statusFilter === 'resolved' ? 'kpi-pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}>
              <span className="kpi-pill-dot" style={{ background: '#22c55e' }}></span>
              <span className="kpi-pill-label">Resolved</span>
              <span className="kpi-pill-value" style={{ color: '#22c55e' }}>{resolvedCount}</span>
            </button>
          </div>
        </div>
        <div className="command-bar-right">
          <div className="command-search-wrap">
            <Search size={15} className="command-search-icon" />
            <input 
              type="text" 
              placeholder="Search by ID, title, or location..."
              className="command-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="command-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="command-sort-wrap">
            <button className="command-sort-btn" onClick={() => setShowSortDropdown(!showSortDropdown)}>
              <ArrowUpDown size={14} />
              <span>{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div 
                  className="sort-dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button 
                      key={opt.id} 
                      className={`sort-option ${sortBy === opt.id ? 'sort-option-active' : ''}`}
                      onClick={() => { setSortBy(opt.id); setShowSortDropdown(false) }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="command-filter-toggle" onClick={() => setShowMobileFilters(!showMobileFilters)}>
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilters.length > 0 && <span className="filter-count-dot">{activeFilters.length}</span>}
          </button>
        </div>
      </div>

      {/* ACTIVE FILTER TAGS BAR */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div 
            className="active-filters-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="active-filters-inner">
              <span className="active-filters-label">
                <Tag size={13} /> Active Filters
              </span>
              <div className="active-filter-tags">
                {activeFilters.map(tag => (
                  <motion.span 
                    key={tag.key} 
                    className="filter-tag"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    style={{ '--tag-color': tag.color }}
                  >
                    <span className="filter-tag-dot" style={{ background: tag.color }}></span>
                    {tag.label}
                    <button className="filter-tag-remove" onClick={tag.clear}>
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
              </div>
              <button className="clear-all-filters-btn" onClick={clearAllFilters}>
                <RotateCcw size={12} />
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="reports-body">
        {/* LEFT SIDEBAR: Advanced Filters */}
        <aside className={`reports-sidebar ${showMobileFilters ? 'sidebar-mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">
              <SlidersHorizontal size={15} />
              Advanced Filters
            </h3>
            <button className="sidebar-close-mobile" onClick={() => setShowMobileFilters(false)}>
              <X size={18} />
            </button>
            {activeFilters.length > 0 && (
              <button className="sidebar-reset-btn" onClick={clearAllFilters}>
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>

          <div className="sidebar-filters-scroll">
            {/* STATUS */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('status')}>
                <span>Status</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.status ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.status && (
                <div className="filter-chips-grid">
                  {STATUS_OPTIONS.map(opt => (
                    <button 
                      key={opt.id}
                      className={`filter-chip-v2 ${statusFilter === opt.id ? 'chip-active' : ''}`}
                      onClick={() => setStatusFilter(statusFilter === opt.id ? 'all' : opt.id)}
                    >
                      {opt.label}
                      {statusFilter === opt.id && <CheckCircle2 size={13} className="chip-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SEVERITY */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('severity')}>
                <span>Severity</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.severity ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.severity && (
                <div className="filter-chips-grid">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button 
                      key={opt.id}
                      className={`filter-chip-v2 ${severityFilter === opt.id ? 'chip-active' : ''}`}
                      onClick={() => setSeverityFilter(severityFilter === opt.id ? 'all' : opt.id)}
                    >
                      {opt.label}
                      {severityFilter === opt.id && <CheckCircle2 size={13} className="chip-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ISSUE TYPE */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('category')}>
                <span>Issue Type</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.category ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.category && (
                <div className="filter-chips-grid">
                  {Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button 
                        key={id}
                        className={`filter-chip-v2 chip-with-icon ${categoryFilter === id ? 'chip-active' : ''}`}
                        onClick={() => setCategoryFilter(categoryFilter === id ? 'all' : id)}
                      >
                        <Icon size={13} />
                        {cfg.label}
                        {categoryFilter === id && <CheckCircle2 size={13} className="chip-check" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* AI CONFIDENCE RANGE */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('confidence')}>
                <span>AI Confidence</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.confidence ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.confidence && (
                <div className="range-slider-block">
                  <div className="range-labels">
                    <span className="range-value">{confidenceRange[0]}%</span>
                    <span className="range-separator">to</span>
                    <span className="range-value">{confidenceRange[1]}%</span>
                  </div>
                  <div className="dual-range-track">
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={confidenceRange[0]}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val <= confidenceRange[1]) setConfidenceRange([val, confidenceRange[1]])
                      }}
                      className="range-input range-min"
                    />
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={confidenceRange[1]}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val >= confidenceRange[0]) setConfidenceRange([confidenceRange[0], val])
                      }}
                      className="range-input range-max"
                    />
                    <div 
                      className="range-fill" 
                      style={{ 
                        left: `${confidenceRange[0]}%`, 
                        width: `${confidenceRange[1] - confidenceRange[0]}%` 
                      }}
                    ></div>
                  </div>
                  <div className="range-presets">
                    <button className={`range-preset ${confidenceRange[0] >= 90 ? 'preset-active' : ''}`} onClick={() => setConfidenceRange([90, 100])}>
                      High (90%+)
                    </button>
                    <button className={`range-preset ${confidenceRange[0] >= 70 && confidenceRange[1] <= 90 ? 'preset-active' : ''}`} onClick={() => setConfidenceRange([70, 90])}>
                      Mid (70-90%)
                    </button>
                    <button className={`range-preset ${confidenceRange[1] <= 70 ? 'preset-active' : ''}`} onClick={() => setConfidenceRange([0, 70])}>
                      Low (&lt;70%)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SLA STATUS */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('sla')}>
                <span>SLA Status</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.sla ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.sla && (
                <div className="filter-chips-grid">
                  {SLA_OPTIONS.map(opt => (
                    <button 
                      key={opt.id}
                      className={`filter-chip-v2 ${slaFilter === opt.id ? 'chip-active' : ''}`}
                      onClick={() => setSlaFilter(slaFilter === opt.id ? 'all' : opt.id)}
                    >
                      {opt.label}
                      {slaFilter === opt.id && <CheckCircle2 size={13} className="chip-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TIMEFRAME */}
            <div className="filter-section">
              <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('timeframe')}>
                <span>Timeframe</span>
                <ChevronDown size={14} className={`collapse-icon ${collapsedSections.timeframe ? 'collapsed' : ''}`} />
              </h4>
              {!collapsedSections.timeframe && (
                <div className="filter-chips-grid">
                  {DATE_OPTIONS.map(opt => (
                    <button 
                      key={opt.id}
                      className={`filter-chip-v2 ${dateRange === opt.id ? 'chip-active' : ''}`}
                      onClick={() => setDateRange(dateRange === opt.id ? 'all' : opt.id)}
                    >
                      <Clock size={13} />
                      {opt.label}
                      {dateRange === opt.id && <CheckCircle2 size={13} className="chip-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DISTRICT - Super Admin Only */}
            {user?.role === 'super_admin' && (
              <div className="filter-section">
                <h4 className="filter-section-label collapsive-label" onClick={() => toggleSection('district')}>
                  <span>District</span>
                  <ChevronDown size={14} className={`collapse-icon ${collapsedSections.district ? 'collapsed' : ''}`} />
                </h4>
                {!collapsedSections.district && (
                  <div className="filter-chips-grid">
                    {districtOptions.map(district => (
                      <button
                        key={district}
                        className={`filter-chip-v2 ${districtFilter === district ? 'chip-active' : ''}`}
                        onClick={() => setDistrictFilter(districtFilter === district ? 'all' : district)}
                      >
                        <MapPin size={13} />
                        {district}
                        {districtFilter === district && <CheckCircle2 size={13} className="chip-check" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Overlay for mobile filters */}
        {showMobileFilters && <div className="sidebar-overlay" onClick={() => setShowMobileFilters(false)} />}

        {/* MAIN BODY: Card Grid */}
        <div className="reports-main-area">
          <div className="reports-results-info">
            <span>{filteredAndSortedReports.length} report{filteredAndSortedReports.length !== 1 ? 's' : ''} found</span>
          </div>

          {loading ? (
             <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
               <Loader />
             </div>
          ) : filteredAndSortedReports.length === 0 ? (
             <div className="empty-state-ui">
               <div className="empty-icon-wrap">
                 <CheckCircle2 size={48} color="#22c55e" />
               </div>
               <h3>No Reports Found</h3>
               <p>No active tasks match your current filter parameters or jurisdiction.</p>
               {activeFilters.length > 0 && (
                 <button className="empty-reset-btn" onClick={clearAllFilters}>
                   <RotateCcw size={14} /> Clear All Filters
                 </button>
               )}
             </div>
          ) : (
             <div className="report-card-grid">
               {filteredAndSortedReports.map(report => {
                  const isCritical = report.severity === 'critical';
                 const categoryMeta = CATEGORY_CONFIG[report.category]
                 const CategoryIcon = categoryMeta?.icon || MapPin
                 const sla = getSLAStatus(report)
                  
                  return (
                    <motion.div 
                      key={report.id} 
                      className="mission-card" 
                      onClick={() => setSelectedReport(report)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                    >
                       <div className="card-header">
                         <span className="card-id">{report.id}</span>
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                           {report.supportersCount > 1 && (
                             <span className="text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444450' }}>
                               🔥 {report.supportersCount} Signals
                             </span>
                           )}
                           <span className={`severity-badge-custom sev-${report.severity} ${isCritical && report.status !== 'resolved' ? 'pulse-critical' : ''}`}>
                             {report.severity.toUpperCase()}
                           </span>
                         </div>
                       </div>

                       <div className="card-image-box">
                         <img src={getReportImage(report)} alt="report documentation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[report.category] || FALLBACK_IMAGES.default }} />
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
                           <div className={`sla-timer ${sla.class}`}>
                             {sla.text}
                           </div>
                         </div>
                       </div>

                       {/* HOVER ACTIONS - Now with visible colored buttons */}
                       <div className="card-hover-actions">
                         <button className="hover-action-btn hover-action-review" onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}>
                           <ScanSearch size={14} /> Review
                         </button>
                         {report.status === 'pending' && (
                           <button className="hover-action-btn hover-action-verify" onClick={(e) => { e.stopPropagation(); updateReportStatus(report.id, 'verified'); }}>
                             <CheckCircle2 size={14} /> Verify
                           </button>
                         )}
                         {report.status === 'verified' && (
                           <button className="hover-action-btn hover-action-assign" onClick={(e) => { e.stopPropagation(); updateReportStatus(report.id, 'assigned'); }}>
                             <HardHat size={14} /> Assign
                           </button>
                         )}
                       </div>
                    </motion.div>
                  )
               })}
             </div>
          )}
        </div>
      </div>
      
      {/* Slide-in Detail Panel */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div 
              className="panel-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
            />
            <motion.div 
              className="report-side-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Panel Header */}
              <div className="side-panel-header">
                <div>
                  <h3 className="panel-title">
                    TICKET REGISTRY <span className="panel-id">{selectedReport.id}</span>
                  </h3>
                </div>
                <button className="panel-close-btn" onClick={() => setSelectedReport(null)}>
                  <X size={20} />
                </button>
              </div>
              
              {/* Panel Body */}
              <div className="side-panel-content">
                {/* Image Block */}
                <div className="panel-image-block">
                   <img src={getReportImage(selectedReport)} alt="evidence" className="panel-evidence-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[selectedReport.category] || FALLBACK_IMAGES.default }} />
                   <div className="panel-image-badges">
                     <StatusBadge status={selectedReport.status} />
                     <SeverityBadge severity={selectedReport.severity} />
                   </div>
                   <div className="panel-image-location">
                     <MapPin size={14} color="var(--signal-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
                     <span>{selectedReport.location.address}</span>
                   </div>
                </div>
                
                {/* AI Telemetry Block */}
                <div className="panel-ai-block">
                  <h4 className="panel-ai-title">
                    <ScanSearch size={14} /> AI TELEMETRY
                  </h4>
                  <div className="panel-ai-content">
                    <AiConfidenceBadge confidence={selectedReport.aiConfidence} />
                    <p className="panel-ai-summary">
                      Pattern match: <strong>{selectedReport.category?.toUpperCase()}</strong>. 
                      Structural degradation estimated at <strong>{selectedReport.severity?.toUpperCase()}</strong> severity.
                    </p>
                  </div>
                </div>
                
                {/* Title & Description */}
                <div className="panel-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 className="panel-report-title" style={{ margin: 0 }}>{selectedReport.title}</h3>
                    {selectedReport.supportersCount > 1 && (
                      <span className="text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444450' }}>
                        🔥 {selectedReport.supportersCount} CITIZEN SIGNALS
                      </span>
                    )}
                  </div>
                  <p className="panel-description">{selectedReport.description || "No supplemental notes provided."}</p>
                </div>
                
                {/* Stats Grid */}
                <div className="panel-stats-grid">
                   <div className="panel-stat-card">
                     <p className="panel-stat-label">TIME SINCE REPORTED</p>
                     <p className="panel-stat-value">{Math.floor((new Date() - new Date(selectedReport.createdAt)) / 3600000)} Hours Ago</p>
                   </div>
                   <div className="panel-stat-card">
                     <p className="panel-stat-label">SLA DEADLINE</p>
                     <p className="panel-stat-value">
                       <span className={getSLAStatus(selectedReport).class}>{getSLAStatus(selectedReport).text}</span>
                     </p>
                   </div>
                </div>

                {/* Severity highlight */}
                <div className="panel-stat-card">
                  <p className="panel-stat-label">CURRENT SEVERITY</p>
                  <span className={`severity-badge-custom sev-${selectedReport.severity}`} style={{ display: 'inline-block', marginTop: '6px' }}>
                    {selectedReport.severity?.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Panel Footer - Action Buttons */}
              <div className="side-panel-footer">
                <p className="panel-action-label">ACTION TERMINAL</p>
                
                {selectedReport.status === 'pending' && (
                  <div className="panel-actions-grid">
                    <button className="panel-action-btn panel-btn-verify" onClick={() => handlePanelAction('verified')}>
                      <CheckCircle2 size={16} /> Verify Report
                    </button>
                    <button className="panel-action-btn panel-btn-reject" onClick={() => handlePanelAction('resolved')}>
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
                
                {selectedReport.status === 'verified' && (
                  <>
                    {assigningMode ? (
                      <div className="panel-assign-form">
                        <select className="panel-assign-select">
                          <option>Dept of Public Works</option>
                          <option>Water & Sewage Board</option>
                          <option>Highway Maintenance</option>
                        </select>
                        <div className="panel-assign-actions">
                          <button className="panel-action-btn panel-btn-dispatch" onClick={() => handlePanelAction('assigned')}>
                            Confirm Dispatch
                          </button>
                          <button className="panel-action-btn panel-btn-cancel" onClick={() => setAssigningMode(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="panel-action-btn panel-btn-assign-full" onClick={() => setAssigningMode(true)}>
                        <HardHat size={16} /> Assign to Worker
                      </button>
                    )}
                  </>
                )}
                
                {selectedReport.status === 'assigned' && (
                  <button className="panel-action-btn panel-btn-resolve" onClick={() => handlePanelAction('resolved')}>
                    <CheckCircle2 size={16} /> Validate & Resolve
                  </button>
                )}
                
                {selectedReport.status === 'resolved' && (
                  <div className="panel-resolved-card">
                    <CheckCircle2 size={20} />
                    <span>Resolved & Archived</span>
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
