# Implementation Plan: User Registration (Step 02)

## Context

The Spendly expense tracker is introducing its first authentication feature. The spec at `.claude/specs/02-user-registration.md` defines the POST /register endpoint and the new layered architecture (routes → controllers → db modules) that all future features will follow. This step also migrates the existing GET /register and GET /login routes into the new structure.

## Current State

| File | Status |
|------|--------|
| `server.js` | Has inline `GET /register` and `GET /login` handlers; uses `express.urlencoded({ extended: true })` (should be `false` per spec); no router mounting |
| `views/auth/register.ejs` | Renders registration form with `name`, `email`, `password` fields; no `confirm_password`; no error list; no prefilled values |
| `views/auth/login.ejs` | Renders login form; no success message display for `?registered=1` |
| `db/index.js` | ✅ Singleton SQLite connection with FK + WAL |
| `db/init.js` | ✅ Users table with `id`, `name`, `email` (UNIQUE), `password_hash`, `created_at` |
| `routes/` | Does not exist |
| `controllers/` | Does not exist |
| `db/users.js` | Does not exist |

## What Needs to Change

### 1. `db/users.js` — Create (DB Layer)

New file. Contains **only SQL** for user operations. No Express logic.

**Functions to implement:**

| Function | Purpose |
|----------|---------|
| `createUser({ name, email, passwordHash })` | Inserts a user row. Uses prepared statement with `?` placeholders. Returns `lastInsertRowid` or throws on constraint violation. |
| `findUserByEmail(email)` | SELECT by email (lowercased). Returns row or `undefined`. Not used in this step but needed for login later. |

**Implementation details:**
- `require('better-sqlite3')` is NOT needed — import `db` from `../db/index` (the singleton)
- Use `db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')`
- Use `db.prepare('SELECT * FROM users WHERE email = ?')`
- `createUser` should NOT catch `SQLITE_CONSTRAINT_UNIQUE` — let it bubble up; controller handles it
- Export both functions as named exports: `module.exports = { createUser, findUserByEmail }`
- **No bcrypt here** — hashing happens in the controller

### 2. `controllers/authController.js` — Create (Controller Layer)

New file. Contains **request handling logic only**. No SQL, no route definitions.

**Functions to implement:**

| Function | Responsibility |
|----------|----------------|
| `getRegister(req, res)` | Renders `auth/register` — **always** passes `errors: []`, `name: ''`, `email: ''` on every render (fresh form state) |
| `getLogin(req, res)` | Renders `auth/login` — **always** passes `registered: req.query.registered === '1'` on every render |
| `postRegister(req, res)` | Validates input, hashes password, calls `db/users.createUser`, handles success/error responses |

**`postRegister` validation logic (in order):**
1. Read `req.body` fields and **coerce to strings**, then trim:
   - `const name = String(req.body.name || '').trim();`
   - `const email = String(req.body.email || '').trim().toLowerCase();`
   - `const password = String(req.body.password || '');`
   - `const confirmPassword = String(req.body.confirm_password || '');`
2. Lowercase `email` (before validation and storage)
3. Validate:
   - `name`: required, 1–100 chars
   - `email`: required, valid format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), max 254 chars
   - `password`: required, 8–72 bytes (check via `Buffer.byteLength(password, 'utf8')`)
   - `confirm_password`: required, equals `password`
4. If any validation fails: `return res.status(400).render('auth/register', { errors, name, email })`
5. Hash password: `const passwordHash = await bcrypt.hash(password, BCRYPT_COST);` (cost factor from constant = 12)
6. Call `createUser({ name, email, passwordHash })`
7. On success: `res.redirect('/login?registered=1')` — **no session creation**
8. Catch error from `createUser`:
   - If `err.code === 'SQLITE_CONSTRAINT_UNIQUE'` → `return res.status(409).render('auth/register', { errors: ['Email already registered'], name, email })`
   - Otherwise → proceed to step 9
9. Catch other errors: `return res.status(500).render('auth/register', { errors: ['Something went wrong. Please try again.'], name, email })` — **do not create an error view**; re-render the register form with a generic error message.

**Constants at top of file:**
```js
const BCRYPT_COST = 12;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;      // minimum byte length
const PASSWORD_MAX = 72;      // bcrypt truncates at 72 bytes; bcrypt ignores bytes past 72
```

**Requires:** `bcrypt`, `db/users.js`

### 3. `routes/auth.js` — Create (Route Layer)

New file. **Only** maps HTTP methods + paths to controller functions. No logic.

**Structure:**
```js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/register', authController.getRegister);
router.get('/login', authController.getLogin);
router.post('/register', authController.postRegister);

module.exports = router;
```

**Mount in `server.js`** (see below).

### 4. `server.js` — Modify (App Setup)

**Changes:**
1. **Change** `express.urlencoded({ extended: true })` → `express.urlencoded({ extended: false })`
2. **Remove** inline handlers for `GET /register` (line 22) and `GET /login` (line 23)
3. **Add** require for auth router: `const authRouter = require('./routes/auth');`
4. **Mount** router: `app.use('/', authRouter);` (before other routes)
5. Keep all other existing routes (`/`, `/logout`, `/profile`, `/terms`, `/privacy`, `/expenses/*`) as-is — they stay in `server.js` until a future step moves them

**Order of middleware matters:**
```js
app.use(express.urlencoded({ extended: false }));
app.use(express.static(...));
app.set('view engine', 'ejs');
app.set('views', ...);
app.use(session(...));
app.use('/', require('./routes/auth'));  // <-- mount auth router
app.get('/', ...);  // other routes
...
```

### 5. `views/auth/register.ejs` — Modify

**Current form structure** (from reading the file):
- Uses EJS body variable pattern with `<%- include('../layouts/base', { title, body }) %>`
- Error displayed via `errorHtml` variable
- Form POSTs to `/register`

**Required changes:**
1. **Add `confirm_password` field** (type="password", required, placed after password field)
2. **Add password hint**: `<p class="form-hint">Minimum 8 characters</p>` below password field
3. **Replace single `error` variable with `errors` array**:
   - Controller will pass `errors` array (empty or populated)
   - Render as `<ul class="errors">` or similar, iterating `errors`
4. **Prefill `name` and `email`** on validation failure:
   - `value="<%= name || '' %>"` on name input
   - `value="<%= email || '' %>"` on email input
   - **Never** prefill password or confirm_password
5. **Escaping**: Use `<%= %>` for all user-supplied values (already done for `error` but verify)
6. **Keep** `<%- include('../layouts/base', { title: 'Create account — Spendly', body }) %>` at end

### 6. `views/auth/login.ejs` — Modify

**Current form structure:**
- Similar pattern with `errorHtml` variable
- Form POSTs to `/login` (not implemented yet)

**Required changes:**
1. **Add success message display**: At top of auth-card, before form:
   ```ejs
   <% if (registered) { %>
     <div class="auth-success">Account created. Please sign in.</div>
   <% } %>
   ```
2. **Keep existing error display** for future login errors
3. **Escaping**: Use `<%= %>` for all user-supplied values
4. **Keep** `<%- include('../layouts/base', { title: 'Sign in — Spendly', body }) %>` at end

## Files Created (3)

| File | Layer | Responsibility |
|------|-------|----------------|
| `db/users.js` | DB | All SQL for users |
| `controllers/authController.js` | Controller | Validate, hash, call DB, render/redirect |
| `routes/auth.js` | Route | Map paths to controller functions |

## Files Modified (4)

| File | Change |
|------|--------|
| `server.js` | Change urlencoded to `extended: false`; remove inline auth routes; mount auth router |
| `views/auth/register.ejs` | Add confirm_password, error array, prefilled name/email, password hint |
| `views/auth/login.ejs` | Add success message for `?registered=1` |
| `CLAUDE.md` | Mark `POST /register` as Implemented in the "Implemented vs stub routes" table |

## Files Unchanged

| File | Reason |
|------|--------|
| `db/index.js` | Already correct singleton |
| `db/init.js` | Schema already matches; no seed changes |
| `package.json` | All dependencies already installed (`bcrypt`, `better-sqlite3`, `express-session`) |
| `views/layouts/base.ejs` | No layout changes needed |
| `views/landing.ejs`, `views/policy/*` | Unrelated |

## Verification Checklist (Definition of Done from Spec)

- [ ] App starts without errors and `GET /register` and `GET /login` still render, now served from `routes/auth.js`
- [ ] `server.js` contains no inline auth handlers and no SQL
- [ ] A valid submission creates one `users` row and redirects to `/login?registered=1`, where the success message shows
- [ ] The stored `password_hash` starts with `$2` and is not the plaintext password
- [ ] No session cookie marks the user as logged in after registering (verify `req.session` is untouched)
- [ ] Registering the same email again, including in a different letter case (e.g., `Test@Example.com` vs `test@example.com`), returns 409 and stores nothing
- [ ] Missing fields, a mismatched confirmation, an invalid email and a password under 8 characters each return 400 with a clear message
- [ ] After a failed submit, `name` and `email` are preserved and the password fields are empty
- [ ] A name such as `<script>alert(1)</script>` displays escaped (verify in template output)
- [ ] A name containing a quote or SQL fragment (e.g., `O'Reilly` or `'; DROP TABLE users;--`) is stored as plain text and breaks nothing (parameterized query)
- [ ] The registration form states the minimum password length before submission (hint visible)

## Test Commands

```bash
# 1. Start the app
npm run dev

# 2. Manual browser tests:
# - Visit http://localhost:3000/register — form loads, password hint visible
# - Submit empty form — 400, errors shown, no crash
# - Submit with password < 8 chars — 400, specific error
# - Submit with mismatched confirm_password — 400, specific error
# - Submit with invalid email — 400, specific error
# - Submit valid data — 302 redirect to /login?registered=1, success message shows
# - Submit same email again (any case) — 409, error shown, no duplicate row
# - Verify DB: node -e "const Database = require('better-sqlite3'); const db = new Database('expense_tracker.db'); console.log(db.prepare('SELECT email, password_hash FROM users').all());" — hash starts with $2b$

# 3. Verify no session after registration:
# - After redirect to /login, check cookies — no session with user_id
```

## Implementation Order (Recommended)

1. **`db/users.js`** — Foundation; no dependencies on other new files
2. **`controllers/authController.js`** — Depends on `db/users.js`
3. **`routes/auth.js`** — Depends on `controllers/authController.js`
4. **`server.js`** — Depends on `routes/auth.js` existing
5. **`views/auth/register.ejs`** — Depends on controller passing `errors`, `name`, `email`
6. **`views/auth/login.ejs`** — Depends on controller passing `registered` flag

## Risks / Gotchas

| Risk | Mitigation |
|------|------------|
| `express.urlencoded({ extended: true })` vs `false` | Spec requires `false` — changes how nested objects are parsed; `false` is safer |
| bcrypt async vs sync | Spec doesn't mandate; `bcrypt.hash` returns Promise in v5+, use `await` |
| SQLITE_CONSTRAINT_UNIQUE error code | Check `err.code === 'SQLITE_CONSTRAINT_UNIQUE'` only — no errno check |
| Case-insensitive email uniqueness | Lowercase email in controller BEFORE passing to DB; DB constraint is on lowercased value |
| Session not created | **Do not** call `req.session.regenerate()` or set `req.session.userId` — this step explicitly forbids it |
| `extended: false` means no nested body parsing | Our form is flat (`name`, `email`, `password`, `confirm_password`) so no impact |

## Notes for the Implementer

- Follow the **layering strictly**: routes → controllers → db. If you find yourself writing SQL in a controller or calling `res.render` in `db/users.js`, stop and move the code.
- The spec says **no session is created** on registration. This is intentional — login (Step 6) will create the session. The redirect to `/login?registered=1` is the only "handoff."
- `express-session` is installed but unused in this step. Do not add session logic prematurely.
- The `confirm_password` field is **only for validation** — never stored, never logged.
- All user-facing strings in the spec (error messages, success message) should be used verbatim for consistency.
- When in doubt about a requirement not explicitly stated in the spec, **ask** — do not invent behavior.