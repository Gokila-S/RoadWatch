import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { env } from './env.js'

export const seedSuperAdmin = async () => {
  const client = await pool.connect()

  try {
    const email = env.superAdminEmail.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(env.superAdminPassword, 12)

    await client.query('BEGIN')

    const upsertAuth = await client.query(
      `
      INSERT INTO auth_users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
      `,
      [email, passwordHash],
    )

    const superAdminId = upsertAuth.rows[0].id

    await client.query(
      `
      INSERT INTO profiles (id, full_name, role, phone, district, status)
      VALUES ($1, $2, 'super_admin', $3, $4, 'active')
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        district = EXCLUDED.district,
        status = EXCLUDED.status
      `,
      [
        superAdminId,
        env.superAdminName,
        env.superAdminPhone,
        env.superAdminDistrict,
      ],
    )

    await client.query('COMMIT')

    console.log(`Super admin ensured: ${email}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
