# CLAUDE.md

## Project overview

Spendly is a lightweight personal expense tracker built with Node.js, Express, and SQLite.

---

## Architecture

Target structure. Items marked "Step 2" are created by the User Registration step; do not assume they exist before then.

```
expense-tracker/
├── server.js                  # App setup (middleware, session, static, view engine), mounts routers,
│                              #   plus existing routes not yet migrated (see "Existing routes")
├── routes/                    # Step 2 — routers only: path, method, middleware, controller call
│   └── auth.js                # GET /register, GET /login, POST /register
├── controllers/               # Step 2 — request logic: validate input, call db, render or redirect
│   └── authController.js
├── db/
│   ├── index.js               # SQLite connection singleton (better-sqlite3, WAL, FK on)
│   ├── init.js                # Schema creation and seeding ONLY: initDb(), seedDb()
│   └── users.js               # Step 2 — all SQL for users (createUser, findUserByEmail, ...etc)
├── views/
│   ├── layouts/
│   │   └── base.ejs           # Shared layout — all pages must include this
│   ├── landing.ejs            # Landing page
│   ├── auth/
│   │   ├── login.ejs          # Login form
│   │   └── register.ejs       # Register form
│   └── policy/
│       ├── terms.ejs          # Terms of Service
│       └── privacy.ejs        # Privacy Policy
├── public/
│   ├── css/
│   │   └── style.css          # Global styles
│   └── js/
│       └── main.js            # Vanilla JS only
├── .claude/
│   ├── commands/              # Custom slash commands
│   └── specs/                 # One spec per step, e.g. 02-user-registration.md
├── package.json
└── .env                       # Not tracked — needs SESSION_SECRET
```

### Layering

Every request flows **route → controller → db module**.

| Layer       | Location                          | Does                                                          | Never does                         |
| ----------- | --------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Route       | `routes/<feature>.js`             | Maps path + method (+ middleware) to a controller function    | Logic, validation, SQL             |
| Controller  | `controllers/<feature>Controller.js` | Reads and validates input, calls db functions, renders or redirects | SQL                         |
| DB module   | `db/<entity>.js`                  | All SQL, prepared statements, returns plain data              | Rendering, `req`/`res`             |

**Where things belong:**

- New routes → a router file in `routes/`, mounted in `server.js`. Do not add new routes directly to `server.js`.
- Request handling logic → `controllers/`
- DB logic → a per-entity module in `db/` (`db/users.js`, `db/expenses.js`). **Never in `db/init.js`** (schema and seed only), and never inline in routes or controllers.
- New pages → new `.ejs` file that includes `layouts/base`
- Page-specific styles → `public/css/style.css`, not inline `<style>` tags

### Existing routes

`GET /register` and `GET /login` move into `routes/auth.js` in Step 2. The other existing routes (`/`, `/terms`, `/privacy`, `/logout`) stay in `server.js` until a step explicitly moves them.

---

## Code style

- JavaScript: 2-space indent, `const`/`let` only (never `var`), semicolons, CommonJS (`require` / `module.exports`) — the project is not ESM
- Templates: EJS with the include-with-body pattern — every page ends with `<%- include('layouts/base', { title, body }) %>`. The include path is relative to the view file (from `views/auth/` it is `../layouts/base`); match the existing pages
- User-supplied values in templates are rendered with `<%= %>` (escaped), never `<%- %>`
- Routes: one line each — map to a controller function, nothing else
- Controllers: one responsibility per function — validate, call db, render or redirect
- DB queries: always use parameterized queries (`?` placeholders) — never string interpolation in SQL
- Error handling: use `res.status(...).render(...)` for HTTP errors, not bare `res.send('error string')`

---

## Tech constraints

- **Express only** — no Fastify, no Koa, no NestJS
- **SQLite via better-sqlite3 only** — no PostgreSQL, no Sequelize/Prisma ORM, no external DB
- **EJS only** — no Pug, no Handlebars, no Nunjucks
- **Vanilla JS only** — no React, no Vue, no jQuery, no npm frontend packages
- **No new npm packages** — work within `package.json` as-is unless explicitly told otherwise
- Node.js 18+ assumed — modern JS syntax is fine

---

## Spec-driven workflow

- Each step has a spec in `.claude/specs/`. Implement against the active spec.
- If this file and the active spec conflict, stop and ask instead of choosing one.
- If a requirement is missing or ambiguous in the spec, ask. Do not invent behavior.

---

## Subagent Policy

- Always use a builtin explore subagent for codebase exploration before implementing any new feature
- Always use a subagent to verify test results after any implementation
- When asked to plan, delegate codebase research to a subagent before presenting the plan
- Always use a builtin plan subagent in plan mode

---

## Commands

```bash
# Setup
npm install

# Create tables (run once, safe to re-run)
npm run init-db

# Run dev server with auto-reload (port 3000)
npm run dev

# Run production server
npm start
```

---

## Implemented vs stub routes

| Route                       | Status                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `GET /`                     | Implemented — renders `landing.ejs`                                 |
| `GET /register`             | Implemented — renders `auth/register.ejs` (moves to `routes/auth.js` in Step 2) |
| `POST /register`            | Implemented — Step 2                                                |
| `GET /login`                | Implemented — renders `auth/login.ejs` (moves to `routes/auth.js` in Step 2) |
| `POST /login`               | Not implemented — Step 3                                            |
| `GET /logout`               | Implemented — destroys session, redirects to `/`                    |
| `GET /terms`                | Implemented — renders `policy/terms.ejs`                            |
| `GET /privacy`              | Implemented — renders `policy/privacy.ejs`                          |
| `GET /profile`              | Stub — Step 4                                                       |
| `GET /expenses/add`         | Stub — Step 7                                                       |
| `GET /expenses/:id/edit`    | Stub — Step 8                                                       |
| `GET /expenses/:id/delete`  | Stub — Step 9                                                       |

**Do not implement a stub route unless the active task explicitly targets that step.**

---

## Warnings and things to avoid

- **Never hardcode URLs** in templates — keep every internal link in sync with the routes defined in `routes/` and `server.js`
- **Never put DB logic in routes, controllers, or `db/init.js`** — it belongs in per-entity modules in `db/`
- **Never add new routes directly to `server.js`** — add them to a router in `routes/`
- **Never install new packages** mid-feature without flagging it — keep `package.json` in sync
- **Never use JS frameworks** — the frontend is intentionally vanilla
- **`routes/`, `controllers/`, and `db/users.js` are created in Step 2; `models/` and `middleware/` do not exist** — do not create or assume them until a step calls for them
- **FK enforcement is set in `db/index.js`** — `PRAGMA foreign_keys = ON` runs once on the singleton connection; set it again if a second connection is ever created
- **Session secret defaults to `'dev-secret-change-me'`** — set `SESSION_SECRET` in `.env` before running anywhere real
- **`express-session` is installed but no login session exists until the login step** — registration does not create a session
- The app runs on **port 3000** unless the `PORT` env var says otherwise — don't hardcode a different port