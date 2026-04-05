-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep auth material separate from profile data
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'district_admin', 'super_admin')),
  phone TEXT NOT NULL,
  district TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);

-- Seed one super admin manually
-- 1) Replace hash with bcrypt hash for your real password.
-- 2) Run this block once.
INSERT INTO auth_users (id, email, password_hash)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'superadmin@roadwatch.gov',
  '$2a$12$R2B6fD0YV8WwU6OxjXk8A.OS2WxfmM5xqJW8h4Q8b9hly2YVeV5r2'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, full_name, role, phone, district, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'RoadWatch Super Admin',
  'super_admin',
  '+91-9000000000',
  'ALL',
  'active'
)
ON CONFLICT (id) DO NOTHING;
