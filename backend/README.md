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

## 2) Supabase setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run `sql/schema.sql`.
4. Update the seeded super admin hash with a real bcrypt hash.

Connection string format for `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

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
- `POST /api/admin/district-admins`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ full_name, email, temporary_password, district, phone }`

## 4) RBAC

`authenticate` middleware validates JWT.
`authorizeRoles('super_admin')` restricts district-admin creation to super admins only.

## 5) Data model

Auth and profile data are separated:
- `auth_users(id, email, password_hash, created_at)`
- `profiles(id, full_name, role, phone, district, status, created_at)`

`profiles.id` references `auth_users.id`.
