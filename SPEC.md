# NutriTrack — MVP Specification

> Read this file at the start of every Claude Code session before writing any code.
> All decisions about structure, naming, and features must match this spec.

---

## 1. Project overview

A multi-tenant SaaS tool for nutritionists to manage their clients.
Each nutritionist has their own isolated account — they see only their own clients,
plans, and logs. You (the developer) are the super-admin and provision accounts
via a private admin panel. No client-facing portal in v1.

**Roles:**
- `super_admin` — you only. Access via SUPER_ADMIN_SECRET env var. Can create/suspend/delete nutritionist accounts.
- `nutritionist` — each paying doctor. Logs in with email/password. Sees only their own data.

---

## 2. Tech stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React (Vite) + Tailwind CSS         |
| Routing    | React Router v6                     |
| Charts     | Recharts                            |
| Backend    | Node.js + Express                   |
| Database   | PostgreSQL                          |
| Auth       | JWT (stored in httpOnly cookie)     |
| Deploy FE  | Vercel                              |
| Deploy BE  | Railway                             |
| DB hosting | Railway (PostgreSQL plugin)         |

---

## 3. Folder structure

```
nutritrack/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ClientRow.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── Badge.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ClientNew.jsx
│   │   │   ├── ClientDetail.jsx
│   │   │   ├── DietPlan.jsx
│   │   │   ├── ProgressLog.jsx
│   │   │   └── AdminPanel.jsx   # Super-admin only — your account management UI
│   │   ├── api/             # Axios API calls, one file per resource
│   │   │   ├── auth.js
│   │   │   ├── clients.js
│   │   │   ├── plans.js
│   │   │   └── logs.js
│   │   ├── hooks/           # Custom React hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                  # Express backend
│   ├── routes/
│   │   ├── admin.js         # Super-admin CRUD for nutritionist accounts
│   │   ├── auth.js
│   │   ├── clients.js
│   │   ├── goals.js
│   │   ├── plans.js
│   │   ├── meals.js
│   │   └── logs.js
│   ├── middleware/
│   │   ├── auth.js          # JWT verification for nutritionist routes
│   │   └── adminAuth.js     # SUPER_ADMIN_SECRET check for /api/admin/* routes
│   ├── db/
│   │   ├── pool.js          # pg Pool instance
│   │   └── schema.sql       # Full DB schema (source of truth)
│   ├── .env                 # Never commit — see .env.example
│   └── index.js             # Entry point
│
├── SPEC.md                  # This file
├── README.md
└── .env.example
```

---

## 4. Database schema

All tables live in the default `public` schema. Use `schema.sql` to create them.

```sql
-- Nutritionist accounts (one row per doctor/client you onboard)
CREATE TABLE nutritionist (
  id               SERIAL PRIMARY KEY,
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  plan             VARCHAR(20) DEFAULT 'trial',  -- trial | solo | growth
  plan_expires_at  TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,          -- false = suspended
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Client profiles (always scoped to a nutritionist)
CREATE TABLE clients (
  id               SERIAL PRIMARY KEY,
  nutritionist_id  INT REFERENCES nutritionist(id) ON DELETE CASCADE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255),
  phone            VARCHAR(50),
  age              INT,
  gender           VARCHAR(20),
  height_cm        NUMERIC(5,1),
  start_weight     NUMERIC(5,1),
  allergies        TEXT,
  medical_notes    TEXT,
  status           VARCHAR(20) DEFAULT 'active', -- active | new | paused
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Goals per client (one active goal at a time)
CREATE TABLE goals (
  id              SERIAL PRIMARY KEY,
  client_id       INT REFERENCES clients(id) ON DELETE CASCADE,
  target_weight   NUMERIC(5,1),
  target_date     DATE,
  daily_calories  INT,
  protein_g       INT,
  carbs_g         INT,
  fat_g           INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Diet plans (a client can have multiple plans over time)
CREATE TABLE diet_plans (
  id           SERIAL PRIMARY KEY,
  client_id    INT REFERENCES clients(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Individual meals inside a diet plan
CREATE TABLE meals (
  id           SERIAL PRIMARY KEY,
  plan_id      INT REFERENCES diet_plans(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL,       -- 0=Monday … 6=Sunday
  meal_type    VARCHAR(50),        -- breakfast | lunch | dinner | snack
  description  TEXT NOT NULL,
  calories     INT,
  protein_g    NUMERIC(5,1),
  carbs_g      NUMERIC(5,1),
  fat_g        NUMERIC(5,1)
);

-- Progress logs (one row per client visit/session)
CREATE TABLE progress_logs (
  id           SERIAL PRIMARY KEY,
  client_id    INT REFERENCES clients(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL,
  weight       NUMERIC(5,1),
  waist_cm     NUMERIC(5,1),
  hips_cm      NUMERIC(5,1),
  arms_cm      NUMERIC(5,1),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API routes

All routes except `/api/auth/login` require the JWT auth middleware.
Base URL in development: `http://localhost:4000`

### Super-admin routes (protected by SUPER_ADMIN_SECRET header — you only)
| Method | Route                          | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | /api/admin/nutritionists       | List all accounts + plan + status    |
| POST   | /api/admin/nutritionists       | Create new nutritionist account      |
| PUT    | /api/admin/nutritionists/:id   | Update plan, suspend, reactivate     |
| DELETE | /api/admin/nutritionists/:id   | Delete account + all their data      |

### Auth (nutritionist)
| Method | Route              | Description                     |
|--------|--------------------|---------------------------------|
| POST   | /api/auth/login    | Login, returns JWT cookie       |
| POST   | /api/auth/logout   | Clears cookie                   |
| GET    | /api/auth/me       | Returns current nutritionist    |

### Clients
| Method | Route              | Description                     |
|--------|--------------------|---------------------------------|
| GET    | /api/clients       | List all clients                |
| POST   | /api/clients       | Create new client               |
| GET    | /api/clients/:id   | Get single client               |
| PUT    | /api/clients/:id   | Update client profile           |
| DELETE | /api/clients/:id   | Delete client                   |

### Goals
| Method | Route                      | Description               |
|--------|----------------------------|---------------------------|
| GET    | /api/clients/:id/goals     | Get client's goals        |
| POST   | /api/clients/:id/goals     | Set/update goal           |

### Diet plans
| Method | Route                      | Description               |
|--------|----------------------------|---------------------------|
| GET    | /api/clients/:id/plans     | List all plans for client |
| POST   | /api/clients/:id/plans     | Create new plan           |
| GET    | /api/plans/:planId         | Get plan with all meals   |
| PUT    | /api/plans/:planId         | Update plan notes         |
| DELETE | /api/plans/:planId         | Delete plan               |

### Meals (inside a plan)
| Method | Route                      | Description               |
|--------|----------------------------|---------------------------|
| POST   | /api/plans/:planId/meals   | Add meal to plan          |
| PUT    | /api/meals/:mealId         | Edit a meal               |
| DELETE | /api/meals/:mealId         | Remove a meal             |

### Progress logs
| Method | Route                      | Description               |
|--------|----------------------------|---------------------------|
| GET    | /api/clients/:id/logs      | All logs for a client     |
| POST   | /api/clients/:id/logs      | Add new log entry         |
| PUT    | /api/logs/:logId           | Edit a log entry          |
| DELETE | /api/logs/:logId           | Delete a log entry        |

---

## 6. Pages and routes (frontend)

| URL                        | Component       | Description                              |
|----------------------------|-----------------|------------------------------------------|
| /login                     | Login.jsx       | Auth form, redirects to /dashboard       |
| /dashboard                 | Dashboard.jsx   | All clients overview + 4 stat cards      |
| /clients/new               | ClientNew.jsx   | Intake form — create new client          |
| /clients/:id               | ClientDetail.jsx| Client profile, charts, latest plan, logs|
| /clients/:id/plan/new      | DietPlan.jsx    | 7-day diet plan builder                  |
| /clients/:id/plan/:planId  | DietPlan.jsx    | Edit existing diet plan                  |
| /clients/:id/log           | ProgressLog.jsx | Log a new visit/measurement              |
| /admin                     | AdminPanel.jsx  | Super-admin only — manage nutritionist accounts |

All routes except `/login` are protected — redirect to `/login` if no valid JWT.

---

## 7. Feature scope

### In v1 (build now)
- [x] Nutritionist login with JWT
- [x] Client CRUD (create, read, update, delete)
- [x] Goal setting per client (weight, macros, calories, target date)
- [x] Manual diet plan builder (7-day grid, meals per day with macros)
- [x] Progress logging per visit (weight, measurements, notes)
- [x] Client detail page with weight-over-time chart (Recharts LineChart)
- [x] Goal progress bar (calculated from start/current/target weight)
- [x] All-clients dashboard with 4 stat cards and filterable table
- [x] Status badges (active / new / paused / overdue)
- [x] Overdue detection (last log > 14 days ago)

### Out of scope for v1 (save for v2)
- [ ] Client login / client-facing portal
- [ ] PDF export of diet plans
- [ ] AI-generated diet suggestions (Claude API)
- [ ] Appointment scheduling / calendar
- [ ] Email or WhatsApp notifications
- [ ] Stripe/CMI payment integration (manual invoicing for now)

---

## 8. Key business logic

**Tenant isolation rule — applies to EVERY query in EVERY route**
```js
// WRONG — never do this
const clients = await db.query('SELECT * FROM clients');

// CORRECT — always scope to the authenticated nutritionist
const clients = await db.query(
  'SELECT * FROM clients WHERE nutritionist_id = $1',
  [req.nutritionist.id]
);
```

**Super-admin auth middleware**
```js
// server/middleware/adminAuth.js
module.exports = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

**Account suspension check — add to nutritionist auth middleware**
```js
// After verifying JWT, also check is_active
if (!nutritionist.is_active) {
  return res.status(403).json({ error: 'Account suspended' });
}
```

**Goal progress %**
```js
const progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
// Clamp to 0–100. Green if >= 50%, amber if < 50%.
```

**Overdue detection**
```js
const daysSinceLastLog = (Date.now() - new Date(lastLogDate)) / (1000 * 60 * 60 * 24);
const isOverdue = daysSinceLastLog > 14;
```

**Daily macro totals (diet plan builder)**
```js
// Sum calories/protein/carbs/fat across all meals for a given day_of_week
// Show vs. goal target so nutritionist can see if the day is on track
```

---

## 9. Environment variables

```bash
# server/.env (never commit)
DATABASE_URL=postgresql://user:pass@host:5432/nutritrack
JWT_SECRET=your_long_random_secret_here
SUPER_ADMIN_SECRET=another_long_random_secret_only_you_know
PORT=4000
CLIENT_URL=http://localhost:5173

# client/.env
VITE_API_URL=http://localhost:4000
```

---

## 10. Build order (week by week)

| Week | Focus                                              |
|------|----------------------------------------------------|
| 1    | DB schema + Express skeleton + auth + client CRUD  |
| 2    | Diet plan builder + meals API + plan builder UI    |
| 3    | Progress logs + Recharts weight chart + goal bar   |
| 4    | Dashboard overview + stat cards + polish + deploy  |

---

*Last updated: May 2026 — v1 scope (updated: added multi-tenancy + super-admin panel)*
