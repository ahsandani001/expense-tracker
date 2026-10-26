# Spec: User Registration

Oct 25, 2026 · @Ahsan

## Overview

Implement `POST /register` so a visitor can create an account from the existing registration form. The handler validates input, hashes the password with bcrypt, stores the user, and redirects to `/login` with a success message. No authenticated session is created in this step. This step also introduces the routes, controllers and db layering that every later feature follows, so the existing `GET /register` and `GET /login` routes move into that structure here.

## Depends on

- Step 1, Database Setup: the `users` table exists with a unique `email` and a `password_hash` column.
- The registration page (`GET /register`) already renders.

## Routes

| Method and path  | Description                                                                                                                   | Access |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| `GET /register`  | Renders the registration form. Existing route, moved into `routes/auth.js`.                                                   | public |
| `GET /login`     | Renders the login form. Shows a success message when `?registered=1` is present. Existing route, moved into `routes/auth.js`. | public |
| `POST /register` | Validates input, creates the user, redirects to `/login?registered=1`. New.                                                   | public |

On success, no session is created and `req.session` is not touched. A query parameter carries the success message so the redirect needs no flash storage.

## Database changes

No database changes. The `users` table from Step 1 already has everything this step uses; confirm against `db/init.js` before implementing.

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

Email uniqueness is enforced by the UNIQUE constraint. The application lowercases emails before storing them, so the constraint compares normalized values.

## Templates

- **Modify `views/auth/register.ejs`:** add a `confirm_password` field, a hint stating the minimum password length (8 characters), an error list, and prefilled `name` and `email` values after a failed submit. The password fields are never prefilled.
- **Modify `views/auth/login.ejs`:** show a success message ("Account created. Please sign in.") when the controller passes `registered: true`.
- **Include path:** every page ends with the base layout include already used in the project, with the path written relative to the view file. From `views/auth/`, that is `../layouts/base`. Match how `login.ejs` does it today.
- **Output escaping:** render all user-supplied values with `<%= %>`, never `<%- %>`.

## Files to change and create

| File                            | Action | Responsibility                                                                                                                                             |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/auth.js`                | Create | URL, method and middleware only. Defines `GET /register`, `GET /login`, `POST /register` and calls controller functions.                                   |
| `controllers/authController.js` | Create | Reads input, normalizes and validates it, hashes the password, calls the db module, then renders or redirects.                                             |
| `db/users.js`                   | Create | All SQL for users: `createUser` and `findUserByEmail`, using prepared statements.                                                                          |
| `server.js`                     | Change | Remove the inline `GET /register` and `GET /login` handlers, make sure `express.urlencoded({ extended: false })` is configured, and mount the auth router. |
| `views/auth/register.ejs`       | Change | See Templates.                                                                                                                                             |
| `views/auth/login.ejs`          | Change | See Templates.                                                                                                                                             |

## New dependencies

None. `bcrypt`, `better-sqlite3` and `express-session` are already installed. `express-session` is not used in this step because no session is created.

## Rules for implementation

### Universal rules

- No ORMs (Sequelize, Prisma and similar).
- better-sqlite3 prepared statements with `?` placeholders only. Never build SQL by string interpolation.
- Use CSS variables. Never hardcode hex values.
- Layering: routes call controllers, controllers call db modules. SQL appears only in `db/`, and routes contain no logic.
- Unexpected errors use `res.status(...).render(...)`, never a bare `res.send('error')`.

### Input handling

- Trim `name` and `email`. Lowercase `email` before validating and storing.
- `name`: required, 1 to 100 characters.
- `email`: required, valid email format, at most 254 characters.
- `password`: required, 8 to 72 characters (bcrypt ignores bytes past 72).
- `confirm_password` must equal `password`.

### Password and storage

- Hash with `bcrypt` at cost factor 12, set as a named constant.
- Never log, render or return a password or its hash.
- Insert with a single `INSERT`. Treat `SQLITE_CONSTRAINT_UNIQUE` as a duplicate email instead of checking first and inserting after.

### Responses

| Case               | Status | Behavior                                                                                                             |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Validation failure | 400    | Re-render the form with error messages, `name` and `email` preserved, passwords empty.                               |
| Duplicate email    | 409    | Re-render the form with a clear message and `name` and `email` preserved.                                            |
| Success            | 302    | Redirect to `/login?registered=1`. Do not call `req.session.regenerate()` and do not set any user id in the session. |
| Unexpected error   | 500    | Render an error view with a generic message.                                                                         |

### Security

- Escape all user output in templates (see Templates).
- CSRF protection is out of scope here. Add it in the step that introduces authenticated sessions.

## Definition of done

- [ ] The app starts without errors and `GET /register` and `GET /login` still render, now served from `routes/auth.js`.
- [ ] `server.js` contains no inline auth handlers and no SQL.
- [ ] A valid submission creates one `users` row and redirects to `/login?registered=1`, where the success message shows.
- [ ] The stored `password_hash` starts with `$2` and is not the plaintext password.
- [ ] No session cookie marks the user as logged in after registering.
- [ ] Registering the same email again, including in a different letter case, returns 409 and stores nothing.
- [ ] Missing fields, a mismatched confirmation, an invalid email and a password under 8 characters each return 400 with a clear message.
- [ ] After a failed submit, `name` and `email` are preserved and the password fields are empty.
- [ ] A name such as `<script>alert(1)</script>` displays escaped.
- [ ] A name containing a quote or SQL fragment is stored as plain text and breaks nothing.
- [ ] The registration form states the minimum password length before submission.
