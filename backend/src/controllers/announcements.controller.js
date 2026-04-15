import { pool } from '../config/db.js'
import { resolveDistrictFromCoordinates, isSupportedDistrict } from '../utils/districtResolver.js'

const CATEGORY_VALUES = ['alert', 'update', 'maintenance']
const PRIORITY_VALUES = ['normal', 'high', 'critical']
const REPORT_CATEGORY_VALUES = ['pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other']

const mapAnnouncementRow = (row) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  category: row.category,
  priority: row.priority,
  district: row.district,
  ward: row.ward,
  location: {
    lat: row.location_lat == null ? null : Number(row.location_lat),
    lng: row.location_lng == null ? null : Number(row.location_lng),
  },
  reportCategories: row.report_categories || [],
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
  isPublished: row.is_published,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const normalizeWard = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw ? raw.toLowerCase() : null
}

const cleanupExpiredAnnouncements = async () => {
  await pool.query('DELETE FROM announcements WHERE expires_at < NOW() - INTERVAL \'1 day\'')
}

const resolveRequestDistrict = ({ district, lat, lng }) => {
  const requestedLat = Number(lat)
  const requestedLng = Number(lng)

  if (Number.isFinite(requestedLat) && Number.isFinite(requestedLng)) {
    return resolveDistrictFromCoordinates(requestedLat, requestedLng)
  }

  if (district && isSupportedDistrict(district)) {
    return district
  }

  return null
}

export const listAnnouncements = async (req, res, next) => {
  try {
    await cleanupExpiredAnnouncements()

    const { category, district, ward, lat, lng, limit = 25 } = req.query
    const filters = [
      'a.is_published = TRUE',
      'a.starts_at <= NOW()',
      'a.expires_at > NOW()',
    ]
    const values = []

    const requestedDistrict = resolveRequestDistrict({ district, lat, lng })

    if (category) {
      if (!CATEGORY_VALUES.includes(category)) {
        return res.status(400).json({ message: 'Invalid announcement category' })
      }

      values.push(category)
      filters.push(`a.category = $${values.length}`)
    }

    if (req.user.role === 'district_admin') {
      values.push(req.user.district)
      filters.push(`a.district = $${values.length}`)
    } else if (req.user.role === 'citizen') {
      values.push(req.user.district)
      filters.push(`a.district = $${values.length}`)
    } else if (requestedDistrict) {
      values.push(requestedDistrict)
      filters.push(`a.district = $${values.length}`)
    }

    const normalizedWard = normalizeWard(ward)
    if (normalizedWard) {
      values.push(normalizedWard)
      filters.push(`(a.ward IS NULL OR lower(a.ward) = $${values.length})`)
    }

    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 25))
    values.push(safeLimit)

    const query = `
      SELECT
        a.*,
        p.full_name AS created_by_name
      FROM announcements a
      JOIN profiles p ON p.id = a.created_by
      WHERE ${filters.join(' AND ')}
      ORDER BY
        CASE a.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        a.starts_at DESC,
        a.created_at DESC
      LIMIT $${values.length}
    `

    const result = await pool.query(query, values)

    return res.json({ announcements: result.rows.map(mapAnnouncementRow) })
  } catch (error) {
    return next(error)
  }
}

export const createAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      message,
      category,
      priority = 'normal',
      district,
      ward,
      location,
      reportCategories = [],
      startsAt,
      expiresAt,
    } = req.body

    const normalizedTitle = typeof title === 'string' ? title.trim() : ''
    const normalizedMessage = typeof message === 'string' ? message.trim() : ''

    if (!normalizedTitle || !normalizedMessage || !category || !expiresAt) {
      return res.status(400).json({ message: 'title, message, category, and expiresAt are required' })
    }

    if (!CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({ message: 'Invalid announcement category' })
    }

    if (!PRIORITY_VALUES.includes(priority)) {
      return res.status(400).json({ message: 'Invalid announcement priority' })
    }

    if (normalizedTitle.length > 120 || normalizedMessage.length > 600) {
      return res.status(400).json({ message: 'Announcement is too long' })
    }

    const parsedStartsAt = startsAt ? new Date(startsAt) : new Date()
    const parsedExpiresAt = new Date(expiresAt)

    if (Number.isNaN(parsedStartsAt.getTime()) || Number.isNaN(parsedExpiresAt.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for startsAt or expiresAt' })
    }

    if (parsedExpiresAt <= parsedStartsAt) {
      return res.status(400).json({ message: 'expiresAt must be after startsAt' })
    }

    const ttlHours = (parsedExpiresAt.getTime() - parsedStartsAt.getTime()) / (1000 * 60 * 60)
    if (ttlHours > 14 * 24) {
      return res.status(400).json({ message: 'Announcements can be scheduled for a maximum of 14 days' })
    }

    const safeReportCategories = Array.isArray(reportCategories)
      ? reportCategories.filter((item) => REPORT_CATEGORY_VALUES.includes(item))
      : []

    const announcementDistrict = req.user.role === 'district_admin' ? req.user.district : district
    if (!announcementDistrict || !isSupportedDistrict(announcementDistrict)) {
      return res.status(400).json({ message: 'A valid district is required' })
    }

    const normalizedWard = normalizeWard(ward)

    const lat = location?.lat == null ? null : Number(location.lat)
    const lng = location?.lng == null ? null : Number(location.lng)

    if ((lat != null && !Number.isFinite(lat)) || (lng != null && !Number.isFinite(lng))) {
      return res.status(400).json({ message: 'Invalid location coordinates' })
    }

    const duplicateCheck = await pool.query(
      `
      SELECT id
      FROM announcements
      WHERE district = $1
        AND category = $2
        AND lower(title) = lower($3)
        AND starts_at <= NOW()
        AND expires_at > NOW()
      LIMIT 1
      `,
      [announcementDistrict, category, normalizedTitle],
    )

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({ message: 'A similar active announcement already exists' })
    }

    const volumeCheck = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM announcements
      WHERE created_by = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [req.user.sub],
    )

    if (volumeCheck.rows[0].total >= 20) {
      return res.status(429).json({ message: 'Daily announcement limit reached. Please avoid spam.' })
    }

    const insert = await pool.query(
      `
      INSERT INTO announcements (
        title,
        message,
        category,
        priority,
        district,
        ward,
        location_lat,
        location_lng,
        report_categories,
        starts_at,
        expires_at,
        is_published,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, TRUE, $12)
      RETURNING *
      `,
      [
        normalizedTitle,
        normalizedMessage,
        category,
        priority,
        announcementDistrict,
        normalizedWard,
        lat,
        lng,
        safeReportCategories,
        parsedStartsAt.toISOString(),
        parsedExpiresAt.toISOString(),
        req.user.sub,
      ],
    )

    const creator = await pool.query('SELECT full_name FROM profiles WHERE id = $1', [req.user.sub])

    return res.status(201).json({
      message: 'Announcement created',
      announcement: mapAnnouncementRow({
        ...insert.rows[0],
        created_by_name: creator.rows[0]?.full_name || 'District Admin',
      }),
    })
  } catch (error) {
    return next(error)
  }
}

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params

    const existing = await pool.query('SELECT id, district, created_by FROM announcements WHERE id = $1', [id])
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    const row = existing.rows[0]

    const canDelete = req.user.role === 'super_admin'
      || (req.user.role === 'district_admin' && row.district === req.user.district)

    if (!canDelete) {
      return res.status(403).json({ message: 'Cannot delete announcement outside your district' })
    }

    await pool.query('DELETE FROM announcements WHERE id = $1', [id])

    return res.json({ message: 'Announcement removed' })
  } catch (error) {
    return next(error)
  }
}

export const getRelatedAnnouncements = async (req, res, next) => {
  try {
    const { category, district, ward, lat, lng, limit = 3 } = req.query

    if (!category || !REPORT_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({ message: 'Valid report category is required' })
    }

    const requestedDistrict = resolveRequestDistrict({ district, lat, lng })
    if (!requestedDistrict) {
      return res.json({ announcements: [] })
    }

    const values = [requestedDistrict, category]
    const filters = [
      'a.is_published = TRUE',
      'a.starts_at <= NOW()',
      'a.expires_at > NOW()',
      'a.district = $1',
      '(cardinality(a.report_categories) = 0 OR $2 = ANY(a.report_categories) OR a.category = \'alert\')',
    ]

    const normalizedWard = normalizeWard(ward)
    if (normalizedWard) {
      values.push(normalizedWard)
      filters.push(`(a.ward IS NULL OR lower(a.ward) = $${values.length})`)
    }

    const safeLimit = Math.max(1, Math.min(5, Number(limit) || 3))
    values.push(safeLimit)

    const result = await pool.query(
      `
      SELECT
        a.*,
        p.full_name AS created_by_name
      FROM announcements a
      JOIN profiles p ON p.id = a.created_by
      WHERE ${filters.join(' AND ')}
      ORDER BY
        CASE a.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        a.starts_at DESC
      LIMIT $${values.length}
      `,
      values,
    )

    return res.json({ announcements: result.rows.map(mapAnnouncementRow) })
  } catch (error) {
    return next(error)
  }
}
