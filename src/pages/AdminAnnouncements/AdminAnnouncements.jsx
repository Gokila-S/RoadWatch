import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, CalendarClock, MapPin, Megaphone, Trash2 } from 'lucide-react'
import useStore from '../../store/useStore'
import './AdminAnnouncements.css'

const REPORT_CATEGORIES = ['pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other']

const AdminAnnouncements = () => {
  const {
    user,
    announcements,
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
  } = useStore()

  const [error, setError] = useState('')
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

  const districts = useMemo(() => {
    const unique = Array.from(new Set(announcements.map((item) => item.district)))
    return unique.sort()
  }, [announcements])

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
        district: user?.role === 'super_admin' && districtFilter !== 'all' ? districtFilter : undefined,
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
    <div className="admin-announcements-page container">
      <section className="admin-announcements-hero card">
        <div>
          <p className="admin-announcements-kicker">District Communication Control</p>
          <h1 className="heading-display heading-md">Admin Announcements</h1>
          <p className="admin-announcements-subtitle">
            Publish concise, high-value updates for citizens with district-level targeting.
          </p>
        </div>

        {user?.role === 'super_admin' ? (
          <div className="admin-announcements-district-filter">
            <label htmlFor="admin-announcement-district">District View</label>
            <select
              id="admin-announcement-district"
              className="admin-announcements-select"
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value="all">All districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <section className="admin-announcements-grid">
        <article className="admin-announcements-composer card">
          <h2><Megaphone size={18} /> Publish Announcement</h2>

          <input
            type="text"
            className="admin-announcements-input"
            placeholder="Announcement title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />

          <textarea
            className="admin-announcements-textarea"
            placeholder="Write a clear public message"
            rows={4}
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          />

          <div className="admin-announcements-inline-grid">
            <select
              className="admin-announcements-select"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="alert">Alert</option>
              <option value="update">Update</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              className="admin-announcements-select"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>

            <input
              type="text"
              className="admin-announcements-input"
              placeholder="Ward (optional)"
              value={form.ward}
              onChange={(event) => setForm((prev) => ({ ...prev, ward: event.target.value }))}
            />

            <input
              type="number"
              min="1"
              max="336"
              className="admin-announcements-input"
              placeholder="Expires in hours"
              value={form.expiresInHours}
              onChange={(event) => setForm((prev) => ({ ...prev, expiresInHours: event.target.value }))}
            />
          </div>

          <div className="admin-announcements-tags">
            {REPORT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`admin-announcement-tag ${form.reportCategories.includes(category) ? 'active' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {error ? <p className="admin-announcements-error">{error}</p> : null}

          <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </article>

        <article className="admin-announcements-list card">
          <h2><BellRing size={18} /> Active Announcements</h2>

          <div className="admin-announcements-scroll">
            {visibleAnnouncements.length > 0 ? (
              visibleAnnouncements.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="admin-announcement-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div>
                    <div className="admin-announcement-row-head">
                      <strong>{item.title}</strong>
                      <span className={`admin-announcement-priority ${item.priority}`}>{item.priority}</span>
                    </div>
                    <p>{item.message}</p>
                    <div className="admin-announcement-meta">
                      <span><MapPin size={13} /> {item.ward || item.district}</span>
                      <span><CalendarClock size={13} /> expires {new Date(item.expiresAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="admin-announcement-delete"
                    onClick={() => handleDelete(item.id)}
                    title="Delete announcement"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            ) : (
              <p className="admin-announcements-empty">No active announcements for this scope.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default AdminAnnouncements
