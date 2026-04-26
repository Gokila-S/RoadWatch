import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, CalendarClock, Calendar, MapPin, Megaphone, Trash2, Clock, ChevronDown, AlertTriangle } from 'lucide-react'
import useStore from '../../store/useStore'
import './AdminAnnouncements.css'

const REPORT_CATEGORIES = ['pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other']
const SUPPORTED_DISTRICTS = ['Coimbatore', 'Erode', 'Tiruppur', 'Salem', 'Trichy']

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  high:     { label: 'High',     color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  normal:   { label: 'Normal',   color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
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
    targetDistrict: 'all',
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

  const { directives, localAnnouncements } = useMemo(() => {
    const sourceList = districtFilter === 'all'
      ? announcements
      : announcements.filter((item) => item.district === districtFilter || item.district === 'ALL')

    const scopedAnnouncements = user?.role === 'district_admin'
      ? announcements.filter((item) => item.district === user?.district || item.district === 'ALL')
      : sourceList

    const superAnnouncements = scopedAnnouncements.filter(
      (item) => item.createdByRole === 'super_admin' || (user?.role === 'super_admin' && item.createdBy === user?.id),
    )

    const districtAnnouncements = scopedAnnouncements.filter(
      (item) => item.createdByRole !== 'super_admin' && !(user?.role === 'super_admin' && item.createdBy === user?.id),
    )

    if (user?.role === 'district_admin') {
      return {
        localAnnouncements: districtAnnouncements,
        directives: superAnnouncements,
      }
    }

    return {
      localAnnouncements: districtAnnouncements,
      directives: superAnnouncements,
    }
  }, [announcements, user?.role, user?.district, user?.id, districtFilter])

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

    setSaving(true)

    try {
      await createAnnouncement({
        title: form.title,
        message: form.message,
        category: form.category,
        priority: form.priority,
        reportCategories: form.reportCategories,
        district: user?.role === 'super_admin'
          ? (form.targetDistrict === 'all' ? 'ALL' : form.targetDistrict)
          : user?.role === 'district_admin'
            ? user.district
            : undefined,
      })

      setForm({
        title: '',
        message: '',
        category: 'update',
        priority: 'normal',
        targetDistrict: 'all',
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

          {user?.role === 'super_admin' && (
            <div className="ann-field">
              <label className="ann-field-label">Target District</label>
              <select
                className="ann-select"
                value={form.targetDistrict}
                onChange={(e) => setForm((prev) => ({ ...prev, targetDistrict: e.target.value }))}
              >
                <option value="all">Global (All Districts)</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

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

        <div className="admin-ann-lists">
          {/* List */}
          <section className="admin-ann-list-section card">
            <h2 className="ann-list-title flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BellRing size={18} /> {user?.role === 'super_admin' ? 'District Admin Announcements' : 'District Announcements'}
              </span>
              <span className="ann-list-count">{localAnnouncements.length}</span>
            </h2>

            <div className="admin-ann-scroll">
              {localAnnouncements.length > 0 ? (
                localAnnouncements.map((item, index) => {
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
                          <span><Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span><MapPin size={12} /> {item.district}</span>
                          <span className="ann-item-category">{item.category}</span>
                        </div>
                      </div>

                      {user?.role !== 'district_admin' && (
                        <button
                          type="button"
                          className="ann-delete-btn"
                          onClick={() => handleDelete(item.id)}
                          title="Delete announcement"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  )
                })
              ) : (
                <div className="ann-list-empty">
                  <BellRing size={28} style={{ color: 'var(--text-tertiary)' }} />
                  <p>No district admin announcements for this scope.</p>
                </div>
              )}
            </div>
          </section>

          <section className="admin-ann-list-section card border border-amber-500 border-opacity-20">
            <h2 className="ann-list-title flex items-center justify-between" style={{ color: 'var(--amber)' }}>
              <span className="flex items-center gap-2">
                <AlertTriangle size={18} /> {user?.role === 'super_admin' ? 'Super Admin Announcements' : 'Super Admin Directives'}
              </span>
              <span className="ann-list-count" style={{ background: 'var(--amber)' }}>{directives.length}</span>
            </h2>

            <div className="admin-ann-scroll">
              {directives.length > 0 ? (
                directives.map((item, index) => {
                  const prioConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal
                  return (
                    <motion.div
                      key={item.id}
                      className="ann-list-item"
                      style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}
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
                        <p className="ann-list-item-message text-secondary">{item.message}</p>
                        <div className="ann-list-item-meta">
                          <span style={{ color: 'var(--text-dim)' }}><Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span style={{ color: 'var(--text-dim)' }}><MapPin size={12} /> {item.district}</span>
                          <span className="ann-item-category text-amber-500">{item.category}</span>
                        </div>
                      </div>

                      {user?.role !== 'district_admin' && (
                        <button
                          type="button"
                          className="ann-delete-btn"
                          onClick={() => handleDelete(item.id)}
                          title="Delete directive"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  )
                })
              ) : (
                <div className="ann-list-empty">
                  <AlertTriangle size={28} style={{ color: 'var(--amber)' }} />
                  <p>No super admin announcements for this scope.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminAnnouncements
