# 🚦 RoadWatch — ER Diagram & Class Diagram

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    AUTH_USERS {
        UUID id PK
        TEXT email UK "NOT NULL"
        TEXT password_hash "NOT NULL"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    PROFILES {
        UUID id PK,FK "→ auth_users.id ON DELETE CASCADE"
        TEXT full_name "NOT NULL"
        TEXT role "CHECK: citizen | district_admin | super_admin"
        TEXT phone "NOT NULL"
        TEXT district "NOT NULL"
        TEXT status "DEFAULT 'active'"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    REPORTS {
        TEXT id PK "Format: RW-2026-XXXX"
        TEXT title "NOT NULL"
        TEXT description "NOT NULL"
        TEXT category "CHECK: pothole | crack | hazard | waterlogging | erosion | signage | other"
        TEXT severity "CHECK: low | medium | high | critical"
        TEXT status "CHECK: pending | verified | assigned | resolved | rejected"
        TEXT district "NOT NULL"
        DOUBLE location_lat "NOT NULL"
        DOUBLE location_lng "NOT NULL"
        TEXT location_address "NOT NULL"
        UUID reported_by FK "→ profiles.id ON DELETE CASCADE"
        UUID assigned_to FK "→ profiles.id ON DELETE SET NULL"
        INT ai_confidence "CHECK: 0-100"
        TEXT_ARRAY images "DEFAULT '{}'"
        UUID_ARRAY supporters "DEFAULT '{}'"
        TEXT resolution "NULLABLE"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
        TIMESTAMPTZ sla_deadline "DEFAULT NOW() + 72h"
    }

    REPORT_MEDIA_UPLOADS {
        UUID id PK "DEFAULT gen_random_uuid()"
        UUID uploaded_by FK "→ profiles.id ON DELETE CASCADE"
        TEXT report_id FK "→ reports.id ON DELETE SET NULL"
        TEXT storage_path UK "NOT NULL"
        TEXT public_url UK "NOT NULL"
        TEXT mime_type "NOT NULL"
        TEXT original_name "NOT NULL"
        TEXT ai_prediction "CHECK: road_damage | not_road"
        DOUBLE ai_confidence "CHECK: 0-1"
        BOOLEAN verified_by_model "DEFAULT TRUE"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    ANNOUNCEMENTS {
        UUID id PK "DEFAULT gen_random_uuid()"
        TEXT title "NOT NULL"
        TEXT message "NOT NULL"
        TEXT category "CHECK: alert | update | maintenance"
        TEXT priority "CHECK: normal | high | critical"
        TEXT district "NOT NULL"
        DOUBLE location_lat "NULLABLE"
        DOUBLE location_lng "NULLABLE"
        TEXT_ARRAY report_categories "DEFAULT '{}'"
        TIMESTAMPTZ starts_at "DEFAULT NOW()"
        BOOLEAN is_published "DEFAULT TRUE"
        UUID created_by FK "→ profiles.id ON DELETE CASCADE"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    AUTH_USERS ||--|| PROFILES : "1:1 (id)"
    PROFILES ||--o{ REPORTS : "reported_by (1:N)"
    PROFILES ||--o{ REPORTS : "assigned_to (1:N)"
    PROFILES ||--o{ REPORT_MEDIA_UPLOADS : "uploaded_by (1:N)"
    PROFILES ||--o{ ANNOUNCEMENTS : "created_by (1:N)"
    REPORTS ||--o{ REPORT_MEDIA_UPLOADS : "report_id (1:N)"
```

### Relationship Summary

| Relationship | Cardinality | Description |
|---|---|---|
| `auth_users` ↔ `profiles` | **1 : 1** | Every auth record has exactly one profile (shared PK) |
| `profiles` → `reports` (reported_by) | **1 : N** | A citizen can file many reports |
| `profiles` → `reports` (assigned_to) | **1 : N** | An admin can be assigned many reports |
| `profiles` → `report_media_uploads` | **1 : N** | A user can upload many images |
| `reports` → `report_media_uploads` | **1 : N** | A report can have many media attachments |
| `profiles` → `announcements` | **1 : N** | An admin can create many announcements |
| `reports.supporters[]` → `profiles` | **M : N** (via array) | Many citizens can support many reports |

> [!NOTE]
> The `supporters UUID[]` column implements a **logical M:N** relationship without a junction table. This is a deliberate trade-off — simpler writes via `array_append` at the cost of losing FK constraints on individual supporter entries.

---

## 2. Class Diagram (Backend Architecture)

```mermaid
classDiagram
    direction TB

    class ExpressServer {
        +express app
        +bootstrapDatabase()
        +startServer()
        -cors()
        -express.json()
        -errorHandler()
    }

    class AuthController {
        +signupCitizen(req, res, next)
        +login(req, res, next)
        +me(req, res, next)
        -issueToken(user) JWT
        -roleLandingPath Map
    }

    class ReportsController {
        +listReports(req, res, next)
        +createReport(req, res, next)
        +updateReportStatus(req, res, next)
        +supportReport(req, res, next)
        -mapReportRow(row) Report
        -calculateDistanceKm(lat1, lon1, lat2, lon2) number
    }

    class MediaController {
        +uploadReportMedia(req, res, next)
        -ensureBucket(supabaseAdmin)
        -sanitizeFileName(name) string
        -allowedMimeTypes Set
    }

    class AdminController {
        +listDistrictAdmins(req, res, next)
        +createDistrictAdmin(req, res, next)
        +updateDistrictAdmin(req, res, next)
        +deleteDistrictAdmin(req, res, next)
        -validateAdminPayload(payload, options) string[]
    }

    class AnalyticsController {
        +getAnalytics(req, res, next)
    }

    class AnnouncementsController {
        +listAnnouncements(req, res, next)
        +createAnnouncement(req, res, next)
        +deleteAnnouncement(req, res, next)
        +getRelatedAnnouncements(req, res, next)
        -mapAnnouncementRow(row) Announcement
        -resolveRequestDistrict(params) string
    }

    class AuthMiddleware {
        +authenticate(req, res, next)
        +authorizeRoles(...roles) middleware
    }

    class ErrorHandler {
        +errorHandler(err, req, res, next)
        -transientDbCodes Set
    }

    class DatabasePool {
        +pool pg.Pool
        +connectionString string
        +max 10
        +ssl rejectUnauthorized false
    }

    class SupabaseAdmin {
        +getSupabaseAdmin() Client
        -cachedClient Client
        -isConfiguredValue(value) boolean
    }

    class AiFilterUtil {
        +classifyImage(imageBuffer, originalName) AiFilterResult
        -guessMime(filename) string
    }

    class DistrictResolver {
        +resolveDistrictFromCoordinates(lat, lng) string
        +isSupportedDistrict(district) boolean
        +SUPPORTED_DISTRICTS string[]
        +DISTRICT_BOUNDARIES Geofence[]
        -isPointInPolygon(lat, lng, polygon) boolean
        -DISTRICT_GEOFENCES Geofence[]
    }

    class InitDb {
        +initializeDatabase()
    }

    class SeedSuperAdmin {
        +seedSuperAdmin()
    }

    class SeedCoreData {
        +seedCoreData()
        -ensureUser(client, user, role) UserRecord
    }

    ExpressServer --> AuthController : "/api/auth"
    ExpressServer --> ReportsController : "/api/reports"
    ExpressServer --> MediaController : "/api/media"
    ExpressServer --> AdminController : "/api/admin"
    ExpressServer --> AnalyticsController : "/api/analytics"
    ExpressServer --> AnnouncementsController : "/api/announcements"
    ExpressServer --> AuthMiddleware : "middleware"
    ExpressServer --> ErrorHandler : "middleware"
    ExpressServer --> InitDb : "bootstrap"
    ExpressServer --> SeedSuperAdmin : "bootstrap"
    ExpressServer --> SeedCoreData : "bootstrap"

    AuthController --> DatabasePool : "queries"
    ReportsController --> DatabasePool : "queries"
    ReportsController --> DistrictResolver : "geofence"
    MediaController --> DatabasePool : "queries"
    MediaController --> SupabaseAdmin : "storage"
    MediaController --> AiFilterUtil : "classify"
    AdminController --> DatabasePool : "queries"
    AnalyticsController --> DatabasePool : "queries"
    AnalyticsController --> DistrictResolver : "district list"
    AnnouncementsController --> DatabasePool : "queries"
    AnnouncementsController --> DistrictResolver : "resolve"
    InitDb --> DatabasePool : "schema"
    SeedSuperAdmin --> DatabasePool : "seed"
    SeedCoreData --> DatabasePool : "seed"
```

---

## 3. Class Diagram (Frontend Architecture)

```mermaid
classDiagram
    direction TB

    class App {
        +ProtectedRoute component
        +bootstrap() void
        -fetchCurrentUser()
        -fetchReports()
        -fetchAnnouncements()
        -fetchAnalytics()
        -fetchDistrictAdmins()
    }

    class ZustandStore {
        +theme string
        +user UserObject
        +token string
        +isAuthenticated boolean
        +userRole string
        +reports Report[]
        +announcements Announcement[]
        +districtAdmins Admin[]
        +districts District[]
        +analyticsSummary object
        +login(email, password) Route
        +logout() void
        +signupCitizen(payload) void
        +fetchCurrentUser() User
        +createReport(payload) ReportResult
        +uploadReportMedia(file) MediaResult
        +supportReport(id) Report
        +updateReportStatus(id, status) Report
        +createAnnouncement(payload) Announcement
        +deleteAnnouncement(id) void
        +fetchReports(query) Report[]
        +fetchAnnouncements(query) Announcement[]
        +fetchAnalytics(query) AnalyticsData
        +fetchDistrictAdmins() Admin[]
        +checkSimilarReports(params) Report[]
        +getFilteredReports() Report[]
        +getStats() StatsObject
        +toggleTheme() void
    }

    class LandingPage {
        +Hero section
        +Features section
        +CTA section
    }

    class LoginPage {
        +mode string "login | signup"
        +handleLogin(e) void
        +handleCitizenSignup(e) void
    }

    class ReportPage {
        +step number "1=Camera | 2=Details | 3=Success"
        +image string
        +aiData object
        +location LatLng
        +formData FormState
        +similarReports Report[]
        +relatedAnnouncements Announcement[]
        +processSelectedImage(file) boolean
        +captureFromLiveCamera() void
        +handleSubmit() void
        +handleSupportReport(id) void
        -analyzeRoadLikelihood(file) AiResult
        -reverseGeocode(lat, lng) string
        -fetchCurrentLocation() void
        -startCameraStream() void
        -stopCameraStream() void
    }

    class DashboardPage {
        +stats StatsObject
        +recentReports Report[]
    }

    class AdminPage {
        +reports Report[]
        +selectedReport Report
        +incidentFeed Report[]
        +mapView Leaflet
        +handleVerify(id) void
        +handleResolve(id, resolution) void
    }

    class SuperAdminPage {
        +districtAdmins Admin[]
        +districts District[]
        +createDistrictAdmin(payload) void
        +updateDistrictAdmin(id, payload) void
        +deleteDistrictAdmin(id) void
    }

    class AnalyticsPage {
        +summary AnalyticsStats
        +monthlyTrend ChartData[]
        +issueCategories CategoryData[]
        +districtPerformance DistrictData[]
    }

    class AnnouncementsPage {
        +announcements Announcement[]
        +filter string
    }

    class AdminAnnouncementsPage {
        +announcements Announcement[]
        +createAnnouncement(payload) void
        +deleteAnnouncement(id) void
    }

    class HeaderComponent {
        +navigation links
        +userProfile display
        +themeToggle button
    }

    class MapViewComponent {
        +center LatLng
        +zoom number
        +reports Report[]
        +interactive boolean
    }

    class ReportTrackerPage {
        +reportId string
        +report Report
        +statusTimeline Step[]
    }

    App --> ZustandStore : "state"
    App --> LandingPage : "/"
    App --> LoginPage : "/login"
    App --> ReportPage : "/report"
    App --> DashboardPage : "/dashboard"
    App --> AdminPage : "/admin/district"
    App --> SuperAdminPage : "/admin/super"
    App --> AnalyticsPage : "/analytics"
    App --> AnnouncementsPage : "/announcements"
    App --> AdminAnnouncementsPage : "/admin/announcements"
    App --> ReportTrackerPage : "/report/:id"
    App --> HeaderComponent : "global"

    LoginPage --> ZustandStore : "login/signup"
    ReportPage --> ZustandStore : "createReport"
    ReportPage --> MapViewComponent : "location preview"
    AdminPage --> ZustandStore : "updateStatus"
    AdminPage --> MapViewComponent : "incident map"
    SuperAdminPage --> ZustandStore : "CRUD admins"
    AnalyticsPage --> ZustandStore : "fetchAnalytics"
    AnnouncementsPage --> ZustandStore : "fetchAnnouncements"
    DashboardPage --> ZustandStore : "getStats"
```

---

## 4. AI Microservice Class Diagram

```mermaid
classDiagram
    direction LR

    class FlaskApp {
        +app Flask
        +UPLOAD_FOLDER string
        +IMAGE_SIZE tuple "(224, 224)"
        +SIGMOID_THRESH float "0.5"
        +CONFIDENCE_THRESH float "0.80"
        +MAX_CONTENT_LENGTH int "10MB"
        +index() JSON
        +predict() JSON
        +health() JSON
    }

    class KerasModel {
        +model keras.Model
        +load_keras_model() boolean
        -MODEL_PATH string
    }

    class ImagePreprocessor {
        +preprocess_image(path) ndarray
        -Image.open().convert("RGB")
        -resize(224, 224)
        -normalize to 0-1
        -expand_dims batch
    }

    class PredictionInterpreter {
        +interpret_prediction(raw) tuple
        -label string "road_damage | not_road"
        -confidence float "0-1"
        -store_in_db boolean
    }

    class FileValidator {
        +allowed_file(filename) boolean
        -ALLOWED_EXTENSIONS Set "png,jpg,jpeg,webp,bmp"
    }

    FlaskApp --> KerasModel : "model.predict()"
    FlaskApp --> ImagePreprocessor : "preprocess"
    FlaskApp --> PredictionInterpreter : "interpret"
    FlaskApp --> FileValidator : "validate"
```

---

## 5. Data Flow Sequence (Report Creation)

```mermaid
sequenceDiagram
    participant C as Citizen Browser
    participant AI as Flask AI Service
    participant BE as Express Backend
    participant DB as PostgreSQL
    participant S3 as Supabase Storage

    C->>AI: POST /predict (image file)
    AI->>AI: Preprocess (224x224, normalize)
    AI->>AI: model.predict() → sigmoid
    AI-->>C: {prediction, confidence, store_in_db}

    alt AI Rejected (confidence < 80%)
        C->>C: Show error "Not road damage"
    end

    C->>BE: POST /api/media/upload (JWT + image buffer)
    BE->>AI: POST /predict (server-side re-check)
    AI-->>BE: {prediction, confidence, store_in_db}

    alt Server AI Rejected
        BE-->>C: 422 "AI_REJECTED"
    end

    BE->>S3: upload(storagePath, buffer)
    S3-->>BE: publicUrl
    BE->>DB: INSERT report_media_uploads
    DB-->>BE: mediaId
    BE-->>C: {media: {id, url}, ai: {prediction, confidence}}

    C->>BE: POST /api/reports (JWT + mediaIds + category + location)
    BE->>BE: resolveDistrictFromCoordinates(lat, lng)
    BE->>DB: SELECT merge candidates (same category, within 100m)

    alt Duplicate Found
        BE->>DB: UPDATE supporters = array_append(...)
        BE-->>C: 200 "Merged into existing report"
    else No Duplicate
        BE->>DB: INSERT new report (RW-2026-XXXX)
        BE->>DB: UPDATE media.report_id = newReportId
        BE->>DB: SELECT related announcements
        BE-->>C: 201 {report, relatedAnnouncements}
    end
```
