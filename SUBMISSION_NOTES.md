# SUBMISSION NOTES
**Candidate**: Pichika Chandu  
**Email**: chandupichika0@gmail.com  
**Assignment**: Finance Data Processing and Access Control Backend  
**Role**: Backend Developer Intern  

---

## How This Project Matches the Assignment

### 1. User and Role Management ✅
- Three roles defined: **Admin**, **Analyst**, **Viewer**
- User lifecycle management: create, list, update (role/status), delete — all Admin-only
- Users can be toggled between `active` and `inactive` status
- Role assignment enforced in `models/User.js` with enum validation

### 2. Financial Records Management ✅  
- Full CRUD: Create, Read (with pagination), Update, Delete
- Record model includes: `amount`, `type` (income/expense), `category`, `date`, `notes`
- Filtering: by `type`, `category`, `startDate`, `endDate`, `search`
- **Soft Delete**: Records are flagged `isDeleted: true` instead of being purged, preserving data history

### 3. Dashboard Summary APIs ✅  
- `GET /dashboard/summary` — Total income, expenses, net balance, and counts
- `GET /dashboard/category` — Category-wise breakdown with totals
- `GET /dashboard/trends` — Monthly income vs. expense trends (last 12 months by default)
- `GET /dashboard/recent` — Last N transactions with configurable limit
- All dashboards support `startDate`/`endDate`/`type` query filters

### 4. Access Control Logic ✅  
- JWT-based authentication for all protected routes
- `authenticateToken` middleware validates every request
- `authorizeRoles(...roles)` middleware enforces per-route RBAC
- Access matrix:

| Feature | Admin | Analyst | Viewer |
|---------|-------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| View Records | ✅ | ✅ | ❌ |
| Create/Update/Delete Records | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |

### 5. Validation and Error Handling ✅  
- `express-validator` rules in `middleware/validation.js` for all endpoints
- Global error handler in `middleware/errorHandler.js` with custom error classes
- Informative error responses with field-level details and HTTP status codes
- Input sanitization applied to all incoming requests

### 6. Data Persistence ✅  
- **Database**: MongoDB via Mongoose ODM (hosted on Atlas / local)
- Schema-level validation and indexed fields for performance
- Timestamps on all records (`createdAt`, `updatedAt`)

---

## Optional Enhancements Implemented

| Enhancement | Status |
|-------------|--------|
| JWT Authentication | ✅ Implemented |
| Pagination for record listing | ✅ Implemented (`page`, `limit` params) |
| Search support | ✅ Implemented (keyword search on category/notes) |
| Soft Delete | ✅ Implemented (`isDeleted` flag on records) |
| Rate Limiting | ✅ 100 req/15 min per IP via `express-rate-limit` |
| API Documentation endpoint | ✅ `GET /api/docs` returns full endpoint schema |
| Test scripts | ✅ `npm test`, `npm run test:dashboard` |

---

## Assumptions Made

1. **Admin Seeding**: A first admin must be created via `node scripts/create-admin.js` since there is no public registration endpoint (security-by-design).
2. **Viewer Access**: Viewers access aggregated dashboard data only — no individual transaction visibility, as aggregate-level access is sufficient for a "viewer" role in a finance dashboard.
3. **Soft Delete Scope**: Only financial records support soft delete. User deletion is hard delete, since orphaned user references are more complex to handle.
4. **Category**: Category is a free-form string field, allowing flexibility for different business domains.

---

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (`jsonwebtoken`) + `bcryptjs`
- **Validation**: `express-validator`
- **Security**: `express-rate-limit`, input sanitization
- **Deployment**: Configured for Render.com (`render.yaml`)

## Live API (Deployed)

🚀 **Base URL**: `https://fintech-backend-system-vq8g.onrender.com/api`

## Running Locally

```bash
npm install
cp .env.sample .env   # Fill in MONGODB_URI and JWT_SECRET
node scripts/create-admin.js
npm start             # or: npm run dev
```

**Default Admin**  
- Email: `admin@fontech.com`  
- Password: `admin123`  

## Quick Test

```bash
node scripts/verify-api.js   # Full end-to-end verification
npm test                     # Validation tests
npm run test:dashboard       # Dashboard tests
```
