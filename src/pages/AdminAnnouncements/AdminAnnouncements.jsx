import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, CalendarClock, MapPin, Megaphone, Trash2, Clock, ChevronDown, AlertTriangle } from 'lucide-react'
import useStore from '../../store/useStore'
import './AdminAnnouncements.css'

const REPORT_CATEGORIES = ['pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other']
const SUPPORTED_DISTRICTS = ['Coimbatore', 'Erode', 'Tiruppur', 'Salem', 'Trichy']

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  high:     { label: 'High',     color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  normal:   { label: 'Normal',   color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
}

const TTL_PRESETS = [
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
  { value: '72', label: '3 days' },
  { value: '168', label: '1 week' },
  { value: '336', label: '2 weeks' },
]

const formatTimeLeft = (expiresAt) => {
  const end = new Date(expiresAt)
  const now = new Date()
  const diffMs = end - now

  if (diffMs <= 0) return 'Expired'
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Ends in <1h'
  if (diffHours < 24) return `${diffHours}h left`
  const days = Math.floor(diffHours / 24)
  return `${days}d left`
}

const AdminAnnouncements = () => {
  const {
    user,
    announcements,
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
  } = useStore()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [form, setForm] = useState({
    title: '',
    message: '',
    category: 'update',
    priority: 'normal',
    ward: '',
    expiresInHours: '24',
    reportCategories: [],
  })

  useEffect(() => {
    const query = {}

    if (user?.role === 'district_admin' && user?.district) {
      query.district = user.district
    }

    if (user?.role === 'super_admin' && districtFilter !== 'all') {
      query.district = districtFilter
    }

    fetchAnnouncements(query).catch((fetchError) => {
      console.error('Failed to fetch admin announcements', fetchError)
    })
  }, [user?.role, user?.district, districtFilter, fetchAnnouncements])

  const visibleAnnouncements = useMemo(() => {
    if (user?.role === 'district_admin') {
      return announcements.filter((item) => item.district === user.district)
    }

    if (districtFilter === 'all') {
      return announcements
    }

    return announcements.filter((item) => item.district === districtFilter)
  }, [announcements, user?.role, user?.district, districtFilter])

  const districts = SUPPORTED_DISTRICTS

  const toggleCategory = (category) => {
    setForm((prev) => {
      const exists = prev.reportCategories.includes(category)
      return {
        ...prev,
        reportCategories: exists
          ? prev.reportCategories.filter((item) => item !== category)
          : [...prev.reportCategories, category],
      }
    })
  }

  const handleCreate = async () => {
    setError('')
    setSuccess('')

    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required')
      return
    }

    const ttlHours = Number(form.expiresInHours)
    if (!Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 336) {
      setError('Expiry must be between 1 and 336 hours')
      return
    }

    setSaving(true)

    try {
      await createAnnouncement({
        title: form.title,
        message: form.message,
        category: form.category,
        priority: form.priority,
        ward: form.ward,
        reportCategories: form.reportCategories,
        district: user?.role === 'super_admin' && districtFilter !== 'all'
          ? districtFilter
          : user?.role === 'district_admin'
            ? user.district
            : undefined,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
      })

      setForm({
        title: '',
        message: '',
        category: 'update',
        priority: 'normal',
        ward: '',
        expiresInHours: '24',
        reportCategories: [],
      })
      setSuccess('Announcement published successfully!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (createError) {
      setError(createError.message || 'Could not publish announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setError('')

    try {
      await deleteAnnouncement(id)
    } catch (deleteError) {
      setError(deleteError.message || 'Could not remove announcement')
    }
  }

  return (
    <div className="admin-ann-page container">
      {/* Hero Header */}
      <section className="admin-ann-hero card">
        <div>
          <p className="admin-ann-kicker">District Communication Control</p>
          <h1 className="heading-display heading-md">Announcements</h1>
          <p className="admin-ann-subtitle">
            Publish targeted updates for citizens. Prioritized by urgency, filtered by district.
          </p>
        </div>

        {user?.role === 'super_admin' && (
          <div className="admin-ann-district-bar">
            <span className="admin-ann-district-label">District Scope</span>
            <div className="admin-ann-district-chips">
              <button
                type="button"
                className={`ann-district-chip ${districtFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDistrictFilter('all')}
              >
                All
              </button>
              {districts.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ann-district-chip ${districtFilter === d ? 'active' : ''}`}
                  onClick={() => setDistrictFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Main Layout: Composer + List */}
      <div className="admin-ann-layout">
        {/* Composer */}
        <section className="admin-ann-composer card">
          <h2 className="ann-composer-title">
            <Megaphone size={18} /> Publish Announcement
          </h2>

          {/* Title */}
          <div className="ann-field">
            <label className="ann-field-label">Title</label>
            <input
              type="text"
              className="ann-input"
              placeholder="Enter announcement title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Message */}
          <div className="ann-field">
            <label className="ann-field-label">Message</label>
            <textarea
              className="ann-input ann-textarea"
              placeholder="Write a clear public message..."
              rows={4}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            />
          </div>

          {/* Category & Priority */}
          <div className="ann-field-row">
            <div className="ann-field">
              <label className="ann-field-label">Category</label>
              <select
                className="ann-select"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="alert">Alert</option>
                <option value="update">Update</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="ann-field">
              <label className="ann-field-label">Priority</label>
              <select
                className="ann-select"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟡 High</option>
                <option value="normal">🔵 Normal</option>
              </select>
            </div>
          </div>

          {/* Ward & Expiry */}
          <div className="ann-field-row">
            <div className="ann-field">
              <label className="ann-field-label">Ward <span className="optional-tag">(optional)</span></label>
              <input
                type="text"
                className="ann-input"
                placeholder="e.g. Ward 5"
                value={form.ward}
                onChange={(e) => setForm((prev) => ({ ...prev, ward: e.target.value }))}
              />
            </div>

            <div className="ann-field">
              <label className="ann-field-label">
                <Clock size={12} /> Expires After
              </label>
              <select
                className="ann-select"
                value={form.expiresInHours}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresInHours: e.target.value }))}
              >
                {TTL_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Category Tags */}
          <div className="ann-field">
            <label className="ann-field-label">Related Issue Types <span className="optional-tag">(optional)</span></label>
            <div className="ann-category-tags">
              {REPORT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`ann-tag ${form.reportCategories.includes(category) ? 'active' : ''}`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {error && <p className="ann-error"><AlertTriangle size={14} /> {error}</p>}
          {success && <p className="ann-success">✓ {success}</p>}

          <button type="button" className="btn btn-primary ann-publish-btn" onClick={handleCreate} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </section>

        {/* List */}
        <section className="admin-ann-list-section card">
          <h2 className="ann-list-title">
            <BellRing size={18} /> Active Announcements
            <span className="ann-list-count">{visibleAnnouncements.length}</span>
          </h2>

          <div className="admin-ann-scroll">
            {visibleAnnouncements.length > 0 ? (
              visibleAnnouncements.map((item, index) => {
                const prioConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal
                return (
                  <motion.div
                    key={item.id}
                    className="ann-list-item"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="ann-list-item-content">
                      <div className="ann-list-item-header">
                        <strong>{item.title}</strong>
                        <span
                          className="ann-priority-badge"
                          style={{ color: prioConfig.color, background: prioConfig.bg, borderColor: prioConfig.border }}
                        >
                          {prioConfig.label}
                        </span>
                      </div>
                      <p className="ann-list-item-message">{item.message}</p>
                      <div className="ann-list-item-meta">
                        <span><MapPin size={12} /> {item.ward || item.district}</span>
                        <span><CalendarClock size={12} /> {formatTimeLeft(item.expiresAt)}</span>
                        <span className="ann-item-category">{item.category}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ann-delete-btn"
                      onClick={() => handleDelete(item.id)}
                      title="Delete announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                )
              })
            ) : (
              <div className="ann-list-empty">
                <BellRing size={28} style={{ color: 'var(--text-tertiary)' }} />
                <p>No active announcements for this scope.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminAnnouncements
