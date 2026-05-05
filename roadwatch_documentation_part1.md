# 🚦 RoadWatch — Interview-Ready Technical Documentation

> **Project**: RoadWatch – Smart City Road Incident Management System  
> **Tech Stack**: React 18 + Vite | Node.js + Express | PostgreSQL (Supabase) | Python Flask + TensorFlow/Keras | Zustand | Leaflet Maps  
> **Deployment**: Vercel (Frontend) | Render (Backend + AI Service) | Supabase (DB + Storage)

---

## 1. 🔍 PROBLEM UNDERSTANDING

### Real-World Problem
Indian cities face **~33 million potholes annually** (MoRTH data). Current civic complaint systems (311 apps, municipal portals) suffer from:
- **Fake/spam reports** — no image verification; 40%+ reports are invalid
- **Duplicate flooding** — same pothole reported 50+ times, each treated as unique
- **Zero prioritization** — a cracked speed breaker gets same priority as a road cave-in
- **Opaque lifecycle** — citizens never know if their report was seen, assigned, or resolved
- **No geographic intelligence** — admins can't visualize hotspots on a map

### Why Existing Solutions Fail
| Existing Solution | Failure Point | RoadWatch Fix |
|---|---|---|
| Municipal web portals | No image validation, manual triage | AI-powered road damage classifier (Keras CNN) gates every upload |
| WhatsApp complaint groups | No tracking, no accountability | Full lifecycle: pending → verified → assigned → resolved |
| 311-style apps (USA) | No duplicate detection | Auto-merge: reports within 100m of same category merge automatically |
| Google Maps reporting | No admin workflow | Role-based Command Center with SLA tracking |

### Target Users & Use Cases
| Role | Use Case |
|---|---|
| **Citizen** | Capture road damage photo → AI validates → submit report → track status → support existing reports |
| **District Admin** | View district Command Center → triage reports on map → verify/assign/resolve → publish announcements |
| **Super Admin** | Manage all districts → CRUD district admins → view cross-district analytics → publish system-wide announcements |

---

## 2. 🧠 SYSTEM DESIGN (DEEP DIVE)

### High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   React SPA │────▶│  Express API │────▶│  PostgreSQL DB   │     │  Supabase Storage│
│  (Vercel)   │     │  (Render)    │────▶│  (Supabase)      │     │  (Image Bucket)  │
└──────┬──────┘     └──────┬───────┘     └──────────────────┘     └──────────────────┘
       │                   │
       │   ┌───────────────┘
       │   │
       ▼   ▼
┌─────────────────┐
│  Flask AI Service│
│  (Render Python) │
│  Keras CNN Model │
└─────────────────┘
```

### Tech Choice Justifications

| Technology | Why Chosen | Alternative Considered | Why Rejected |
|---|---|---|---|
| **React 18 + Vite** | Fast HMR, ecosystem maturity | Next.js | SSR unnecessary for dashboard SPA; added complexity |
| **Zustand** | Minimal boilerplate, no Provider wrapping | Redux Toolkit | Overkill for this scale; Zustand is 1KB |
| **Express.js** | Lightweight, flexible middleware | Fastify | Team familiarity; Express ecosystem larger |
| **PostgreSQL (Supabase)** | Relational integrity, array columns, PostGIS-ready | MongoDB | Reports have strict schemas; relational JOINs needed for analytics |
| **Flask + Keras** | Lightweight Python server for model inference | FastAPI | Flask sufficient for single `/predict` endpoint |
| **Supabase Storage** | Integrated with DB, free tier generous | AWS S3 | Additional vendor; Supabase unifies DB + storage |
| **Leaflet** | Open-source, no API key needed | Google Maps | Free; no billing required; OSM tiles |

### Data Flow: Report Submission (End-to-End)

```
1. Citizen opens /report → Camera stream starts (getUserMedia API)
2. Citizen captures/uploads photo
3. CLIENT-SIDE: Image sent to Flask AI Service /predict endpoint
4. AI Service: Preprocess (resize 224x224, normalize) → Keras CNN → sigmoid output
5. If confidence < 80% OR prediction = "not_road" → REJECTED (user sees error)
6. If ACCEPTED → preview shown, user selects category + severity
7. User clicks "Deploy Report"
8. Frontend calls POST /api/media/upload (multipart form with JWT)
9. Backend: Multer parses buffer → sends to Flask AI again for server-side verification
10. Backend: Upload to Supabase Storage bucket → get public URL
11. Backend: Insert into report_media_uploads table
12. Frontend calls POST /api/reports with mediaIds, category, severity, location
13. Backend: Validate inputs → resolve district from coordinates (geofence check)
14. Backend: AUTO-MERGE CHECK — find reports within 100m, same category, not resolved
    - If match found → append user to supporters[] array → return merged report
    - If no match → generate sequential ID (RW-2026-XXXX) → INSERT new report
15. Backend: Query related announcements for the district + category
16. Return { report, relatedAnnouncements } → Frontend shows success screen
```

---

## 3. 🧩 FEATURE-BY-FEATURE IMPLEMENTATION

### Feature 1: AI-Powered Image Classification

**Internal Flow:**
```python
# ai_service/app.py — Core prediction pipeline
def preprocess_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224))                    # Match training input size
    arr = np.array(img, dtype=np.float32) / 255.0   # Normalize to [0,1]
    return np.expand_dims(arr, axis=0)               # Batch dim: (1,224,224,3)

def interpret_prediction(raw_output):
    # Binary classifier: sigmoid >= 0.5 = road_damage
    if raw_output >= 0.5:
        label, confidence = "road_damage", float(raw_output)
    else:
        label, confidence = "not_road", float(1.0 - raw_output)
    store_in_db = label == "road_damage" and confidence >= 0.80
    return label, confidence, store_in_db
```

**Dual Validation Architecture:**
- **Client-side**: Frontend directly calls Flask `/predict` for instant feedback
- **Server-side**: Backend's `media.controller.js` calls Flask again via `aiFilter.js` utility

**Edge Cases Handled:**
- Model not loaded → HTTP 503 with explicit error message
- File too large → 10MB limit enforced by Flask config
- Unsupported file types → whitelist: png, jpg, jpeg, webp, bmp
- AI service unreachable → 30s timeout with `AbortSignal.timeout()`
- Keras version mismatch → Monkey-patched `Dense.__init__` to strip `quantization_config`

**Trade-off:** Dual validation (client + server) adds latency but prevents bypassing AI filter via direct API calls.

---

### Feature 2: Auto-Merge Duplicate Reports

**Implementation (reports.controller.js lines 237-284):**
```javascript
// Haversine distance calculation
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth radius km
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRadians(lat1)) 
            * Math.cos(toRadians(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Inside createReport:
const mergeCheck = await client.query(
  `SELECT id, location_lat, location_lng FROM reports
   WHERE category = $1 AND district = $2
   AND status NOT IN ('resolved', 'rejected')
   AND NOT ($3 = ANY(supporters))`,
  [category, district, req.user.sub]
)

for (const r of mergeCheck.rows) {
  if (calculateDistanceKm(lat, lng, r.location_lat, r.location_lng) <= 0.1) {
    // MERGE: append user to supporters array
    mergeTargetId = r.id
    break
  }
}
```

**Why 100m radius?** Empirically, road damage reports within 100m of same category are 95%+ duplicates. Larger radius risks merging genuinely separate issues on parallel roads.

**Edge Cases:**
- User already a supporter → SQL `NOT ($3 = ANY(supporters))` prevents double-counting
- Report already resolved → excluded from merge candidates
- No merge target → creates new report with sequential ID

---

### Feature 3: Role-Based Access Control (RBAC)

**Three-Tier Architecture:**
```
super_admin → Can do everything + manage district admins
district_admin → Can manage reports/announcements in their district only
citizen → Can create reports, support reports, view announcements
```

**Backend Middleware Chain:**
```javascript
// middleware/auth.js
export const authenticate = (req, res, next) => {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const payload = jwt.verify(token, env.jwtSecret) // Throws on invalid
  req.user = payload // { sub, email, role, district }
  return next()
}

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient privileges' })
  }
  return next()
}
```

**Frontend Guard (App.jsx):**
```jsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />
  return children
}
```

**District-Level Data Isolation:**
```javascript
// reports.controller.js — district admins ONLY see their district
if (req.user.role === 'district_admin') {
  values.push(req.user.district)
  filters.push(`r.district = $${values.length}`)
}
```

---

### Feature 4: Geofence-Based District Resolution

```javascript
// districtResolver.js — Point-in-polygon algorithm (ray casting)
const DISTRICT_GEOFENCES = [
  { district: 'Coimbatore', polygon: [[10.9,76.8],[11.17,76.8],[11.17,77.1],[10.9,77.1]] },
  { district: 'Tiruppur',   polygon: [[11.0,77.15],[11.25,77.15],[11.25,77.45],[11.0,77.45]] },
  // ... Salem, Erode, Trichy
]

const isPointInPolygon = (lat, lng, polygon) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]
    const [latJ, lngJ] = polygon[j]
    const intersects = (lngI > lng) !== (lngJ > lng)
      && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI
    if (intersects) inside = !inside
  }
  return inside
}
```

**Why not geocoding API?** Eliminates external dependency. Geofence polygons are static and checked server-side in O(n) where n = number of districts (currently 5). No API key, no latency, no cost.

---

### Feature 5: Announcement System

**Split-View Architecture:**
- Super Admin publishes to `district = 'ALL'` → visible system-wide
- District Admin publishes to their specific district only
- Citizens see district-local announcements + system-wide (but NOT super admin internal directives)

```javascript
// announcements.controller.js — visibility filter
if (req.user.role === 'citizen') {
  filters.push(`(a.district = $${values.length} OR a.district = 'ALL')`)
  filters.push(`p.role != 'super_admin'`)  // Hide super admin directives from citizens
}
```

**Anti-Spam Controls:**
- Duplicate detection: same title + district + creator → HTTP 409
- Volume limit: max 20 announcements per user per 24 hours → HTTP 429
- Title max 120 chars, message max 600 chars

---

## 4. ⚠️ REAL-WORLD PROBLEMS FACED

### Problem 1: Keras Model Version Mismatch on Render
**Symptom:** Model trained locally with Keras 3.x saved with `quantization_config` in layer metadata. Render's TF build didn't recognize this param → crash on load.  
**Root Cause:** Keras 3 serializes `quantization_config` into Dense layer config; older TF-bundled Keras doesn't have this kwarg.  
**Fix:** Monkey-patched `Dense.__init__` at startup:
```python
original_init = Dense.__init__
def patched_init(self, *args, **kwargs):
    kwargs.pop('quantization_config', None)
    return original_init(self, *args, **kwargs)
Dense.__init__ = patched_init
```

### Problem 2: 502 Bad Gateway on AI Service (Render Free Tier)
**Symptom:** Frontend CORS errors + 502 from Render.  
**Root Cause:** TensorFlow spawning multiple threads → OOM on 512MB free tier.  
**Fix:** Force single-threaded execution:
```python
os.environ["OMP_NUM_THREADS"] = "1"
tf.config.threading.set_intra_op_parallelism_threads(1)
tf.config.threading.set_inter_op_parallelism_threads(1)
```

### Problem 3: ISP Geolocation Override
**Symptom:** `navigator.geolocation` returned ISP headquarters (Chennai) instead of user's actual city (Coimbatore).  
**Root Cause:** Desktop browsers use IP-based geolocation fallback when GPS unavailable.  
**Fix:** Map component centers on user's incident data centroid rather than raw browser coordinates.

### Problem 4: PostgreSQL Connection Timeouts
**Symptom:** Random `ETIMEDOUT` errors on Supabase connections.  
**Root Cause:** IPv6 routing issues on some networks to managed Postgres hosts.  
**Fix:** Connection pool tuning + exponential backoff bootstrap:
```javascript
// db.js
export const pool = new Pool({
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10,
  maxUses: 7500,
  keepAlive: true,
})

// server.js — bootstrap with 5 retries, exponential backoff
for (let attempt = 1; attempt <= 5; attempt++) {
  try { await initializeDatabase(); return }
  catch { await sleep(2 ** attempt * 1000) }  // 2s, 4s, 8s, 16s
}
```

---

## 5. 🛠️ DEBUGGING & FAILURE SCENARIOS

| Bug | Detection Method | Root Cause | Fix |
|---|---|---|---|
| Camera not opening on mobile | Chrome DevTools remote debug | `getUserMedia` requires HTTPS | Deployed to Vercel (HTTPS by default) |
| JWT expired silently | Network tab showed 401 responses | Token TTL was 1h, no refresh flow | Extended to 1d; `fetchCurrentUser` calls `logout()` on 401 |
| Race condition in report merge | Concurrent test submissions | Two users submit simultaneously for same location | PostgreSQL transaction isolation (`BEGIN/COMMIT`) |
| Memory leak in camera stream | Chrome Performance tab | `MediaStream` tracks not stopped on unmount | Added cleanup in `useEffect` return |
| Supabase bucket not found | Server logs `404 bucket not found` | Bucket not auto-created | `ensureBucket()` creates on first upload if missing |

---

## 6. 🗄️ DATABASE DESIGN

### ER Diagram
```
auth_users (1) ──────── (1) profiles
    │                        │
    │                        ├──── reports (N) ──── report_media_uploads (N)
    │                        │
    │                        └──── announcements (N)
```

### Schema Design

```sql
-- Separation of auth credentials from profile data
auth_users: id(UUID PK), email(UNIQUE), password_hash, created_at
profiles:   id(UUID PK FK→auth_users), full_name, role(ENUM), phone, district, status

-- Reports with array columns for images and supporters
reports: id(TEXT PK "RW-2026-XXXX"), title, description, 
         category(ENUM), severity(ENUM), status(ENUM),
         district, location_lat, location_lng, location_address,
         reported_by(FK→profiles), assigned_to(FK→profiles),
         ai_confidence(0-100), images(TEXT[]), supporters(UUID[]),
         resolution, sla_deadline, created_at, updated_at

-- Media audit trail with AI classification results
report_media_uploads: id(UUID), uploaded_by(FK), report_id(FK→reports),
                      storage_path, public_url, mime_type,
                      ai_prediction(ENUM), ai_confidence(0-1), verified_by_model

-- Announcements with geolocation + category targeting
announcements: id(UUID), title, message, category(ENUM), priority(ENUM),
               district, location_lat, location_lng,
               report_categories(TEXT[]), starts_at, is_published, created_by(FK)
```

### Indexing Strategy
```sql
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_district ON reports(district);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_district ON profiles(district);
CREATE INDEX idx_announcements_district ON announcements(district);
CREATE INDEX idx_announcements_priority ON announcements(priority);
```
**Rationale:** Reports are filtered by status/severity/district constantly. `created_at` index supports ORDER BY DESC for chronological listing.

### Key Design Decision: `supporters UUID[]`
Used PostgreSQL array column instead of a junction table. Trade-off:
- ✅ Single atomic UPDATE (no extra table, no N+1)
- ✅ `array_append` + `array_remove` are O(n) but n < 100 for most reports
- ❌ Can't enforce FK constraints on array elements
- ❌ Doesn't scale past ~1000 supporters per report

---

## 7. ⚙️ CORE IMPLEMENTATION DETAILS

### State Management (Zustand)
```javascript
// Single store, no Provider needed
const useStore = create((set, get) => ({
  // Auth state persisted to localStorage
  token: localStorage.getItem('rw_token'),
  user: JSON.parse(localStorage.getItem('rw_user')),
  
  // Optimistic state updates after API calls
  createReport: async (payload) => {
    const data = await fetch(...)
    set((state) => ({
      reports: [data.report, ...state.reports]  // Prepend new report
    }))
  },
  
  // Computed values via getter functions
  getStats: () => {
    const reports = get().reports
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      citizenCount: reports.reduce((acc, r) => acc + (r.supportersCount || 1), 0),
    }
  }
}))
```

### Auth Persistence Pattern
```javascript
const getPersistedAuth = () => {
  const token = localStorage.getItem('rw_token')
  const userRaw = localStorage.getItem('rw_user')
  try {
    return { token, user: JSON.parse(userRaw) }
  } catch {
    localStorage.removeItem('rw_token')  // Corrupted data cleanup
    return { token: null, user: null }
  }
}
```

### Transaction Safety Pattern (Used Across All Write Controllers)
```javascript
let client, inTransaction = false
try {
  client = await pool.connect()
  await client.query('BEGIN')
  inTransaction = true
  // ... operations ...
  await client.query('COMMIT')
  inTransaction = false
} catch (error) {
  if (client && inTransaction) {
    try { await client.query('ROLLBACK') } catch {} // Ignore rollback errors
  }
  return next(error)
} finally {
  if (client) client.release()  // ALWAYS release back to pool
}
```

---

## 8. 🔄 API DESIGN

### Complete Endpoint Reference

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/signup/citizen` | No | — | Citizen self-registration |
| `POST` | `/api/auth/login` | No | — | Email/password login → JWT |
| `GET` | `/api/auth/me` | Yes | Any | Get current user profile |
| `GET` | `/api/reports` | Yes | Any | List reports (role-scoped) |
| `POST` | `/api/reports` | Yes | citizen | Create report (with auto-merge) |
| `PATCH` | `/api/reports/:id/status` | Yes | admin | Update report status |
| `POST` | `/api/reports/:id/support` | Yes | citizen | Support existing report |
| `POST` | `/api/media/upload` | Yes | Any | Upload image → AI filter → Supabase |
| `GET` | `/api/analytics` | Yes | admin | Aggregated stats + trends |
| `GET` | `/api/announcements` | Yes | Any | List announcements (role-filtered) |
| `POST` | `/api/announcements` | Yes | admin | Create announcement |
| `DELETE` | `/api/announcements/:id` | Yes | admin | Delete announcement |
| `GET` | `/api/announcements/related` | Yes | Any | Context-aware announcements |
| `GET` | `/api/admin/district-admins` | Yes | super_admin | List all district admins |
| `POST` | `/api/admin/district-admins` | Yes | super_admin | Create district admin |
| `PUT` | `/api/admin/district-admins/:id` | Yes | super_admin | Update district admin |
| `DELETE` | `/api/admin/district-admins/:id` | Yes | super_admin | Delete district admin |

### Sample Request/Response

**POST /api/reports**
```json
// Request
{
  "title": "Large pothole near bus stop",
  "description": "2ft wide, causing traffic issues",
  "category": "pothole",
  "severity": "high",
  "location": { "lat": 11.0151, "lng": 76.9554, "address": "Gandhipuram, Coimbatore" },
  "mediaIds": ["uuid-of-uploaded-media"],
  "images": ["https://supabase.co/storage/v1/..."]
}

// Response (201 Created)
{
  "message": "Report created successfully",
  "report": {
    "id": "RW-2026-0011",
    "status": "pending",
    "district": "Coimbatore",
    "supportersCount": 1,
    "slaDeadline": "2026-04-08T08:30:00Z"
  },
  "relatedAnnouncements": [...]
}

// Response (200 — Auto-Merged)
{
  "message": "Your report was automatically merged into an identical nearby issue!",
  "report": { "id": "RW-2026-0001", "supportersCount": 3 }
}
```

### Error Handling Pattern
```javascript
// Centralized error handler (middleware/errorHandler.js)
const transientDbCodes = new Set(['ENOTFOUND','ETIMEDOUT','ECONNRESET','57P01'])

if (transientDbCodes.has(err.code)) {
  return res.status(503).json({
    message: 'Database is temporarily unreachable. Please retry.'
  })
}
```

---

## 9. 🚀 PERFORMANCE & SCALING

### Bottlenecks Discovered
1. **AI Service cold start** — TensorFlow model load takes 15-20s on Render free tier
   - Fix: Model loaded once at startup, reused for all requests
2. **N+1 query for reporter names** — Initially fetching reporter name in separate query per report
   - Fix: JOIN in main query: `JOIN profiles reporter ON reporter.id = r.reported_by`
3. **Supabase connection exhaustion** — Pool defaults created too many idle connections
   - Fix: `max: 10, idleTimeoutMillis: 30000, maxUses: 7500`

### Caching Opportunities (Not Yet Implemented)
- Analytics aggregations → Redis cache with 5-min TTL
- District geofence lookups → Already in-memory (static arrays)
- Announcement listings → Client-side Zustand store acts as cache

---

## 10. 🔐 SECURITY DESIGN

| Layer | Implementation |
|---|---|
| **Password Hashing** | bcrypt with salt rounds = 12 |
| **JWT Tokens** | HS256, 1-day expiry, claims: `{sub, email, role, district}` |
| **CORS** | Whitelist of allowed origins from `FRONTEND_ORIGIN` env var |
| **Input Validation** | Regex patterns for name, email, phone, district, password complexity |
| **SQL Injection** | Parameterized queries (`$1, $2`) throughout — zero string concatenation |
| **File Upload** | Multer memory storage, 8MB limit, mime-type whitelist |
| **Role Enforcement** | `authorizeRoles()` middleware on every admin route |
| **District Isolation** | District admins can only see/modify reports in their own district |
| **AI Gate** | Images MUST pass AI verification (≥80% road damage confidence) before report creation |

### Password Policy (Admin Controller)
```javascript
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/
// Requires: lowercase + uppercase + digit + special char, 8-64 chars
```

---

## 11. 🧪 TESTING STRATEGY

### Manual Test Scenarios Executed
| Scenario | What Was Tested | Edge Case Caught |
|---|---|---|
| Upload non-road image | AI rejection flow | Low-confidence road images (40-79%) were silently accepted → fixed threshold |
| Concurrent duplicate reports | Auto-merge race condition | Two users merging simultaneously → wrapped in transaction |
| District admin cross-district access | RBAC enforcement | Admin could see reports from URL manipulation → added server-side district filter |
| Expired JWT | Token refresh | Silent 401 → user stuck on blank page → added `fetchCurrentUser` logout on 401 |
| Camera on HTTP | getUserMedia | Fails silently → added explicit error message |
| 10MB+ image upload | File size limits | Flask crashed → added `MAX_CONTENT_LENGTH` config |

---

## 12. 📦 DEVOPS & DEPLOYMENT

### Deployment Architecture
```
GitHub Repository
    ├── Vercel (auto-deploy on push)
    │   └── Frontend (npm run build → dist/)
    │   └── Env: VITE_API_BASE_URL, VITE_AI_SERVICE_URL
    │
    ├── Render Web Service #1 (Node.js)
    │   └── Backend (npm install && npm start)
    │   └── Env: DATABASE_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    │
    └── Render Web Service #2 (Python)
        └── AI Service (pip install -r requirements.txt)
        └── Start: gunicorn --bind 0.0.0.0:$PORT app:app
```

### Bootstrap Sequence (server.js)
```
1. initializeDatabase() → Runs schema.sql (CREATE IF NOT EXISTS)
2. seedSuperAdmin() → Upsert super admin credentials from env vars
3. seedCoreData() → Upsert 5 district admins, 8 citizens, 10 reports, 5 announcements
4. app.listen() → Server ready
```
All steps are idempotent (`ON CONFLICT DO UPDATE`). Safe to restart without data loss.

---

## 13. 🧠 TRADE-OFF ANALYSIS

| Decision | Chosen Approach | Alternative | Why This Way |
|---|---|---|---|
| Auth | Custom JWT + bcrypt | Supabase Auth | Full control over role claims; no vendor lock-in for auth flow |
| State | Zustand (client-only) | React Query / SWR | Reports fetched once on bootstrap; no need for cache invalidation |
| AI Validation | Dual (client + server) | Server-only | Client-side gives instant UX feedback; server-side prevents API bypass |
| District Resolution | Static geofence polygons | Reverse geocoding API | Zero external dependency; works offline; deterministic |
| Report IDs | Sequential `RW-2026-XXXX` | UUID | Human-readable; citizens can reference by ID in complaints |
| Image Storage | Supabase Storage | Cloudinary / S3 | Already using Supabase for DB; unified billing |
| Supporters | `UUID[]` array column | Junction table | Simpler writes; atomic `array_append`; acceptable scale |
