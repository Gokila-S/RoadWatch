import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:5174',
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'report-media',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'superadmin@roadwatch.gov',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
  superAdminName: process.env.SUPER_ADMIN_NAME || 'RoadWatch Super Admin',
  superAdminPhone: process.env.SUPER_ADMIN_PHONE || '+91-9000000000',
  superAdminDistrict: process.env.SUPER_ADMIN_DISTRICT || 'ALL',
}

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required')
}
