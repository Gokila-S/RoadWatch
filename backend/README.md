# RoadWatch Backend (Node + Express + Supabase PostgreSQL)

This backend implements role-based authentication with these roles:
- `citizen`
- `district_admin`
- `super_admin`

## 1) Install and run

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The server now auto-initializes:
1. Runs SQL schema from `sql/schema.sql`
2. Ensures super admin user from `.env`
3. Seeds core data (5 district admins, 8 citizens, 10 reports)

## 2) Supabase setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run `sql/schema.sql`.
4. Configure super admin credentials in `.env`.

Super admin login is auto-seeded at backend startup from `.env`:

```env
SUPER_ADMIN_EMAIL=superadmin@roadwatch.gov
SUPER_ADMIN_PASSWORD=SuperAdmin@123
SUPER_ADMIN_NAME=RoadWatch Super Admin
SUPER_ADMIN_PHONE=+91-9000000000
SUPER_ADMIN_DISTRICT=ALL
```

Connection string format for `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=report-media
```

Supabase Storage setup:
1. In Supabase, open Storage and create a bucket (default name used here: `report-media`).
2. Make the bucket public, or keep private and later switch to signed URL flow.
3. Copy `Project URL` and `service_role` key into `backend/.env`.

## 3) API endpoints

### Public
- `POST /api/auth/signup/citizen`
  - Body: `{ full_name, email, password, phone, district }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns token + user + route (`/dashboard`, `/admin/district`, `/admin/super`)

### Protected
- `GET /api/auth/me`
  - Header: `Authorization: Bearer <token>`

### Super admin only
- `GET /api/admin/district-admins`
  - Header: `Authorization: Bearer <token>`
- `POST /api/admin/district-admins`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ full_name, email, temporary_password, district, phone }`

### Reports (dynamic)
- `GET /api/reports`
  - Header: `Authorization: Bearer <token>`
  - Optional query: `status`, `severity`, `district`
  - Scope behavior:
    - citizen: only own reports
    - district_admin: only reports in own district
    - super_admin: all reports
- `POST /api/reports`
  - Header: `Authorization: Bearer <token>`
  - Citizen only
  - Body: `{ title, description, category, severity, location, images?, aiConfidence?, slaHours? }`
  - `district` is derived on backend from `location.lat/lng` for auto-routing
- `PATCH /api/reports/:id/status`
  - Header: `Authorization: Bearer <token>`
  - district_admin/super_admin only
  - Body: `{ status, resolution? }`

### Analytics (dynamic)
- `GET /api/analytics`
  - Header: `Authorization: Bearer <token>`
  - district_admin/super_admin only
  - Returns:
    - `stats` (overall status/severity/confidence)
    - `districtPerformance`
    - `issueCategories`
    - `monthlyTrend`

### Media upload
- `POST /api/media/upload`
  - Header: `Authorization: Bearer <token>`
  - `multipart/form-data` with field name `file`
  - Max size: 8MB
  - Returns: `{ media: { path, url } }`

## 4) RBAC

`authenticate` middleware validates JWT.
`authorizeRoles('super_admin')` restricts district-admin creation to super admins only.

## 5) Data model

Auth and profile data are separated:
- `auth_users(id, email, password_hash, created_at)`
- `profiles(id, full_name, role, phone, district, status, created_at)`
- `reports(id, title, description, category, severity, status, district, location_*, reported_by, assigned_to, ai_confidence, images, resolution, created_at, updated_at, sla_deadline)`

`profiles.id` references `auth_users.id`.

## 6) Seeded users

### Super admin
- Email: `superadmin@roadwatch.gov`
- Password: `SuperAdmin@123`

### 5 district admins (password for all)
- Password: `District@123`
- Emails:
  - `rajesh@roadwatch.gov`
  - `sunita@roadwatch.gov`
  - `salim@roadwatch.gov`
  - `preethi@roadwatch.gov`
  - `ganesh@roadwatch.gov`

### Citizens (password for all)
- Password: `Citizen@123`
- Example emails: `priya@example.com`, `arjun@example.com`, `rahul@example.com`, `anand@example.com`
