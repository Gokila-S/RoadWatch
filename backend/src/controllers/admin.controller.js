import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{2,59}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/
const DISTRICT_PATTERN = /^[A-Za-z][A-Za-z\s-]{2,49}$/
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/

const validateAdminPayload = (payload, { partial = false } = {}) => {
  const errors = []

  const requiredFields = ['full_name', 'email', 'district', 'phone']
  if (!partial) {
    requiredFields.push('temporary_password')
  }

  requiredFields.forEach((field) => {
    if (!String(payload[field] || '').trim()) {
      errors.push(`${field} is required`)
    }
  })

  if (payload.full_name && !NAME_PATTERN.test(payload.full_name.trim())) {
    errors.push('Invalid full_name format')
  }

  if (payload.email && !EMAIL_PATTERN.test(payload.email.trim().toLowerCase())) {
    errors.push('Invalid email format')
  }

  if (!partial && payload.temporary_password && !PASSWORD_PATTERN.test(payload.temporary_password)) {
    errors.push('temporary_password does not meet security constraints')
  }

  if (partial && payload.temporary_password && !PASSWORD_PATTERN.test(payload.temporary_password)) {
    errors.push('temporary_password does not meet security constraints')
  }

  if (payload.district && !DISTRICT_PATTERN.test(payload.district.trim())) {
    errors.push('Invalid district format')
  }

  if (payload.phone && !PHONE_PATTERN.test(payload.phone.trim())) {
    errors.push('Invalid phone format')
  }

  return errors
}

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
  let client
  let inTransaction = false

  try {
    client = await pool.connect()

    const { full_name, email, temporary_password, district, phone } = req.body

    const validationErrors = validateAdminPayload(req.body)
    if (validationErrors.length) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors })
    }

    const normalizedEmail = email.trim().toLowerCase()

    await client.query('BEGIN')
    inTransaction = true

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
    inTransaction = false

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

export const updateDistrictAdmin = async (req, res, next) => {
  let client
  let inTransaction = false

  try {
    client = await pool.connect()

    const { id } = req.params
    const { full_name, email, temporary_password, district, phone, status } = req.body

    const validationErrors = validateAdminPayload(req.body, { partial: true })
    if (validationErrors.length) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors })
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    await client.query('BEGIN')
    inTransaction = true

    const profileResult = await client.query(
      `SELECT id FROM profiles WHERE id = $1 AND role = 'district_admin'`,
      [id],
    )

    if (profileResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'District admin not found' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const duplicateEmail = await client.query(
      'SELECT id FROM auth_users WHERE email = $1 AND id <> $2',
      [normalizedEmail, id],
    )

    if (duplicateEmail.rowCount > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Email already registered' })
    }

    await client.query(
      `
      UPDATE auth_users
      SET email = $1
      WHERE id = $2
      `,
      [normalizedEmail, id],
    )

    await client.query(
      `
      UPDATE profiles
      SET full_name = $1,
          phone = $2,
          district = $3,
          status = $4
      WHERE id = $5
      `,
      [full_name.trim(), phone.trim(), district.trim(), status || 'active', id],
    )

    if (temporary_password && temporary_password.trim()) {
      const password_hash = await bcrypt.hash(temporary_password, 12)
      await client.query(
        `
        UPDATE auth_users
        SET password_hash = $1
        WHERE id = $2
        `,
        [password_hash, id],
      )
    }

    await client.query('COMMIT')
    inTransaction = false

    return res.json({ message: 'District admin updated successfully' })
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

export const deleteDistrictAdmin = async (req, res, next) => {
  let client
  let inTransaction = false

  try {
    client = await pool.connect()

    const { id } = req.params

    await client.query('BEGIN')
    inTransaction = true

    const existing = await client.query(
      `SELECT id FROM profiles WHERE id = $1 AND role = 'district_admin'`,
      [id],
    )

    if (existing.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'District admin not found' })
    }

    await client.query('DELETE FROM auth_users WHERE id = $1', [id])

    await client.query('COMMIT')
    inTransaction = false

    return res.json({ message: 'District admin deleted successfully' })
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
