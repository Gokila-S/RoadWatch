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

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'assigned', 'resolved', 'rejected')) DEFAULT 'pending',
  district TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_address TEXT NOT NULL,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ai_confidence INTEGER NOT NULL DEFAULT 85 CHECK (ai_confidence BETWEEN 0 AND 100),
  images TEXT[] NOT NULL DEFAULT '{}',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours'
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_district ON reports(district);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('alert', 'update', 'maintenance')),
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'high', 'critical')) DEFAULT 'normal',
  district TEXT NOT NULL,
  ward TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  report_categories TEXT[] NOT NULL DEFAULT '{}' CHECK (
    report_categories <@ ARRAY['pothole', 'crack', 'hazard', 'waterlogging', 'erosion', 'signage', 'other']::text[]
  ),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_time_window CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_announcements_district ON announcements(district);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_starts_at ON announcements(starts_at);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);

-- Optional static seed block (runtime seeder also ensures super admin).
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
