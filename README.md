# NutriTrack

A multi-tenant SaaS platform for nutritionists to manage clients, build weekly diet plans, and track progress over time. Each nutritionist has a fully isolated account — their clients, plans, and logs are never visible to other users.

---

## Features

- **Client management** — full intake forms, health notes, allergies, goal setting
- **7-day diet plan builder** — manual meal grid with live calorie and macro totals
- **Progress tracking** — log weight and measurements per visit, weight-over-time chart
- **Goal progress bar** — calculated from start/current/target weight with pace indicator
- **All-clients dashboard** — stat cards, filterable table, overdue detection
- **Multi-tenancy** — every query is scoped to the authenticated nutritionist
- **Super-admin panel** — provision, suspend, and delete nutritionist accounts
- **Secure by default** — JWT auth, helmet headers, rate limiting, input sanitization

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (Bearer token) |
| Deploy — Frontend | Vercel |
| Deploy — Backend | Railway |

---

## Project structure

```
nutritrack/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── api/                # Axios API functions
│   │   ├── components/         # Reusable UI components
│   │   └── pages/              # Route-level page components
│   ├── .env.example
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── db/
│   │   ├── pool.js             # PostgreSQL connection pool
│   │   ├── schema.sql          # Full DB schema (source of truth)
│   │   └── seed.js             # Dev seed script
│   ├── middleware/
│   │   ├── auth.js             # JWT verification + suspension check
│   │   └── adminAuth.js        # Super-admin secret header check
│   ├── routes/
│   │   ├── admin.js            # Nutritionist account management
│   │   ├── auth.js             # Login, logout, me
│   │   ├── clients.js          # Client CRUD
│   │   ├── goals.js            # Goal setting per client
│   │   ├── plans.js            # Diet plans
│   │   ├── meals.js            # Meals inside a plan
│   │   └── logs.js             # Progress logs
│   ├── index.js                # Express entry point
│   └── .env.example
│
└── SPEC.md                     # Full project specification
```

---

## Getting started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/nutritrack.git
cd nutritrack
```

### 2. Set up the backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nutritrack
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SUPER_ADMIN_SECRET=<generate a second one>
PORT=4000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Both `JWT_SECRET` and `SUPER_ADMIN_SECRET` must be at least 32 characters. The server will refuse to start if either is missing or too short.

### 3. Set up the database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE nutritrack;"

# Run the schema
psql -U postgres -d nutritrack -f db/schema.sql
```

### 4. Seed a dev account (optional)

```bash
node db/seed.js
```

Creates a test account: `test@nutritrack.com` / `dev123`

### 5. Start the backend

```bash
npm start
# → NutriTrack API on :4000
```

Test it:

```bash
curl http://localhost:4000/health
# → {"status":"ok"}
```

### 6. Set up the frontend

```bash
cd ../client
npm install
cp .env.example .env
```

`.env`:

```env
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev
# → http://localhost:5173
```

---

## API overview

### Admin routes
Protected by `x-admin-secret` header. Only the developer has access.

| Method | Route | Description |
|---|---|---|
| GET | /api/admin/nutritionists | List all accounts + client count |
| POST | /api/admin/nutritionists | Create a nutritionist account |
| PUT | /api/admin/nutritionists/:id | Update plan, suspend, reactivate |
| DELETE | /api/admin/nutritionists/:id | Delete account + all their data |

### Auth routes

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/login | Login → returns JWT |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current nutritionist |

### Client routes (all JWT protected)

| Method | Route | Description |
|---|---|---|
| GET | /api/clients | All clients (scoped to nutritionist) |
| POST | /api/clients | Create client |
| GET | /api/clients/:id | Client + goal + last 10 logs |
| PUT | /api/clients/:id | Update client |
| DELETE | /api/clients/:id | Delete client (cascades) |

### Other protected routes

| Method | Route | Description |
|---|---|---|
| GET/POST/PUT | /api/clients/:id/goals | Goal management |
| GET/POST/DELETE | /api/clients/:id/plans | Diet plans |
| GET | /api/plans/:planId | Plan with meals grouped by day |
| POST/PUT/DELETE | /api/plans/:planId/meals | Meal management |
| GET/POST | /api/clients/:id/logs | Progress logs |
| PUT/DELETE | /api/logs/:logId | Edit/delete a log |

---

## Security

- All routes (except `/api/auth/login` and `/api/admin/*`) require a valid JWT
- JWT is verified on every request — suspended accounts are blocked immediately
- Admin routes require a separate `x-admin-secret` header, never a JWT
- Login is rate-limited to 10 requests per 15 minutes per IP
- All text inputs are trimmed and length-capped before DB insertion
- `helmet` sets security headers on every response
- CORS is restricted to `CLIENT_URL` — no wildcard
- Stack traces are never exposed in production responses

---

## Database schema

Six tables with full cascade deletes:

```
nutritionist          — one row per doctor account
clients               — scoped to nutritionist_id (NOT NULL)
goals                 — scoped through clients
diet_plans            — scoped through clients
meals                 — scoped through diet_plans
progress_logs         — scoped through clients
```

Tenant isolation is enforced at the query level — every SELECT, INSERT, UPDATE, and DELETE includes `WHERE nutritionist_id = $n`.

---

## Deployment

### Backend → Railway

1. Push `/server` to GitHub
2. New Railway project → connect repo → set root to `/server`
3. Add PostgreSQL plugin → `DATABASE_URL` is auto-injected
4. Set env vars: `JWT_SECRET`, `SUPER_ADMIN_SECRET`, `CLIENT_URL`, `NODE_ENV=production`
5. Run `schema.sql` in Railway's PostgreSQL shell
6. Run `node db/seed.production.js` to create the first nutritionist account

### Frontend → Vercel

1. New Vercel project → connect repo → set root to `/client`
2. Framework preset: Vite (auto-detected)
3. Set env var: `VITE_API_URL=https://your-railway-url.railway.app`
4. Deploy → update Railway `CLIENT_URL` with the Vercel URL → redeploy backend

---

## Roadmap (v2)

- [ ] Client-facing portal (clients log their own meals and weight)
- [ ] PDF export of diet plans
- [ ] AI-generated diet suggestions (Claude API)
- [ ] Appointment scheduling and reminders
- [ ] Stripe / CMI payment integration
- [ ] WhatsApp notifications

---

## License

MIT
