import { pool } from '../config/db.js'
import { SUPPORTED_DISTRICTS } from '../utils/districtResolver.js'

export const getAnalytics = async (req, res, next) => {
  try {
    const requestedDistrict = typeof req.query?.district === 'string' ? req.query.district.trim() : null
    const districtFilter = req.user.role === 'district_admin'
      ? req.user.district
      : (requestedDistrict || null)

    const whereClauses = []
    const params = []

    params.push(SUPPORTED_DISTRICTS)
    whereClauses.push(`district = ANY($${params.length}::text[])`)

    if (districtFilter) {
      params.push(districtFilter)
      whereClauses.push(`district = $${params.length}`)
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const reportsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
        COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
        COALESCE(ROUND(AVG(ai_confidence))::int, 0) AS avg_ai_confidence
      FROM reports
      ${where}
      `,
      params,
    )

    const districtsResult = await pool.query(
      `
      WITH district_report_counts AS (
        SELECT
          district,
          COUNT(*)::int AS total_issues,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned
        FROM reports
        ${where}
        GROUP BY district
      )
      SELECT
        d.district,
        COALESCE(a.full_name, 'Unassigned') AS admin,
        d.total_issues,
        d.resolved,
        d.pending,
        d.assigned
      FROM district_report_counts d
      LEFT JOIN LATERAL (
        SELECT full_name
        FROM profiles
        WHERE role = 'district_admin' AND district = d.district
        ORDER BY created_at ASC
        LIMIT 1
      ) a ON TRUE
      ORDER BY d.district
      `,
      params,
    )

    const categoryResult = await pool.query(
      `
      SELECT category AS id, INITCAP(category) AS label, COUNT(*)::int AS count
      FROM reports
      ${where}
      GROUP BY category
      ORDER BY count DESC
      `,
      params,
    )

    const monthlyResult = await pool.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        COUNT(*)::int AS reported,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status <> 'resolved')::int AS pending
      FROM reports
      ${where}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
      `,
      params,
    )

    return res.json({
      stats: reportsResult.rows[0],
      districtPerformance: districtsResult.rows,
      issueCategories: categoryResult.rows,
      monthlyTrend: monthlyResult.rows,
    })
  } catch (error) {
    return next(error)
  }
}
