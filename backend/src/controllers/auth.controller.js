import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db.js'
import { env } from '../config/env.js'

const roleLandingPath = {
  citizen: '/dashboard',
  district_admin: '/admin/district',
  super_admin: '/admin/super',
}

const profileSelect = `
  SELECT p.id, p.full_name, p.role, p.phone, p.district, p.status, p.created_at, au.email
  FROM profiles p
  JOIN auth_users au ON au.id = p.id
  WHERE p.id = $1
`

const issueToken = (user) => jwt.sign(
  {
    sub: user.id,
    email: user.email,
    role: user.role,
    district: user.district,
  },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn },
)

export const signupCitizen = async (req, res, next) => {
  const client = await pool.connect()

  try {
    const { full_name, email, password, phone, district } = req.body

    if (!full_name || !email || !password || !phone || !district) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    await client.query('BEGIN')

    const duplicate = await client.query('SELECT id FROM auth_users WHERE email = $1', [normalizedEmail])
    if (duplicate.rowCount > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Email already registered' })
    }

    const password_hash = await bcrypt.hash(password, 12)

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
      VALUES ($1, $2, 'citizen', $3, $4, 'active')
      `,
      [user.id, full_name.trim(), phone.trim(), district.trim()],
    )

    await client.query('COMMIT')

    return res.status(201).json({
      message: 'Citizen account created successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: full_name.trim(),
        role: 'citizen',
        phone: phone.trim(),
        district: district.trim(),
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

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const userQuery = await pool.query(
      `
      SELECT au.id, au.email, au.password_hash, p.full_name, p.role, p.phone, p.district, p.status, p.created_at
      FROM auth_users au
      JOIN profiles p ON p.id = au.id
      WHERE au.email = $1
      `,
      [normalizedEmail],
    )

    if (userQuery.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = userQuery.rows[0]

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = issueToken(user)

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        district: user.district,
        status: user.status,
        created_at: user.created_at,
      },
      route: roleLandingPath[user.role] || '/dashboard',
    })
  } catch (error) {
    return next(error)
  }
}

export const me = async (req, res, next) => {
  try {
    const result = await pool.query(profileSelect, [req.user.sub])

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    return res.json({ user: result.rows[0] })
  } catch (error) {
    return next(error)
  }
}
