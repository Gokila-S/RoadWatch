import { pool } from '../config/db.js'
import { resolveDistrictFromCoordinates, SUPPORTED_DISTRICTS } from '../utils/districtResolver.js'

const mapReportRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  severity: row.severity,
  status: row.status,
  district: row.district,
  location: {
    lat: Number(row.location_lat),
    lng: Number(row.location_lng),
    address: row.location_address,
  },
  reportedBy: row.reported_by,
  reporterName: row.reporter_name,
  assignedTo: row.assigned_to,
  aiConfidence: row.ai_confidence,
  images: row.images || [],
  resolution: row.resolution,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  slaDeadline: row.sla_deadline,
})

const mapAnnouncementRow = (row) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  category: row.category,
  priority: row.priority,
  district: row.district,
  ward: row.ward,
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
})

const toRadians = (value) => (value * Math.PI) / 180

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

export const listReports = async (req, res, next) => {
  try {
    const { status, severity, district, scope, lat, lng, radiusKm } = req.query
    const filters = []
    const values = []
    const requestedLat = Number(lat)
    const requestedLng = Number(lng)
    const requestedRadiusKm = Number(radiusKm || 100)

    const hasMapCoordinates = Number.isFinite(requestedLat) && Number.isFinite(requestedLng)
    const wantsCitizenMapScope = req.user.role === 'citizen' && scope === 'map' && hasMapCoordinates

    if (status) {
      values.push(status)
      filters.push(`r.status = $${values.length}`)
    }

    if (severity) {
      values.push(severity)
      filters.push(`r.severity = $${values.length}`)
    }

    if (district) {
      values.push(district)
      filters.push(`r.district = $${values.length}`)
    }

    if (req.user.role === 'citizen' && !wantsCitizenMapScope) {
      values.push(req.user.sub)
      filters.push(`r.reported_by = $${values.length}`)
    }

    if (req.user.role === 'district_admin') {
      values.push(req.user.district)
      filters.push(`r.district = $${values.length}`)
    }

    values.push(SUPPORTED_DISTRICTS)
    filters.push(`r.district = ANY($${values.length}::text[])`)

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

    const query = `
      SELECT
        r.id, r.title, r.description, r.category, r.severity, r.status, r.district,
        r.location_lat, r.location_lng, r.location_address,
        r.reported_by, r.assigned_to, r.ai_confidence, r.images, r.resolution,
        r.created_at, r.updated_at, r.sla_deadline,
        reporter.full_name AS reporter_name
      FROM reports r
      JOIN profiles reporter ON reporter.id = r.reported_by
      ${whereClause}
      ORDER BY r.created_at DESC
    `

    const result = await pool.query(query, values)
    const mappedReports = result.rows.map(mapReportRow)

    const districtScopedReports = req.user.role === 'district_admin'
      ? mappedReports.filter((report) => {
        const resolvedDistrict = resolveDistrictFromCoordinates(
          Number(report.location?.lat),
          Number(report.location?.lng),
        )
        return resolvedDistrict === req.user.district
      })
      : mappedReports

    if (wantsCitizenMapScope) {
      const boundedRadius = Number.isFinite(requestedRadiusKm) ? Math.max(1, Math.min(300, requestedRadiusKm)) : 100
      const filteredReports = districtScopedReports.filter((report) => {
        if (report.reportedBy === req.user.sub) {
          return true
        }

        const latValue = Number(report.location?.lat)
        const lngValue = Number(report.location?.lng)
        if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
          return false
        }

        return calculateDistanceKm(requestedLat, requestedLng, latValue, lngValue) <= boundedRadius
      })

      return res.json({ reports: filteredReports })
    }

    return res.json({ reports: districtScopedReports })
  } catch (error) {
    return next(error)
  }
}

export const createReport = async (req, res, next) => {
  let client
  let inTransaction = false

  try {
    client = await pool.connect()

    const {
      title,
      description,
      category,
      severity,
      location,
      images = [],
      aiConfidence = 85,
      slaHours = 72,
    } = req.body

    if (!description || !category || !severity || !location?.address) {
      return res.status(400).json({ message: 'Missing required report fields' })
    }

    const lat = Number(location.lat)
    const lng = Number(location.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Valid location coordinates are required' })
    }

    const rawAddress = typeof location.address === 'string' ? location.address.trim() : ''
    const locationAnchor = rawAddress ? rawAddress.split(',')[0].trim() : 'reported location'
    const normalizedTitle = typeof title === 'string' && title.trim()
      ? title.trim()
      : `${category.charAt(0).toUpperCase() + category.slice(1)} near ${locationAnchor}`

    const district = resolveDistrictFromCoordinates(lat, lng)
    if (!district) {
      return res.status(400).json({ message: 'Unable to resolve district from location' })
    }

    if (req.user.role !== 'citizen') {
      return res.status(403).json({ message: 'Only citizens can create reports' })
    }

    await client.query('BEGIN')
    inTransaction = true

    const countResult = await client.query("SELECT COUNT(*)::int AS total FROM reports WHERE id LIKE 'RW-%'")
    const serial = String(countResult.rows[0].total + 1).padStart(4, '0')
    const reportId = `RW-2026-${serial}`

    const insert = await client.query(
      `
      INSERT INTO reports (
        id, title, description, category, severity, status, district,
        location_lat, location_lng, location_address,
        reported_by, ai_confidence, images, sla_deadline
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12, NOW() + ($13 || ' hour')::interval)
      RETURNING *
      `,
      [
        reportId,
        normalizedTitle,
        description.trim(),
        category,
        severity,
        district.trim(),
        lat,
        lng,
        location.address,
        req.user.sub,
        Number(aiConfidence),
        images,
        String(slaHours),
      ],
    )

    const report = insert.rows[0]

    const reporter = await client.query('SELECT full_name FROM profiles WHERE id = $1', [req.user.sub])

    await client.query('COMMIT')
    inTransaction = false

    const relatedAnnouncementsResult = await pool.query(
      `
      SELECT id, title, message, category, priority, district, ward, starts_at, expires_at
      FROM announcements
      WHERE is_published = TRUE
        AND starts_at <= NOW()
        AND expires_at > NOW()
        AND district = $1
        AND (
          cardinality(report_categories) = 0
          OR $2 = ANY(report_categories)
          OR category = 'alert'
        )
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        starts_at DESC
      LIMIT 3
      `,
      [district, category],
    )

    return res.status(201).json({
      message: 'Report created successfully',
      report: mapReportRow({ ...report, reporter_name: reporter.rows[0]?.full_name || 'Citizen' }),
      relatedAnnouncements: relatedAnnouncementsResult.rows.map(mapAnnouncementRow),
    })
  } catch (error) {
    if (client && inTransaction) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Ignore rollback errors caused by broken connections.
      }
    }
    return next(error)
  } finally {
    if (client) {
      client.release()
    }
  }
}

export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, resolution = null } = req.body

    if (!status) {
      return res.status(400).json({ message: 'status is required' })
    }

    const allowedStatuses = ['pending', 'verified', 'assigned', 'resolved', 'rejected']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' })
    }

    const reportResult = await pool.query('SELECT id, district FROM reports WHERE id = $1', [id])
    if (reportResult.rowCount === 0) {
      return res.status(404).json({ message: 'Report not found' })
    }

    const report = reportResult.rows[0]

    if (req.user.role === 'district_admin' && req.user.district !== report.district) {
      return res.status(403).json({ message: 'Cannot update report outside your district' })
    }

    if (!['district_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can update report status' })
    }

    const update = await pool.query(
      `
      UPDATE reports
      SET status = $1,
          resolution = CASE WHEN $1 = 'resolved' THEN $2 ELSE resolution END,
          assigned_to = CASE
            WHEN $1 IN ('assigned', 'verified', 'resolved') THEN $3::uuid
            ELSE assigned_to
          END,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [status, resolution, req.user.sub, id],
    )

    const reporter = await pool.query(
      `
      SELECT p.full_name
      FROM reports r
      JOIN profiles p ON p.id = r.reported_by
      WHERE r.id = $1
      `,
      [id],
    )

    return res.json({
      message: 'Report status updated',
      report: mapReportRow({ ...update.rows[0], reporter_name: reporter.rows[0]?.full_name || 'Citizen' }),
    })
  } catch (error) {
    return next(error)
  }
}
