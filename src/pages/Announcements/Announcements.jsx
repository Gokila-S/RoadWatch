import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BellRing, Wrench, MapPin, Clock4 } from 'lucide-react'
import useStore from '../../store/useStore'
import './Announcements.css'

const CATEGORY_META = {
  alert: { label: 'Alerts', icon: AlertTriangle },
  update: { label: 'Updates', icon: BellRing },
  maintenance: { label: 'Maintenance', icon: Wrench },
}

const formatTimeLeft = (expiresAt) => {
  const end = new Date(expiresAt)
  const now = new Date()
  const diffMs = end - now

  if (diffMs <= 0) return 'Expired'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Ends in <1 hour'
  if (diffHours < 24) return `Ends in ${diffHours} hours`

  const days = Math.floor(diffHours / 24)
  return `Ends in ${days} day${days > 1 ? 's' : ''}`
}

const Announcements = () => {
  const {
    user,
    announcements,
    announcementFilter,
    setAnnouncementFilter,
    fetchAnnouncements,
    announcementsLoading,
  } = useStore()

  useEffect(() => {
    const query = {
      district: user?.district,
    }

    if (announcementFilter !== 'all') {
      query.category = announcementFilter
    }

    fetchAnnouncements(query).catch((error) => {
      console.error('Failed to fetch announcements page data', error)
    })
  }, [announcementFilter, fetchAnnouncements, user?.district])

  const criticalAnnouncements = useMemo(
    () => announcements.filter((item) => item.priority === 'critical').slice(0, 3),
    [announcements],
  )

  return (
    <div className="announcements-page container">
      <div className="announcements-hero card">
        <div>
          <p className="announcements-eyebrow">District Information Channel</p>
          <h1 className="heading-display heading-md">Announcements for {user?.district || 'your district'}</h1>
          <p className="announcements-subtitle">
            Verified updates from district administrators. Prioritized for urgency, filtered by relevance.
          </p>
        </div>
        <div className="announcements-filter-pills">
          {[
            { id: 'all', label: 'All' },
            { id: 'alert', label: 'Alerts' },
            { id: 'update', label: 'Updates' },
            { id: 'maintenance', label: 'Maintenance' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`announcements-pill ${announcementFilter === item.id ? 'active' : ''}`}
              onClick={() => setAnnouncementFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {criticalAnnouncements.length > 0 ? (
        <section className="announcements-critical-strip">
          {criticalAnnouncements.map((item) => (
            <article key={item.id} className="announcements-critical-card">
              <div className="announcements-critical-head">
                <AlertTriangle size={16} />
                <strong>{item.title}</strong>
              </div>
              <p>{item.message}</p>
              <span>{formatTimeLeft(item.expiresAt)}</span>
            </article>
          ))}
        </section>
      ) : null}

      <section className="announcements-grid">
        {announcementsLoading ? (
          <div className="announcements-empty card">
            <p>Loading announcements...</p>
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((item, index) => {
            const CategoryIcon = CATEGORY_META[item.category]?.icon || BellRing
            return (
              <motion.article
                key={item.id}
                className="announcement-card"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="announcement-card-head">
                  <div className="announcement-type">
                    <CategoryIcon size={16} />
                    <span>{CATEGORY_META[item.category]?.label || 'Update'}</span>
                  </div>
                  <span className={`announcement-priority-tag ${item.priority}`}>{item.priority}</span>
                </div>

                <h3>{item.title}</h3>
                <p>{item.message}</p>

                <div className="announcement-card-meta">
                  <span><MapPin size={14} /> {item.ward || item.district}</span>
                  <span><Clock4 size={14} /> {formatTimeLeft(item.expiresAt)}</span>
                </div>
              </motion.article>
            )
          })
        ) : (
          <div className="announcements-empty card">
            <p>No active announcements in your district.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default Announcements
