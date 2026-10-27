# Step 3 Implementation Plan: Login & Logout

## Context

Building on Step 2 (user registration), Step 3 introduces authenticated sessions to Spendly. The layered architecture (`routes/auth.js` → `controllers/authController.js` → `db/users.js`) established in Step 2 is reused. Currently:
- `GET /login` and `GET /register` are already in `routes/auth.js`; `POST /register` works.
- `GET /logout` is an **inline handler** in `server.js:24` (must move per spec).
- `db/users.js` already exports `findUserByEmail(email)` — no DB changes needed.
- `views/auth/login.ejs` already supports error rendering via `errors`, preserves `email`, and leaves the password field empty — no template changes needed.
- `express-session` and `bcrypt` are already installed and configured — no new dependencies.

## Implementation Approach

Follow the `postRegister` pattern in `controllers/authController.js` as the reference for validation, error handling, and response format. Use `bcrypt.compare` instead of `bcrypt.hash` for login verification.

### Phase 1 — Add routes

**`routes/auth.js`** — add two routes:
- `router.post('/login', authController.postLogin);`
- `router.get('/logout', authController.getLogout);`

### Phase 2 — Implement controllers

**`controllers/authController.js`** — add two exported functions:

**`postLogin(req, res)`** (async):
1. Extract and normalize input: trim + lowercase `email`; read `password` as-is.
2. Validate: email required, valid email format, max 254 chars; password required, 8–72 chars. Collect errors into array.
3. If errors: `return res.status(400).render('auth/login', { errors, email })` — preserve email, clear password.
4. Lookup user: `const user = findUserByEmail(email)` via `db/users.js`.
5. If no user or `!bcrypt.compare(password, user.password_hash)`: `return res.status(401).render('auth/login', { errors: ['Invalid email or password.'], email })` — **generic message**, no email enumeration.
6. Success: `req.session.userId = user.id` (store only user ID, never password hash); `return res.redirect('/')`.
7. Wrap DB/compare in try/catch: unexpected error → `res.status(500).render('auth/login', { errors: ['Something went wrong.'], email })`.

**`getLogout(req, res)`** (sync):
- `req.session.destroy();` then `res.redirect('/')`.

### Phase 3 — Move logout out of server.js

**`server.js`** — remove the inline handler at line 24:
```js
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
```
Keep all other existing routes (`/`, `/profile`, `/terms`, `/privacy`, etc.) unchanged.

## Files to Change

| File | Change |
|------|--------|
| `routes/auth.js` | Add `POST /login` and `GET /logout` route mappings |
| `controllers/authController.js` | Add `postLogin` and `getLogout`; require `findUserByEmail` from `db/users` |
| `server.js` | Remove inline `GET /logout` handler |

## Files NOT Changed (spec-confirmed)

| File | Reason |
|------|--------|
| `db/init.js` | No DB changes — seed stays as-is (`demo@spendly.com` / `demo123`) |
| `db/users.js` | `findUserByEmail` already exists and is reusable |
| `views/auth/login.ejs` | Already supports `errors`, preserves `email`, empty password field |
| `package.json` | No new dependencies — bcrypt and express-session already installed |

## Critical Implementation Details

- **bcrypt.compare** for verification — never re-hash or store password hash in session.
- **Session**: `req.session.userId = user.id` only — no password, no email, no hash.
- **401 error**: Generic `"Invalid email or password."` — does not reveal whether the email exists.
- **Email normalization**: trim + lowercase before validation and DB lookup (matches register pattern).
- **Password length**: 8–72 chars (bcrypt ignores bytes past 72).
- **Email format**: valid email regex, max 254 chars.
- **Error rendering**: `res.status(...).render('auth/login', { errors, email })` pattern from `postRegister`.

## Verification (manual, via `npm run dev`)

1. `GET /login` — renders login form, served from `routes/auth.js` (not server.js).
2. Valid login (`demo@spendly.com` / `demo123`) — redirects to `/`, creates session with `req.session.userId`.
3. Wrong password — returns 401, re-renders form with generic error, no session created.
4. Unknown email — returns 401, re-renders form with same generic error (no email enumeration).
5. `GET /logout` — destroys session, redirects to `/`; subsequent requests show no authenticated state.
6. `server.js` contains no inline auth handlers (`/register`, `/login`, `/logout`) and no SQL.