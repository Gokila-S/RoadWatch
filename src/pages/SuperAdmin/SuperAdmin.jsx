import { useEffect, useMemo, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MapPin, Shield, Activity, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Plus, Edit3, Trash2, X, ChevronRight,
  BarChart3, Zap, Globe, UserCheck, RotateCcw, Search, Eye,
  EyeOff, Lock, Phone, Mail, Building2, UserPlus, AlertCircle
} from 'lucide-react'
import useStore from '../../store/useStore'
import './SuperAdmin.css'

// Tamil Nadu district coordinates for the map
const DISTRICT_COORDS = {
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  erode:       { lat: 11.3410, lng: 77.7172 },
  tiruppur:    { lat: 11.1085, lng: 77.3411 },
  salem:       { lat: 11.6643, lng: 78.1460 },
  trichy:      { lat: 10.7905, lng: 78.7047 },
}

const FIELD_RULES = {
  full_name:          { minLength: 3, maxLength: 60, pattern: /^[A-Za-z][A-Za-z\s'.-]{2,59}$/, message: 'Name: 3-60 chars, letters only.' },
  email:              { maxLength: 100, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' },
  temporary_password: { minLength: 8, maxLength: 64, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/, message: 'Min 8 chars, mixed case, number, symbol.' },
  district:           { minLength: 3, maxLength: 50, pattern: /^[A-Za-z][A-Za-z\s-]{2,49}$/, message: 'District: 3-50 chars.' },
  phone:              { minLength: 10, maxLength: 15, pattern: /^\+?[0-9]{10,15}$/, message: 'Phone: 10-15 digits.' },
}

const validateValue = (name, value, { optional = false } = {}) => {
  const rule = FIELD_RULES[name]
  if (!rule) return ''
  const trimmed = String(value || '').trim()
  if (!trimmed) return optional ? '' : `${name.replace('_', ' ')} is required.`
  if (rule.minLength && trimmed.length < rule.minLength) return rule.message
  if (rule.maxLength && trimmed.length > rule.maxLength) return rule.message
  if (rule.pattern && !rule.pattern.test(trimmed)) return rule.message
  return ''
}

const normalizeForSubmit = (payload) => ({
  ...payload,
  full_name: payload.full_name.trim(),
  email: payload.email.trim().toLowerCase(),
  district: payload.district.trim(),
  phone: payload.phone.trim(),
})

const initialForm = { full_name: '', email: '', temporary_password: '', district: '', phone: '' }

const TAB_OVERVIEW = 'overview'
const TAB_CREATE   = 'create'
const TAB_ADMINS   = 'admins'

const SuperAdmin = () => {
  const { createDistrictAdmin, updateDistrictAdmin, deleteDistrictAdmin, fetchDistrictAdmins, districtAdmins, reports, analyticsSummary, districts } = useStore()

  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [editing, setEditing] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    fetchDistrictAdmins().catch(err => setMsg({ type: 'error', text: err.message }))
    setTimeout(() => setMapReady(true), 100)
  }, [fetchDistrictAdmins])

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [msg])

  const districtCount = useMemo(() => new Set(districtAdmins.map(a => a.district)).size, [districtAdmins])
  const activeCount = useMemo(() => districtAdmins.filter(a => a.status === 'active').length, [districtAdmins])

  const filteredAdmins = useMemo(() => {
    if (!search) return districtAdmins
    const q = search.toLowerCase()
    return districtAdmins.filter(a =>
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q)
    )
  }, [districtAdmins, search])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setFormErrors(prev => ({ ...prev, [name]: '' }))
  }, [])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setFormErrors(prev => ({ ...prev, [name]: validateValue(name, value) }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = Object.fromEntries(
      Object.keys(FIELD_RULES).map(k => [k, validateValue(k, form[k])])
    )
    if (Object.values(errs).some(Boolean)) return setFormErrors(errs)

    setLoading(true)
    setMsg(null)
    try {
      await createDistrictAdmin(normalizeForSubmit(form))
      setMsg({ type: 'success', text: '✓ District admin created successfully.' })
      setForm(initialForm)
      setFormErrors({})
      setActiveTab(TAB_ADMINS)
      await fetchDistrictAdmins()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to create district admin.' })
    } finally {
      setLoading(false)
    }
  }

  const openEdit = useCallback((admin) => {
    setEditTarget(admin)
    setEditForm({ ...admin, temporary_password: '' })
    setEditErrors({})
    setMsg(null)
  }, [])

  const submitEdit = async (e) => {
    e.preventDefault()
    const errs = {
      full_name: validateValue('full_name', editForm.full_name),
      email:     validateValue('email', editForm.email),
      district:  validateValue('district', editForm.district),
      phone:     validateValue('phone', editForm.phone),
      temporary_password: validateValue('temporary_password', editForm.temporary_password, { optional: true }),
    }
    if (Object.values(errs).some(Boolean)) return setEditErrors(errs)

    setEditing(true)
    try {
      const payload = { full_name: editForm.full_name, email: editForm.email, district: editForm.district, phone: editForm.phone, status: editForm.status }
      if (editForm.temporary_password?.trim()) payload.temporary_password = editForm.temporary_password
      await updateDistrictAdmin(editTarget.id, normalizeForSubmit(payload))
      setMsg({ type: 'success', text: '✓ Admin updated successfully.' })
      setEditTarget(null)
      await fetchDistrictAdmins()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Update failed.' })
    } finally {
      setEditing(false)
    }
  }

  const onDeleteAdmin = async (admin) => {
    if (!window.confirm(`Delete ${admin.full_name}? This cannot be undone.`)) return
    setDeletingId(admin.id)
    try {
      await deleteDistrictAdmin(admin.id)
      setMsg({ type: 'success', text: `✓ ${admin.full_name} removed.` })
      await fetchDistrictAdmins()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Delete failed.' })
    } finally {
      setDeletingId('')
    }
  }

  const totalReports = reports?.length || 0
  const criticalActive = reports?.filter(r => r.severity === 'critical' && r.status !== 'resolved').length || 0

  const districtPerformance = useMemo(() => {
    return districtAdmins.map(admin => {
      const districtReports = reports?.filter(r => r.district === admin.district) || []
      const resolved = districtReports.filter(r => r.status === 'resolved').length
      const pending = districtReports.filter(r => r.status === 'pending').length
      const total = districtReports.length
      const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 0
      return { ...admin, districtReports: total, resolved, pending, resolveRate }
    })
  }, [districtAdmins, reports])

  return (
    <div className="sa-page">
      {/* Top Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div
            className={`sa-toast sa-toast-${msg.type}`}
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
          >
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
            <button onClick={() => setMsg(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAGE HEADER */}
      <div className="sa-page-header">
        <div className="sa-header-left">
          <div className="sa-header-badge">
            <Globe size={12} /> NATIONAL COMMAND
          </div>
          <h1 className="sa-headline">Super Admin Console</h1>
          <p className="sa-sub">Centralized governance for all district operations and administrator lifecycle management.</p>
        </div>
        <div className="sa-header-kpi-strip">
          <div className="sa-kpi-box">
            <Users size={18} className="sa-kpi-icon" style={{ color: '#a855f7' }} />
            <div>
              <p className="sa-kpi-label">District Admins</p>
              <p className="sa-kpi-value">{districtAdmins.length}</p>
            </div>
          </div>
          <div className="sa-kpi-box">
            <MapPin size={18} className="sa-kpi-icon" style={{ color: '#06b6d4' }} />
            <div>
              <p className="sa-kpi-label">Districts</p>
              <p className="sa-kpi-value">{districtCount}</p>
            </div>
          </div>
          <div className="sa-kpi-box">
            <UserCheck size={18} className="sa-kpi-icon" style={{ color: '#22c55e' }} />
            <div>
              <p className="sa-kpi-label">Active Accounts</p>
              <p className="sa-kpi-value">{activeCount}</p>
            </div>
          </div>
          <div className="sa-kpi-box">
            <AlertTriangle size={18} className="sa-kpi-icon" style={{ color: '#ef4444' }} />
            <div>
              <p className="sa-kpi-label">Critical Active</p>
              <p className="sa-kpi-value">{criticalActive}</p>
            </div>
          </div>
          <div className="sa-kpi-box">
            <BarChart3 size={18} className="sa-kpi-icon" style={{ color: '#f59e0b' }} />
            <div>
              <p className="sa-kpi-label">Total Reports</p>
              <p className="sa-kpi-value">{totalReports}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="sa-tabs">
        <button className={`sa-tab ${activeTab === TAB_OVERVIEW ? 'sa-tab-active' : ''}`} onClick={() => setActiveTab(TAB_OVERVIEW)}>
          <Globe size={14} /> Overview & Map
        </button>
        <button className={`sa-tab ${activeTab === TAB_ADMINS ? 'sa-tab-active' : ''}`} onClick={() => setActiveTab(TAB_ADMINS)}>
          <Users size={14} /> Admin Directory
        </button>
        <button className={`sa-tab ${activeTab === TAB_CREATE ? 'sa-tab-active' : ''}`} onClick={() => setActiveTab(TAB_CREATE)}>
          <UserPlus size={14} /> Create Admin
        </button>
      </div>

      {/* ── TAB: OVERVIEW & MAP ── */}
      {activeTab === TAB_OVERVIEW && (
        <div className="sa-tab-body">
          {/* District Grid */}
          <div className="sa-section">
            <h2 className="sa-section-title"><Activity size={16} /> District Performance</h2>
            <div className="sa-district-grid">
              {districtPerformance.map(admin => (
                <motion.div
                  key={admin.id}
                  className={`sa-district-card ${selectedDistrict?.id === admin.id ? 'sa-district-card-selected' : ''}`}
                  onClick={() => setSelectedDistrict(selectedDistrict?.id === admin.id ? null : admin)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="sa-dc-header">
                    <div className="sa-dc-avatar">{admin.full_name?.charAt(0)}</div>
                    <div className="sa-dc-info">
                      <p className="sa-dc-district">{admin.district}</p>
                      <p className="sa-dc-admin">{admin.full_name}</p>
                    </div>
                    <span className={`sa-dc-status ${admin.status === 'active' ? 'sa-status-active' : 'sa-status-inactive'}`}>
                      {admin.status}
                    </span>
                  </div>

                  <div className="sa-dc-metrics">
                    <div className="sa-dc-metric">
                      <p className="sa-dc-metric-label">Total</p>
                      <p className="sa-dc-metric-val">{admin.districtReports}</p>
                    </div>
                    <div className="sa-dc-metric">
                      <p className="sa-dc-metric-label">Resolved</p>
                      <p className="sa-dc-metric-val" style={{ color: '#22c55e' }}>{admin.resolved}</p>
                    </div>
                    <div className="sa-dc-metric">
                      <p className="sa-dc-metric-label">Pending</p>
                      <p className="sa-dc-metric-val" style={{ color: '#f59e0b' }}>{admin.pending}</p>
                    </div>
                  </div>

                  <div className="sa-dc-progress-row">
                    <div className="sa-dc-progress-track">
                      <div className="sa-dc-progress-fill" style={{ width: `${admin.resolveRate}%` }}></div>
                    </div>
                    <span className="sa-dc-resolve-rate">{admin.resolveRate}% resolved</span>
                  </div>
                </motion.div>
              ))}

              {districtAdmins.length === 0 && (
                <div className="sa-empty-state">
                  <Globe size={40} style={{ color: 'var(--text-tertiary)' }} />
                  <p>No district admins registered yet.</p>
                  <button className="sa-btn sa-btn-primary" onClick={() => setActiveTab(TAB_CREATE)}>
                    <UserPlus size={14} /> Create First Admin
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAP */}
          <div className="sa-section">
            <h2 className="sa-section-title"><MapPin size={16} /> District Coverage Map</h2>
            <div className="sa-map-container">
              {mapReady && (
                <MapContainer
                  center={[11.0168, 77.5]}
                  zoom={7}
                  style={{ height: '100%', width: '100%', borderRadius: '10px' }}
                  zoomControl={true}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {districtAdmins.map(admin => {
                    const key = admin.district?.toLowerCase().trim()
                    const coords = DISTRICT_COORDS[key]
                    if (!coords) return null
                    const distReports = reports?.filter(r => r.district === admin.district) || []
                    const critical = distReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length
                    const color = critical > 0 ? '#ef4444' : admin.status === 'active' ? '#22c55e' : '#6b7280'
                    return (
                      <CircleMarker
                        key={admin.id}
                        center={[coords.lat, coords.lng]}
                        radius={critical > 0 ? 14 : 10}
                        pathOptions={{
                          color: color,
                          fillColor: color,
                          fillOpacity: 0.5,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px' }}>
                            <strong style={{ fontSize: '14px' }}>{admin.district}</strong>
                            <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Admin: {admin.full_name}</p>
                            <p style={{ margin: '2px 0', fontSize: '12px' }}>Reports: {distReports.length}</p>
                            {critical > 0 && <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>⚠ {critical} Critical Active</p>}
                            <span style={{ 
                              display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '99px',
                              fontSize: '11px', fontWeight: 600,
                              background: admin.status === 'active' ? '#dcfce7' : '#fef3c7',
                              color: admin.status === 'active' ? '#166534' : '#92400e'
                            }}>
                              {admin.status}
                            </span>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}
                </MapContainer>
              )}
              <div className="sa-map-legend">
                <span className="sa-legend-item"><span className="sa-legend-dot" style={{ background: '#ef4444' }}></span>Critical alerts</span>
                <span className="sa-legend-item"><span className="sa-legend-dot" style={{ background: '#22c55e' }}></span>Active admin</span>
                <span className="sa-legend-item"><span className="sa-legend-dot" style={{ background: '#6b7280' }}></span>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ADMIN DIRECTORY ── */}
      {activeTab === TAB_ADMINS && (
        <div className="sa-tab-body">
          <div className="sa-section">
            <div className="sa-section-topbar">
              <h2 className="sa-section-title" style={{ margin: 0 }}>
                <Shield size={16} /> District Administrator Directory
              </h2>
              <div className="sa-dir-search">
                <Search size={14} className="sa-dir-search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, email, district..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="sa-dir-search-input"
                />
                {search && <button onClick={() => setSearch('')} className="sa-dir-search-clear"><X size={12} /></button>}
              </div>
            </div>

            {filteredAdmins.length === 0 ? (
              <div className="sa-empty-state">
                <Users size={36} style={{ color: 'var(--text-tertiary)' }} />
                <p>{search ? 'No admins match your search.' : 'No district admins registered.'}</p>
              </div>
            ) : (
              <div className="sa-admin-cards">
                {filteredAdmins.map(admin => {
                  const joinedAt = admin.createdAt || admin.created_at
                  const joinedLabel = joinedAt
                    ? new Date(joinedAt).toLocaleDateString()
                    : 'Unknown'

                  return (
                    <motion.div
                      key={admin.id}
                      className="sa-admin-card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                    >
                      <div className="sa-admin-card-header">
                        <div className="sa-admin-avatar">{admin.full_name?.charAt(0)}</div>
                        <div className="sa-admin-info">
                          <h3 className="sa-admin-name">{admin.full_name}</h3>
                          <p className="sa-admin-email"><Mail size={11} /> {admin.email}</p>
                          <p className="sa-admin-district"><Building2 size={11} /> {admin.district}</p>
                        </div>
                        <div className="sa-admin-card-right">
                          <span className={`sa-dc-status ${admin.status === 'active' ? 'sa-status-active' : 'sa-status-inactive'}`}>
                            {admin.status}
                          </span>
                          <div className="sa-admin-actions">
                            <button className="sa-icon-btn sa-icon-btn-edit" onClick={() => { openEdit(admin); setActiveTab(TAB_ADMINS) }} title="Edit">
                              <Edit3 size={14} />
                            </button>
                            <button className="sa-icon-btn sa-icon-btn-danger" onClick={() => onDeleteAdmin(admin)} disabled={deletingId === admin.id} title="Delete">
                              {deletingId === admin.id ? <RotateCcw size={14} className="spinning" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="sa-admin-card-stats">
                        <span className="sa-admin-stat"><Phone size={11} /> {admin.phone || 'N/A'}</span>
                        <span className="sa-admin-stat"><MapPin size={11} /> Scope: {admin.district}</span>
                        <span className="sa-admin-stat"><Clock size={11} /> Joined: {joinedLabel}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: CREATE ADMIN ── */}
      {activeTab === TAB_CREATE && (
        <div className="sa-tab-body">
          <div className="sa-section">
            <div className="sa-section-topbar">
              <h2 className="sa-section-title" style={{ margin: 0 }}>
                <UserPlus size={16} /> New District Administrator
              </h2>
              <span className="sa-governance-badge">GOVERNANCE CONSOLE</span>
            </div>
            <p className="sa-form-subtitle">Create a new district administrator account with full operational access.</p>

            <form className="sa-create-form" onSubmit={handleSubmit} noValidate>
              <div className="sa-form-grid">
                <div className="sa-field">
                  <label className="sa-label" htmlFor="full_name">Full Name</label>
                  <div className="sa-input-wrap">
                    <Users size={14} className="sa-input-icon" />
                    <input id="full_name" name="full_name" className={`sa-input ${formErrors.full_name ? 'sa-input-error' : ''}`}
                      value={form.full_name} onChange={handleChange} onBlur={handleBlur} placeholder="Dr. Rajesh Kumar" />
                  </div>
                  {formErrors.full_name && <p className="sa-field-error">{formErrors.full_name}</p>}
                </div>

                <div className="sa-field">
                  <label className="sa-label" htmlFor="email">Government Email</label>
                  <div className="sa-input-wrap">
                    <Mail size={14} className="sa-input-icon" />
                    <input id="email" name="email" type="email" className={`sa-input ${formErrors.email ? 'sa-input-error' : ''}`}
                      value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder="rajesh@coimbatore.tn.gov.in" />
                  </div>
                  {formErrors.email && <p className="sa-field-error">{formErrors.email}</p>}
                </div>

                <div className="sa-field">
                  <label className="sa-label" htmlFor="district">Assigned District</label>
                  <div className="sa-input-wrap">
                    <Building2 size={14} className="sa-input-icon" />
                    <input id="district" name="district" className={`sa-input ${formErrors.district ? 'sa-input-error' : ''}`}
                      value={form.district} onChange={handleChange} onBlur={handleBlur} placeholder="Coimbatore" />
                  </div>
                  {formErrors.district && <p className="sa-field-error">{formErrors.district}</p>}
                </div>

                <div className="sa-field">
                  <label className="sa-label" htmlFor="phone">Phone Number</label>
                  <div className="sa-input-wrap">
                    <Phone size={14} className="sa-input-icon" />
                    <input id="phone" name="phone" className={`sa-input ${formErrors.phone ? 'sa-input-error' : ''}`}
                      value={form.phone} onChange={handleChange} onBlur={handleBlur} placeholder="+919876543210" />
                  </div>
                  {formErrors.phone && <p className="sa-field-error">{formErrors.phone}</p>}
                </div>

                <div className="sa-field sa-field-full">
                  <label className="sa-label" htmlFor="temporary_password">Temporary Password</label>
                  <div className="sa-input-wrap">
                    <Lock size={14} className="sa-input-icon" />
                    <input id="temporary_password" name="temporary_password" type={showPassword ? 'text' : 'password'}
                      className={`sa-input ${formErrors.temporary_password ? 'sa-input-error' : ''}`}
                      value={form.temporary_password} onChange={handleChange} onBlur={handleBlur}
                      placeholder="Min 8 chars, uppercase, number, symbol" />
                    <button type="button" className="sa-pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.temporary_password && <p className="sa-field-error">{formErrors.temporary_password}</p>}
                </div>
              </div>

              <div className="sa-form-actions">
                <button type="button" className="sa-btn sa-btn-ghost" onClick={() => { setForm(initialForm); setFormErrors({}) }}>
                  <RotateCcw size={14} /> Reset
                </button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={loading}>
                  {loading ? <><RotateCcw size={14} className="spinning" /> Creating...</> : <><UserPlus size={14} /> Create Admin</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editTarget && (
          <>
            <motion.div className="sa-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditTarget(null)} />
            <div className="sa-modal-center-wrap">
              <motion.div className="sa-modal" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}>
              <div className="sa-modal-header">
                <div>
                  <h3 className="sa-modal-title">Edit Administrator</h3>
                  <p className="sa-modal-sub">{editTarget.full_name}</p>
                </div>
                <button className="sa-modal-close" onClick={() => setEditTarget(null)}><X size={18} /></button>
              </div>

              <form onSubmit={submitEdit} noValidate>
                <div className="sa-form-grid sa-modal-grid">
                  {[
                    { id: 'edit_full_name', name: 'full_name', label: 'Full Name', icon: Users, placeholder: '', type: 'text' },
                    { id: 'edit_email', name: 'email', label: 'Email', icon: Mail, placeholder: '', type: 'email' },
                    { id: 'edit_district', name: 'district', label: 'District', icon: Building2, placeholder: '', type: 'text' },
                    { id: 'edit_phone', name: 'phone', label: 'Phone', icon: Phone, placeholder: '', type: 'text' },
                  ].map(f => (
                    <div key={f.id} className="sa-field">
                      <label className="sa-label" htmlFor={f.id}>{f.label}</label>
                      <div className="sa-input-wrap">
                        <f.icon size={14} className="sa-input-icon" />
                        <input
                          id={f.id} name={f.name} type={f.type}
                          className={`sa-input ${editErrors[f.name] ? 'sa-input-error' : ''}`}
                          value={editForm[f.name] || ''}
                          onChange={e => { setEditForm(p => ({ ...p, [f.name]: e.target.value })); setEditErrors(p => ({ ...p, [f.name]: '' })) }}
                          onBlur={e => setEditErrors(p => ({ ...p, [f.name]: validateValue(f.name, e.target.value) }))}
                        />
                      </div>
                      {editErrors[f.name] && <p className="sa-field-error">{editErrors[f.name]}</p>}
                    </div>
                  ))}

                  <div className="sa-field">
                    <label className="sa-label" htmlFor="edit_status">Status</label>
                    <select id="edit_status" className="sa-input sa-select"
                      value={editForm.status || 'active'}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="sa-field sa-field-full">
                    <label className="sa-label" htmlFor="edit_pw">Reset Password <span className="sa-optional">(optional)</span></label>
                    <div className="sa-input-wrap">
                      <Lock size={14} className="sa-input-icon" />
                      <input id="edit_pw" name="temporary_password" type="password"
                        className={`sa-input ${editErrors.temporary_password ? 'sa-input-error' : ''}`}
                        value={editForm.temporary_password || ''}
                        onChange={e => { setEditForm(p => ({ ...p, temporary_password: e.target.value })); setEditErrors(p => ({ ...p, temporary_password: '' })) }}
                        onBlur={e => setEditErrors(p => ({ ...p, temporary_password: validateValue('temporary_password', e.target.value, { optional: true }) }))}
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                    {editErrors.temporary_password && <p className="sa-field-error">{editErrors.temporary_password}</p>}
                  </div>
                </div>

                <div className="sa-form-actions sa-modal-actions">
                  <button type="button" className="sa-btn sa-btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
                  <button type="submit" className="sa-btn sa-btn-primary" disabled={editing}>
                    {editing ? <><RotateCcw size={14} className="spinning" /> Saving...</> : <><CheckCircle size={14} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SuperAdmin
