# NutriTrack Review — 2026-05-23

## Summary
- 0 critical, 4 high, 7 medium, 5 low findings
- Overall posture is solid: tenant-isolation rule is enforced everywhere, all queries are parameterized, password_hash is never returned, JWT + admin-secret middleware are correctly mounted. The remaining findings are mostly defensive gaps in the admin surface and i18n debt in admin/PDF code.

## Critical (security/tenancy leaks)
- *None.* Every data route either applies `auth` directly (clients, goals, plans, meals, logs) or is mounted behind `auth` in `server/index.js:36`. Every `SELECT/UPDATE/DELETE` against tenant-owned tables is scoped by `nutritionist_id` directly or via `verifyClient` / `verifyPlan` / `verifyMeal` / `logOwnedClientId` joins. `password_hash` is excluded from every response (`server/routes/auth.js:32`, `server/routes/admin.js:7` `SAFE_COLS`, `server/middleware/auth.js:18`).

## High
- `server/routes/admin.js:27-45` — `POST /api/admin/nutritionists` accepts arbitrary `plan` string with no allow-list check; DB only enforces `VARCHAR(20)`. **Fix:** validate `plan` ∈ `['trial','solo','growth']` before insert.
- `server/routes/admin.js:27-45` — no password strength check (any non-empty string passes). Super-admin route, so blast radius is small, but a 1-char password is a real foot-gun. **Fix:** require `password.length >= 12`.
- `server/routes/plans.js:189-190` — `POST /api/clients/:id/plans` accepts `week_start` without validating the ISO date format (other date inputs use `isValidIsoDate`). **Fix:** reuse the same regex/Date check used in `goals.js:20` and `logs.js:39`.
- `server/routes/admin.js:47-69` — `PUT /api/admin/nutritionists/:id` accepts arbitrary `plan` and `plan_expires_at` with no validation; `is_active` is not coerced to boolean. **Fix:** allow-list `plan`, validate `plan_expires_at` as ISO date, coerce `is_active` with `Boolean()`.

## Medium
- `client/src/pages/AdminPanel.jsx:22,24,100,103,108,122,126,134,142,160,169-175,182,199,204,210,219,225` — admin page is entirely hardcoded English, not wired to i18n. Lower priority than nutritionist-facing pages but inconsistent with the rest of the app. **Fix:** add an `admin.*` namespace in `en.json` / `fr.json` and wrap with `t(...)`.
- `client/src/components/DietPlanPDF.jsx:381,477` — PDF exporter has hardcoded "Daily total" and "No goal set". PDFs go to clients in their language; this leaks English. **Fix:** thread `t` into `DietPlanPDF` or pass pre-translated labels as props.
- `client/src/components/ErrorBoundary.jsx:27` — "Something went wrong" is hardcoded. Acceptable as a last-resort fallback (i18n may itself be the cause), but worth a comment if intentional.
- `server/db/schema.sql:30,43,51,63` — `client_id` on `goals`, `diet_plans`, `progress_logs` and `plan_id` on `meals` are nullable. Cascades make orphans unreachable, but a buggy insert with `null` would silently create an unattributable row. **Fix:** add `NOT NULL` to all four FK columns.
- `server/routes/admin.js:71-79` — `DELETE /api/admin/nutritionists/:id` doesn't `parseInt` the id; relies on pg to coerce. Works today, but inconsistent with the rest of the codebase. **Fix:** match the integer-validation pattern from `clients.js:211`.
- `server/routes/clients.js:131-136` — `body.age`, `body.height_cm`, `body.start_weight` are inserted with `|| null`, which converts a legitimate `0` to null. Not realistic for these fields, but the same idiom in nutritional values could bite. **Fix:** use `?? null`.
- `server/routes/auth.js:35` — `/api/auth/login` returns a generic `Server error` on DB failure; no log line to correlate. The global error handler at `server/index.js:40` would log via `console.error(err)` — consider letting errors propagate via `next(e)` instead of swallowing in every route's `catch (e)`.

## Low / nits
- `server/index.js:33` — `app.use('/api/auth', authRouter)` mounts `authRouter` without `auth` middleware (correct for `/login`), but `/api/auth/me` re-applies `auth` per route. Fine, just easy to miss when adding new endpoints.
- `server/routes/clients.js:82,141,173,205,220` — every route ends with `res.status(500).json({ error: 'Server error' })`. Forwarding to `next(e)` would centralize the response and make the global handler do something useful.
- `client/src/components/ErrorBoundary.jsx:15` — `console.error` is intentional but unguarded; in production you'd typically forward to Sentry/etc. Leave for now.
- `server/routes/admin.js:42` — `if (e.code === '23505')` swallows other pg constraint codes. Fine but undocumented.
- `client/src/pages/DietPlan.jsx:280` — `max-w-[1400px]` is the only page-level width cap in the app; verify intentional (other pages flex full width).

## What looked good
- Tenant scoping is consistently enforced: list, get, update, delete all filter by `nutritionist_id`, and cross-tenant id traversal on meals/plans/logs goes through proper join helpers (`verifyMeal`, `verifyPlan`, `logOwnedClientId`).
- All queries use parameterized `$N` placeholders; no string concatenation found anywhere in `server/routes/` or `server/db/`.
- `404` (not `403`) is used for "not found OR not owned" — correct: doesn't leak existence to other tenants.
- Login is rate-limited (`server/routes/auth.js:10`), `is_active` is re-checked on every request (`server/middleware/auth.js:23`), and `helmet` + scoped `cors` are applied at the app level.
- Frontend pages all handle `loading`, `error`, and empty states; list pages (`Dashboard`, `ClientDetail`, `ProgressLog`) all use `Promise.all` for parallel mount fetches.
- Backend list endpoints use single enriched queries with `LATERAL` joins / subqueries (`clients.js:25-85`, `plans.js:156-180`, `admin.js:9-25`) — no N+1 on hot paths.
- `check-env.js` enforces 32-char minimum on `JWT_SECRET` and `SUPER_ADMIN_SECRET` at startup.
