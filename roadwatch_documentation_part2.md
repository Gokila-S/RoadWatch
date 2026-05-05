# 🚦 RoadWatch — Interview Documentation (Part 2)

## 14. ❓ INTERVIEW QUESTIONS (WITH ANSWERS)

### Q1: "How did you implement the AI image classification feature?"

**Answer:**
> We built a Python Flask microservice that loads a Keras binary classification model (CNN trained on road damage datasets). The model takes 224×224 RGB images, outputs a sigmoid score between 0-1. Scores ≥0.5 classify as `road_damage`, otherwise `not_road`. We enforce a **confidence threshold of 80%** — only images with ≥80% confidence for `road_damage` are accepted.
>
> The architecture uses **dual validation**: the React frontend calls the Flask `/predict` endpoint directly for instant UX feedback (user sees rejection within 2 seconds). Then when submitting the report, the Node.js backend independently calls the same Flask service via `aiFilter.js` — this prevents bypass via direct API calls.
>
> A key challenge was deploying on Render's free tier (512MB RAM). TensorFlow spawned multiple threads causing OOM kills. We fixed this by forcing single-threaded execution with `OMP_NUM_THREADS=1` and `tf.config.threading.set_intra_op_parallelism_threads(1)`. Another issue was Keras version mismatch — the model was saved with `quantization_config` metadata that the deployment Keras version didn't support. We monkey-patched `Dense.__init__` to strip this parameter.

---

### Q2: "How does the auto-merge duplicate detection work?"

**Answer:**
> When a citizen submits a report, before creating a new record, the backend runs a merge check. It queries all open reports (status not `resolved` or `rejected`) with the same category in the same district. For each candidate, we calculate the Haversine distance between the new report's coordinates and the existing report's coordinates.
>
> If any report is within **100 meters**, we don't create a new report. Instead, we `array_append` the current user's UUID to the existing report's `supporters[]` column and return the merged report. This effectively turns the duplicate into a "vote" — the supporter count increases, which signals urgency to admins.
>
> The 100m threshold was chosen empirically. Larger radius risked merging reports on parallel roads. The entire operation runs inside a PostgreSQL transaction to prevent race conditions from concurrent submissions.
>
> The frontend also pre-checks for similar reports before submission using `checkSimilarReports()`, giving the user an option to "Support Existing Issue" instead of filing a new one.

---

### Q3: "What challenges did you face with deployment?"

**Answer:**
> Three major challenges:
> 1. **AI Service OOM** — TensorFlow on Render's 512MB free tier kept crashing. We had to force single-threaded CPU inference and use `tensorflow-cpu` instead of the full GPU package.
> 2. **CORS Mismatch** — Frontend on Vercel (HTTPS) calling backend on Render. The `FRONTEND_ORIGIN` env var had to exactly match the Vercel URL including protocol. We also support comma-separated origins for staging/production.
> 3. **Database Connection Instability** — Supabase PostgreSQL connections would timeout due to IPv6 routing issues. We implemented exponential backoff (5 retries: 2s, 4s, 8s, 16s) on bootstrap and configured connection pooling with `keepAlive: true` and `connectionTimeoutMillis: 30000`.

---

### Q4: "What would you improve if you had more time?"

**Answer:**
> 1. **Real-time notifications** — WebSocket or Supabase Realtime to push status changes to citizens instantly instead of polling
> 2. **Multi-image upload** — Currently only one image per report; should support gallery of damage angles
> 3. **PostGIS** — Replace in-memory geofence polygons with PostGIS `ST_Contains` for spatial queries at scale
> 4. **Redis caching** — Analytics aggregations are computed fresh on every request; a 5-minute TTL cache would reduce DB load
> 5. **Rate limiting** — Add express-rate-limit middleware globally, not just on announcements
> 6. **Refresh tokens** — Current JWT has 1-day expiry with no refresh mechanism; implement refresh token rotation
> 7. **Image compression** — Resize images client-side before upload to reduce storage costs and upload time
> 8. **Audit logging** — Track who changed what status and when for accountability

---

### Q5: "What happens if the AI service goes down?"

**Answer:**
> Currently, if the AI service is down, report submission is **completely blocked**. The `aiFilter.js` utility has a 30-second timeout and throws a structured error with status 503 and code `AI_UNAVAILABLE`. The frontend shows a clear error message: "AI service is unreachable. Ensure the model server is running."
>
> This is a deliberate design choice — we prioritize data quality over availability. Without AI verification, spam/fake reports would flood the system.
>
> If I were improving this, I'd implement a **graceful degradation mode**: queue uploads in a dead-letter store (Redis or DB table) and process them when AI recovers. Admin could also manually verify queued images. Another option is a **lightweight fallback model** — a much smaller MobileNet that runs directly in Node.js via ONNX Runtime, eliminating the Flask dependency entirely.

---

### Q6: "Explain your database design decisions."

**Answer:**
> Key decisions:
> 1. **Separated `auth_users` from `profiles`** — Auth credentials (email, password_hash) are isolated from profile data. This follows the principle of least privilege and makes it easier to swap auth providers later.
> 2. **`supporters UUID[]` instead of junction table** — For this scale (<1000 supporters per report), array columns are simpler. PostgreSQL's `array_append` is atomic and avoids a separate table. The trade-off is losing FK constraints on array elements.
> 3. **Text PK for reports (`RW-2026-XXXX`)** — Human-readable IDs that citizens can reference in phone calls to municipal offices. Generated sequentially via `MAX(SUBSTRING(id FROM 9)::int)`.
> 4. **`report_media_uploads` as audit trail** — Every uploaded image is tracked with its AI classification result, storage path, and the user who uploaded it. This creates an audit trail and prevents reuse of rejected images.
> 5. **CHECK constraints on ENUMs** — Category, severity, status are enforced at the database level, not just application level. This prevents data corruption from direct SQL or API bugs.

---

### Q7: "How did you handle authentication and session management?"

**Answer:**
> We use **stateless JWT authentication**. On login, the server issues a JWT containing `{sub: userId, email, role, district}` signed with HS256 using a secret from environment variables. Token expiry is 1 day.
>
> The frontend stores the token in `localStorage` (not cookies — this is a SPA with no SSR). On every API call, the token is sent in the `Authorization: Bearer <token>` header. The `authenticate` middleware verifies the signature and attaches `req.user` to the request.
>
> On page refresh, the store reads from localStorage via `getPersistedAuth()`. It also immediately calls `GET /api/auth/me` to validate the token is still valid. If the server returns 401, `logout()` is called to clear stale tokens.
>
> **Security consideration**: localStorage is vulnerable to XSS. In a production hardening pass, I'd move to HttpOnly cookies with CSRF tokens, or implement token rotation with short-lived access tokens + refresh tokens.

---

## 15. 🔥 "WHAT IF" SCENARIOS

### Scenario 1: Traffic Spike (10x Normal Load)
**Impact:** Express server handles requests sequentially per-connection. PostgreSQL pool (max: 10) would exhaust.  
**Mitigation Steps:**
1. Increase pool `max` to 25-50
2. Add Redis cache for read-heavy endpoints (analytics, announcements)
3. Deploy behind a load balancer with 2-3 backend instances
4. AI service: add request queuing (Bull/BullMQ) instead of synchronous inference
5. Frontend: implement request deduplication in Zustand store

### Scenario 2: Database Crash / Supabase Outage
**Impact:** All API calls fail. Frontend shows stale cached data from Zustand.  
**Mitigation Steps:**
1. `errorHandler.js` already catches transient DB codes (ENOTFOUND, ETIMEDOUT) → returns 503
2. Frontend should implement retry with exponential backoff on 503
3. For true HA: add read replica; reports table has `created_at` index for point-in-time recovery
4. Zustand store retains last-fetched data — UI remains functional for reading

### Scenario 3: AI Service Returns Wrong Predictions
**Impact:** Fake images accepted, or valid road damage rejected.  
**Mitigation Steps:**
1. `report_media_uploads` table stores every prediction → enables audit
2. Admin can manually review flagged images in the Command Center
3. Implement feedback loop: admin marks prediction as correct/incorrect → retrain model
4. Add confidence band logging: track predictions between 70-85% for manual review

### Scenario 4: JWT Secret Compromised
**Impact:** Attacker can forge tokens for any role including super_admin.  
**Mitigation Steps:**
1. Immediately rotate `JWT_SECRET` in environment variables
2. All existing tokens become invalid (users must re-login)
3. Audit `report_media_uploads` and `reports` for suspicious entries
4. Long-term: implement token blacklisting via Redis, or switch to asymmetric keys (RS256)

---

## 16. 🧠 AI-DRIVEN CRITICAL INSIGHTS

### Weaknesses in Current System

| Area | Weakness | Risk Level |
|---|---|---|
| **Auth** | JWT in localStorage vulnerable to XSS | 🔴 High |
| **No rate limiting** | API endpoints (except announcements) have no rate limits | 🔴 High |
| **Single AI service** | No redundancy; single point of failure for all uploads | 🟡 Medium |
| **No pagination** | `listReports` returns ALL reports; will break at 10K+ | 🟡 Medium |
| **No input sanitization** | Titles/descriptions not sanitized for stored XSS | 🔴 High |
| **Hardcoded geofences** | Adding new districts requires code change + redeploy | 🟡 Medium |
| **No file deduplication** | Same image uploaded twice creates two storage objects | 🟢 Low |
| **No audit logging** | Status changes not tracked (who changed, when) | 🟡 Medium |

### Missing Best Practices
1. **No request logging middleware** — Add Morgan or Pino for structured access logs
2. **No health check for DB** — `/health` endpoint should verify DB connectivity
3. **No graceful shutdown** — `SIGTERM` handler should drain connections before exit
4. **No input length limits on all fields** — Only announcements have length checks
5. **No HTTPS enforcement** — Backend relies on Render's proxy; should add Helmet.js
6. **No API versioning** — All routes are `/api/...` with no version prefix

### Advanced Improvements Roadmap
1. **PostGIS Integration** — Replace JavaScript geofencing with `ST_Contains(district_boundary, ST_MakePoint(lng, lat))` for accurate polygon matching
2. **WebSocket Notifications** — Supabase Realtime or Socket.io for live status updates
3. **ML Pipeline** — Retrain model with user feedback; implement A/B testing for model versions
4. **SLA Alerting** — Cron job to flag reports past `sla_deadline` that aren't resolved
5. **PWA Support** — Service worker for offline report drafting; sync when back online
6. **Multi-language** — i18n support for Tamil, Hindi, English (key for civic platforms)
7. **Analytics Export** — CSV/PDF export of district performance metrics
8. **Citizen Notifications** — Email/SMS when report status changes (via Supabase Edge Functions or SendGrid)

---

## 📊 Quick Reference Card (For Interview Day)

```
Project: RoadWatch — Smart City Road Incident Management
Stack:   React 18 + Vite | Express.js | PostgreSQL (Supabase) | Flask + Keras

3 Roles: Citizen → District Admin → Super Admin
5 Districts: Coimbatore, Tiruppur, Erode, Salem, Trichy

Key Features:
  ✅ AI Image Classification (Keras CNN, 80% threshold)
  ✅ Auto-Merge Duplicates (100m radius, Haversine)
  ✅ Geofence District Resolution (ray-casting algorithm)
  ✅ Role-Based Access Control (JWT + middleware)
  ✅ SLA Tracking (72-hour default deadline)
  ✅ Community Support (supporters[] array)
  ✅ Related Announcements (context-aware)

Architecture: 3-service (Frontend + Backend + AI Microservice)
DB: 5 tables, 12 indexes, UUID PKs, array columns
Auth: Custom JWT, bcrypt(12), localStorage persistence
Deploy: Vercel + Render + Supabase

Top Challenges Solved:
  1. TF OOM on free tier → single-threaded inference
  2. Keras version mismatch → monkey-patched Dense.__init__
  3. DB connection timeouts → exponential backoff bootstrap
  4. Duplicate reports → auto-merge within transactions
```
