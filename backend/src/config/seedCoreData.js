import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { resolveDistrictFromCoordinates, SUPPORTED_DISTRICTS } from '../utils/districtResolver.js'

const districtAdminsSeed = [
  { full_name: 'Rajesh Kumar', email: 'rajesh@roadwatch.gov', password: 'District@123', district: 'Coimbatore', phone: '+91-9000000001' },
  { full_name: 'Sunita Devi', email: 'sunita@roadwatch.gov', password: 'District@123', district: 'Erode', phone: '+91-9000000002' },
  { full_name: 'Mohammed Salim', email: 'salim@roadwatch.gov', password: 'District@123', district: 'Tiruppur', phone: '+91-9000000003' },
  { full_name: 'Preethi Rao', email: 'preethi@roadwatch.gov', password: 'District@123', district: 'Salem', phone: '+91-9000000004' },
  { full_name: 'Ganesh Hegde', email: 'ganesh@roadwatch.gov', password: 'District@123', district: 'Trichy', phone: '+91-9000000005' },
]

const citizensSeed = [
  { full_name: 'Priya Sharma', email: 'priya@example.com', password: 'Citizen@123', district: 'Coimbatore', phone: '+91-9100000001' },
  { full_name: 'Arjun Menon', email: 'arjun@example.com', password: 'Citizen@123', district: 'Trichy', phone: '+91-9100000002' },
  { full_name: 'Kavitha R', email: 'kavitha@example.com', password: 'Citizen@123', district: 'Tiruppur', phone: '+91-9100000003' },
  { full_name: 'Rahul Dev', email: 'rahul@example.com', password: 'Citizen@123', district: 'Erode', phone: '+91-9100000004' },
  { full_name: 'Deepa Nair', email: 'deepa@example.com', password: 'Citizen@123', district: 'Tiruppur', phone: '+91-9100000005' },
  { full_name: 'Vikram Singh', email: 'vikram@example.com', password: 'Citizen@123', district: 'Salem', phone: '+91-9100000006' },
  { full_name: 'Anand Rao', email: 'anand@example.com', password: 'Citizen@123', district: 'Erode', phone: '+91-9100000007' },
  { full_name: 'Lakshmi P', email: 'lakshmi@example.com', password: 'Citizen@123', district: 'Salem', phone: '+91-9100000008' },
]

const reportsSeed = [
  {
    id: 'RW-2026-0001',
    title: 'Major pothole near Gandhipuram Bus Stand',
    description: 'Deep pothole creating wheel wobble risk during peak traffic hours.',
    category: 'pothole', severity: 'critical', status: 'assigned', district: 'Coimbatore',
    location_lat: 11.0151, location_lng: 76.9554, location_address: 'Gandhipuram, Coimbatore',
    reporter_email: 'priya@example.com', assigned_email: 'rajesh@roadwatch.gov', ai_confidence: 94,
  },
  {
    id: 'RW-2026-0002',
    title: 'Road surface crack on Cantonment stretch',
    description: 'Long crack along lane edge near traffic merge area.',
    category: 'crack', severity: 'high', status: 'verified', district: 'Trichy',
    location_lat: 10.8062, location_lng: 78.6855, location_address: 'Cantonment, Trichy',
    reporter_email: 'arjun@example.com', assigned_email: 'ganesh@roadwatch.gov', ai_confidence: 89,
  },
  {
    id: 'RW-2026-0003',
    title: 'Damaged manhole cover near Old Bus Stand',
    description: 'Manhole cover cracked and tilted, unsafe for two-wheelers.',
    category: 'hazard', severity: 'critical', status: 'pending', district: 'Tiruppur',
    location_lat: 11.1088, location_lng: 77.3412, location_address: 'Old Bus Stand Road, Tiruppur',
    reporter_email: 'kavitha@example.com', assigned_email: null, ai_confidence: 91,
  },
  {
    id: 'RW-2026-0004',
    title: 'Water logging near Perundurai Road junction',
    description: 'Water accumulation blocks one lane after rain, causing long queues.',
    category: 'waterlogging', severity: 'high', status: 'assigned', district: 'Erode',
    location_lat: 11.3365, location_lng: 77.7272, location_address: 'Perundurai Road, Erode',
    reporter_email: 'rahul@example.com', assigned_email: 'sunita@roadwatch.gov', ai_confidence: 87,
  },
  {
    id: 'RW-2026-0005',
    title: 'Speed breaker damage near Avinashi Road',
    description: 'Broken speed breaker edges causing loss of control at night.',
    category: 'pothole', severity: 'medium', status: 'resolved', district: 'Tiruppur',
    location_lat: 11.1342, location_lng: 77.3248, location_address: 'Avinashi Road, Tiruppur',
    reporter_email: 'deepa@example.com', assigned_email: 'salim@roadwatch.gov', ai_confidence: 96,
    resolution: 'Repaired with fresh concrete. Quality check passed.',
  },
  {
    id: 'RW-2026-0006',
    title: 'Road cave-in near Five Roads signal',
    description: 'Road cave-in around 2ft deep; temporary barricade placed by locals.',
    category: 'hazard', severity: 'critical', status: 'assigned', district: 'Salem',
    location_lat: 11.6731, location_lng: 78.1401, location_address: 'Five Roads Junction, Salem',
    reporter_email: 'vikram@example.com', assigned_email: 'preethi@roadwatch.gov', ai_confidence: 98,
  },
  {
    id: 'RW-2026-0007',
    title: 'Road shoulder erosion near Ukkadam bypass',
    description: 'Shoulder erosion increasing risk for two-wheelers and buses.',
    category: 'erosion', severity: 'medium', status: 'verified', district: 'Coimbatore',
    location_lat: 11.0015, location_lng: 76.9441, location_address: 'Ukkadam Bypass, Coimbatore',
    reporter_email: 'priya@example.com', assigned_email: 'rajesh@roadwatch.gov', ai_confidence: 82,
  },
  {
    id: 'RW-2026-0008',
    title: 'Multiple potholes near Srirangam approach road',
    description: 'Potholes across 150m stretch causing severe traffic slowdown.',
    category: 'pothole', severity: 'high', status: 'resolved', district: 'Trichy',
    location_lat: 10.8307, location_lng: 78.6958, location_address: 'Srirangam Approach, Trichy',
    reporter_email: 'arjun@example.com', assigned_email: 'ganesh@roadwatch.gov', ai_confidence: 93,
    resolution: 'Full road resurfacing completed for 200m stretch.',
  },
  {
    id: 'RW-2026-0009',
    title: 'Sinkhole forming near Bhavani Road',
    description: 'Sinkhole formation near roadside drain; urgent barricading required.',
    category: 'hazard', severity: 'critical', status: 'pending', district: 'Erode',
    location_lat: 11.3564, location_lng: 77.7139, location_address: 'Bhavani Road, Erode',
    reporter_email: 'anand@example.com', assigned_email: null, ai_confidence: 76,
  },
  {
    id: 'RW-2026-0010',
    title: 'Uneven repair patch near Hasthampatti',
    description: 'Repair patch has become uneven and causes sharp shocks at speed.',
    category: 'crack', severity: 'medium', status: 'assigned', district: 'Salem',
    location_lat: 11.6747, location_lng: 78.1223, location_address: 'Hasthampatti, Salem',
    reporter_email: 'lakshmi@example.com', assigned_email: 'preethi@roadwatch.gov', ai_confidence: 85,
  },
]

const ensureUser = async (client, user, role) => {
  const passwordHash = await bcrypt.hash(user.password, 12)
  const normalizedEmail = user.email.trim().toLowerCase()

  const authUpsert = await client.query(
    `
    INSERT INTO auth_users (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id
    `,
    [normalizedEmail, passwordHash],
  )

  const id = authUpsert.rows[0].id

  await client.query(
    `
    INSERT INTO profiles (id, full_name, role, phone, district, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      phone = EXCLUDED.phone,
      district = EXCLUDED.district,
      status = EXCLUDED.status
    `,
    [id, user.full_name, role, user.phone, user.district],
  )

  return { id, email: normalizedEmail }
}

export const seedCoreData = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const adminMap = new Map()
    const citizenMap = new Map()

    for (const admin of districtAdminsSeed) {
      const data = await ensureUser(client, admin, 'district_admin')
      adminMap.set(data.email, data.id)
    }

    for (const citizen of citizensSeed) {
      const data = await ensureUser(client, citizen, 'citizen')
      citizenMap.set(data.email, data.id)
    }

    for (const report of reportsSeed) {
      const reportedBy = citizenMap.get(report.reporter_email)
      const assignedTo = report.assigned_email ? adminMap.get(report.assigned_email) : null
      const resolvedDistrict = resolveDistrictFromCoordinates(report.location_lat, report.location_lng)

      if (!reportedBy || !resolvedDistrict) continue

      await client.query(
        `
        INSERT INTO reports (
          id, title, description, category, severity, status, district,
          location_lat, location_lng, location_address,
          reported_by, assigned_to, ai_confidence, images, resolution,
          created_at, updated_at, sla_deadline
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14::text[], $15,
          NOW() - ((RANDOM() * 120)::int || ' day')::interval,
          NOW() - ((RANDOM() * 30)::int || ' day')::interval,
          NOW() + ((RANDOM() * 96)::int || ' hour')::interval
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          status = EXCLUDED.status,
          district = EXCLUDED.district,
          location_lat = EXCLUDED.location_lat,
          location_lng = EXCLUDED.location_lng,
          location_address = EXCLUDED.location_address,
          reported_by = EXCLUDED.reported_by,
          assigned_to = EXCLUDED.assigned_to,
          ai_confidence = EXCLUDED.ai_confidence,
          resolution = EXCLUDED.resolution,
          updated_at = NOW()
        `,
        [
          report.id,
          report.title,
          report.description,
          report.category,
          report.severity,
          report.status,
          resolvedDistrict,
          report.location_lat,
          report.location_lng,
          report.location_address,
          reportedBy,
          assignedTo,
          report.ai_confidence,
          [],
          report.resolution || null,
        ],
      )
    }

    // Normalize all existing reports so district routing always follows coordinates.
    const existingReports = await client.query('SELECT id, location_lat, location_lng FROM reports')
    for (const reportRow of existingReports.rows) {
      const normalizedDistrict = resolveDistrictFromCoordinates(
        Number(reportRow.location_lat),
        Number(reportRow.location_lng),
      )

      if (!normalizedDistrict) continue

      await client.query(
        'UPDATE reports SET district = $1 WHERE id = $2',
        [normalizedDistrict, reportRow.id],
      )
    }

    await client.query(
      'DELETE FROM reports WHERE district <> ALL($1::text[])',
      [SUPPORTED_DISTRICTS],
    )

    await client.query('COMMIT')
    console.log('Seeded core data: 5 district admins, 8 citizens, 10 reports')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
