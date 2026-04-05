import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

export const listDistrictAdmins = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT p.id, p.full_name, p.role, p.phone, p.district, p.status, p.created_at, au.email
      FROM profiles p
      JOIN auth_users au ON au.id = p.id
      WHERE p.role = 'district_admin'
      ORDER BY p.created_at DESC
      `,
    )

    return res.json({ district_admins: result.rows })
  } catch (error) {
    return next(error)
  }
}

export const createDistrictAdmin = async (req, res, next) => {
  const client = await pool.connect()

  try {
    const { full_name, email, temporary_password, district, phone } = req.body

    if (!full_name || !email || !temporary_password || !district || !phone) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    await client.query('BEGIN')

    const duplicate = await client.query('SELECT id FROM auth_users WHERE email = $1', [normalizedEmail])
    if (duplicate.rowCount > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Email already registered' })
    }

    const password_hash = await bcrypt.hash(temporary_password, 12)

    const authInsert = await client.query(
      `
      INSERT INTO auth_users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
      `,
      [normalizedEmail, password_hash],
    )

    const user = authInsert.rows[0]

    await client.query(
      `
      INSERT INTO profiles (id, full_name, role, phone, district, status)
      VALUES ($1, $2, 'district_admin', $3, $4, 'active')
      `,
      [user.id, full_name.trim(), phone.trim(), district.trim()],
    )

    await client.query('COMMIT')

    return res.status(201).json({
      message: 'District admin account created',
      district_admin: {
        id: user.id,
        email: user.email,
        full_name: full_name.trim(),
        role: 'district_admin',
        district: district.trim(),
        phone: phone.trim(),
        status: 'active',
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return next(error)
  } finally {
    client.release()
  }
}
