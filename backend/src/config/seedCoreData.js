import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const districtAdminsSeed = [
  { full_name: 'Rajesh Kumar', email: 'rajesh@roadwatch.gov', password: 'District@123', district: 'Chennai Region', phone: '+91-9000000001' },
  { full_name: 'Sunita Devi', email: 'sunita@roadwatch.gov', password: 'District@123', district: 'Coimbatore Region', phone: '+91-9000000002' },
  { full_name: 'Mohammed Salim', email: 'salim@roadwatch.gov', password: 'District@123', district: 'Madurai Region', phone: '+91-9000000003' },
  { full_name: 'Preethi Rao', email: 'preethi@roadwatch.gov', password: 'District@123', district: 'Trichy Region', phone: '+91-9000000004' },
  { full_name: 'Ganesh Hegde', email: 'ganesh@roadwatch.gov', password: 'District@123', district: 'Salem Region', phone: '+91-9000000005' },
]

const citizensSeed = [
  { full_name: 'Priya Sharma', email: 'priya@example.com', password: 'Citizen@123', district: 'Chennai Region', phone: '+91-9100000001' },
  { full_name: 'Arjun Menon', email: 'arjun@example.com', password: 'Citizen@123', district: 'Trichy Region', phone: '+91-9100000002' },
  { full_name: 'Kavitha R', email: 'kavitha@example.com', password: 'Citizen@123', district: 'Trichy Region', phone: '+91-9100000003' },
  { full_name: 'Rahul Dev', email: 'rahul@example.com', password: 'Citizen@123', district: 'Madurai Region', phone: '+91-9100000004' },
  { full_name: 'Deepa Nair', email: 'deepa@example.com', password: 'Citizen@123', district: 'Madurai Region', phone: '+91-9100000005' },
  { full_name: 'Vikram Singh', email: 'vikram@example.com', password: 'Citizen@123', district: 'Chennai Region', phone: '+91-9100000006' },
  { full_name: 'Anand Rao', email: 'anand@example.com', password: 'Citizen@123', district: 'Coimbatore Region', phone: '+91-9100000007' },
  { full_name: 'Lakshmi P', email: 'lakshmi@example.com', password: 'Citizen@123', district: 'Coimbatore Region', phone: '+91-9100000008' },
]

const reportsSeed = [
  {
    id: 'RW-2026-0001',
    title: 'Major pothole on NH-48 near Hebbal Flyover',
    description: 'Large pothole approximately 2ft wide causing traffic slowdown and vehicle damage risk.',
    category: 'pothole', severity: 'critical', status: 'assigned', district: 'Chennai Region',
    location_lat: 13.0358, location_lng: 77.5970, location_address: 'NH-48, Hebbal, Bangalore',
    reporter_email: 'priya@example.com', assigned_email: 'rajesh@roadwatch.gov', ai_confidence: 94,
  },
  {
    id: 'RW-2026-0002',
    title: 'Road surface crack on MG Road',
    description: 'Longitudinal crack spanning 15 meters on MG Road near Brigade Road junction.',
    category: 'crack', severity: 'high', status: 'verified', district: 'Trichy Region',
    location_lat: 12.9716, location_lng: 77.6070, location_address: 'MG Road, Bangalore',
    reporter_email: 'arjun@example.com', assigned_email: 'preethi@roadwatch.gov', ai_confidence: 89,
  },
  {
    id: 'RW-2026-0003',
    title: 'Damaged manhole cover on Residency Road',
    description: 'Manhole cover broken and partially sunken, creating a hazard for two-wheelers.',
    category: 'hazard', severity: 'critical', status: 'pending', district: 'Trichy Region',
    location_lat: 12.9700, location_lng: 77.6000, location_address: 'Residency Road, Bangalore',
    reporter_email: 'kavitha@example.com', assigned_email: null, ai_confidence: 91,
  },
  {
    id: 'RW-2026-0004',
    title: 'Water logging on Outer Ring Road',
    description: 'Severe water logging due to broken drainage causing traffic congestion during rains.',
    category: 'waterlogging', severity: 'high', status: 'assigned', district: 'Madurai Region',
    location_lat: 12.9352, location_lng: 77.6245, location_address: 'Outer Ring Road, Marathahalli',
    reporter_email: 'rahul@example.com', assigned_email: 'salim@roadwatch.gov', ai_confidence: 87,
  },
  {
    id: 'RW-2026-0005',
    title: 'Speed breaker damage on 100ft Road',
    description: 'Speed breaker has deteriorated, chunks of concrete missing creating sharp edges.',
    category: 'pothole', severity: 'medium', status: 'resolved', district: 'Madurai Region',
    location_lat: 12.9560, location_lng: 77.6410, location_address: '100ft Road, Indiranagar',
    reporter_email: 'deepa@example.com', assigned_email: 'salim@roadwatch.gov', ai_confidence: 96,
    resolution: 'Repaired with fresh concrete. Quality check passed.',
  },
  {
    id: 'RW-2026-0006',
    title: 'Cave-in near Whitefield bus stop',
    description: 'Road cave-in about 3ft deep near bus stop. Area barricaded by locals.',
    category: 'hazard', severity: 'critical', status: 'assigned', district: 'Madurai Region',
    location_lat: 12.9698, location_lng: 77.7500, location_address: 'Whitefield Main Road, Bangalore',
    reporter_email: 'deepa@example.com', assigned_email: 'salim@roadwatch.gov', ai_confidence: 98,
  },
  {
    id: 'RW-2026-0007',
    title: 'Road shoulder erosion on Kanakapura Road',
    description: 'Significant erosion on road shoulder making it dangerous for cyclists and pedestrians.',
    category: 'erosion', severity: 'medium', status: 'verified', district: 'Coimbatore Region',
    location_lat: 12.8890, location_lng: 77.5740, location_address: 'Kanakapura Road, JP Nagar',
    reporter_email: 'anand@example.com', assigned_email: 'sunita@roadwatch.gov', ai_confidence: 82,
  },
  {
    id: 'RW-2026-0008',
    title: 'Multiple potholes on Bellary Road',
    description: 'Series of potholes spanning 200m stretch near Palace Grounds entrance.',
    category: 'pothole', severity: 'high', status: 'resolved', district: 'Chennai Region',
    location_lat: 13.0070, location_lng: 77.5780, location_address: 'Bellary Road, Sadashivanagar',
    reporter_email: 'vikram@example.com', assigned_email: 'rajesh@roadwatch.gov', ai_confidence: 93,
    resolution: 'Full road resurfacing completed for 200m stretch.',
  },
  {
    id: 'RW-2026-0009',
    title: 'Sinkhole forming on Sarjapur Road',
    description: 'Small sinkhole forming near Wipro junction. Underground water pipe suspected.',
    category: 'hazard', severity: 'critical', status: 'pending', district: 'Coimbatore Region',
    location_lat: 12.9100, location_lng: 77.6850, location_address: 'Sarjapur Road, Bangalore',
    reporter_email: 'anand@example.com', assigned_email: null, ai_confidence: 76,
  },
  {
    id: 'RW-2026-0010',
    title: 'Uneven road patch on Electronic City',
    description: 'Previous repair patch has become uneven and creates a bump hazard at high speed.',
    category: 'crack', severity: 'medium', status: 'assigned', district: 'Coimbatore Region',
    location_lat: 12.8440, location_lng: 77.6603, location_address: 'Electronic City Phase 1, Bangalore',
    reporter_email: 'lakshmi@example.com', assigned_email: 'sunita@roadwatch.gov', ai_confidence: 85,
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

      if (!reportedBy) continue

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
          report.district,
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

    await client.query('COMMIT')
    console.log('Seeded core data: 5 district admins, 8 citizens, 10 reports')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
