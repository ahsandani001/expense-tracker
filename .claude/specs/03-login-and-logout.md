# Spec: User Login and Logout

Oct 27, 2026 · @Ahsan

## Overview

Implement user login and logout for Spendly.

The `POST /login` handler will validate the submitted email and password, look the user up by email through the database module, and verify the password against the stored bcrypt hash. On success it will create an authenticated session and redirect to `/`.

The step also moves `GET /logout` from the inline handler in `server.js` into the auth router/controller layer, destroys the session, and redirects to `/` (unchanged from the existing behavior).

This step builds on Step 2 (user registration) and introduces the authenticated session that later steps (profile, expenses) depend on.

## Depends on

- Step 2, User Registration: the `users` table exists with a unique `email` and a `password_hash` column, and `POST /register` stores a bcrypt hash via `db/users.js`.
- The login page (`GET /login`) already renders via `routes/auth.js`.

## Routes

| Method and path | Description                                                                                                                             | Access |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `GET /login`    | Renders the login form. Shows a success message when `?registered=1` is present. Existing route, moved into `routes/auth.js` in Step 2. | public |
| `POST /login`   | Validates input, verifies the password with bcrypt, creates an authenticated session, redirects to `/`. New.                            | public |
| `GET /logout`   | Destroys the session, redirects to `/`. New location — moves from `server.js` into `routes/auth.js`.                               | public |

## Database changes

No database changes. The `users` table from Step 1 already has everything this step uses; confirm against `db/init.js` before implementing.

## Templates

- **Create:** None new.
- **Modify `views/auth/login.ejs`:** No changes required — the existing template already supports error list rendering via `errors`, preserves `email` via `value="${h(email)}"`, and leaves the password field empty after a failed submit.

## Files to change and create

| File                            | Action | Responsibility                                                                                       |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `routes/auth.js`                | Change | URL, method and middleware only. Adds `POST /login` and `GET /logout`; maps to controller functions. |
| `controllers/authController.js` | Change | Adds `postLogin` and `getLogout`. Reads and validates input, calls the db module, then renders or redirects. |
| `server.js`                     | Change | Remove the inline `GET /logout` handler, keep the auth router mounted at `/`.                        |
| `views/auth/login.ejs`          | Change | See Templates.                                                                                       |

## New dependencies

None. `bcrypt` and `express-session` are already installed.

## Rules for implementation

### Universal rules (apply to every step)

- No ORMs (Sequelize, Prisma, etc.)
- better-sqlite3 prepared statements with `?` placeholders only. Never build SQL by string interpolation.
- Use CSS variables. Never hardcode hex values.
- All pages include `views/layouts/base.ejs` via `<%- include('layouts/base', { title, body }) %>`
- DB logic belongs in `db/` only, never inline in route handlers
- Always use parameterized queries — never string interpolation in SQL
- Error handling: use `res.status(...).render(...)`, never a bare `res.send('error')`

### Input handling

- Trim `email`; lowercase it before validating and looking up.
- `email`: required, valid email format, at most 254 characters.
- `password`: required, 8 to 72 characters (bcrypt ignores bytes past 72).

### Password and storage

- Hash with bcrypt at cost factor 12, set as a named constant.
- Use `bcrypt.compare` for login verification. Never re-hash on login.

### Responses

| Case                | Status | Behavior                                                                                                                             |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Validation failure  | 400    | Re-render the form with error messages, preserve `email`, clear the password.                                                        |
| Invalid credentials | 401    | Re-render the form with a generic error ("Invalid email or password.") and preserve `email`. Do not reveal whether the email exists. |
| Success             | 302    | Redirect to `/`. Create an authenticated session (store the user id only; do not store the password hash).                           |
| Logout              | 302    | Destroy the session, redirect to `/`.                                                                                                |
| Unexpected error    | 500    | Render an error view with a generic message.                                                                                         |

### Security

- Escape all user output in templates (see Templates).
- Never log, render or return a password or its hash.
- CSRF protection is out of scope in Step 3; add it in the step that introduces authenticated sessions.

## Definition of done

- [ ] The app starts without errors and `GET /login` is served from `routes/auth.js`.
- [ ] A valid login (e.g. `demo@spendly.com` / `password123`) creates an authenticated session and redirects to `/`.
- [ ] A wrong password or unknown email returns 401 and shows a clear error, without creating a session.
- [ ] `GET /logout` destroys the session and redirects to `/`.
- [ ] `server.js` contains no inline auth handlers and no SQL.
