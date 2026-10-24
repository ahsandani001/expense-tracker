---
description: Create a spec file and feature branch for the next Spendly step
argument-hint: '--step=N --feature="Feature Title" (e.g., --step=5 --feature="Registration")'
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior developer spinning up a new feature for the Spendly expense tracker. Always follow the rules in CLAUDE.md.

User input: $ARGUMENTS

## Step 1 — Check working directory is clean

Run `git status` and check for uncommitted, unstaged, or untracked files. If any exist, stop immediately and tell the user to commit or stash changes before proceeding. DO NOT CONTINUE until the working directory is clean.

## Step 2 — Parse the arguments

Parse the arguments using the pattern: `--step=<number> --feature="<title>"

From $ARGUMENTS extract:

1. `step_number` — zero-padded to 2 digits: 2 → 02, 11 → 11

2. `feature_title` — human readable title in Title Case (exact as provided between quotes)

3. `feature_slug` — git and file safe slug
   - Convert to lowercase
   - Replace spaces and underscores with hyphens
   - Remove any non-alphanumeric characters except hyphens
   - Example: "Login and Logout" → "login-and-logout"

4. `branch_name` — format: `feature/<feature_slug>`
   - Example: `feature/registration`

If you cannot parse these from $ARGUMENTS using the --step/--feature pattern, ask the user
to clarify before proceeding.

## Step 3 — Check branch name is not taken

Run `git branch` to list existing branches.
If `branch_name` is already taken, append a number:
`feature/registration-01`, `feature/registration-02` etc.

## Step 4 — Switch to master and pull latest

Run:

```
git checkout master
# Check if origin exists before pulling
if git remote get-url origin &>/dev/null; then
  git pull origin master
else
  echo "Warning: No remote 'origin' found, skipping pull"
fi
```

## Step 5 — Create and switch to the feature branch

Run:

```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase

Read these files before writing the spec:

- `CLAUDE.md` — roadmap, conventions, schema
- `server.js` — existing routes and structure
- `db/index.js` — SQLite connection singleton
- `db/init.js` — schema creation functions
- All files in `.claude/specs/` — avoid duplicating existing specs

## Step 7 — Write the spec

Generate a spec document with this exact structure:

---

# Spec: <feature_title>

## Overview

One paragraph describing what this feature does and why
it exists at this stage of the Spendly roadmap.

## Depends on

Which previous steps this feature requires to be complete.

## Routes

Every new route needed:

- `METHOD /path` — description — access level (public/logged-in)

If no new routes: state "No new routes".

## Database changes

Any new tables, columns, or constraints needed.
Always verify against `db/init.js` before writing this.
If none: state "No database changes".

## Templates

- **Create:** list new EJS views in `views/` with their path
- **Modify:** list existing templates and what changes
- **All pages:** must use `<%- include('layouts/base', { title, body }) %>` at the end
- **Layout file:** `views/layouts/base.ejs`

## Files to change

Every file that will be modified.

## Files to create

Every new file that will be created.

## New dependencies

Any new npm packages. If none: state "No new dependencies".

## Rules for implementation

### Universal rules (apply to every step)

- No ORMs (Sequelize, Prisma, etc.)
- better-sqlite3 prepared statements with `?` placeholders only
- Use CSS variables — never hardcode hex values
- All pages include `views/layouts/base.ejs` via `<%- include('layouts/base', { title, body }) %>`
- DB logic belongs in `db/` only, never inline in route handlers
- Always use parameterized queries — never string interpolation in SQL
- Error handling: use `res.status(...).render(...)` for HTTP errors, not bare `res.send('error string')`

### Feature-specific rules

Populate this subsection based on the feature type:

- **Authentication features** (register, login, logout): Passwords hashed with bcrypt
- **Expense features** (add, edit, delete): Amounts stored as REAL; dates in YYYY-MM-DD format; category must be one of the fixed list (Food, Transport, Bills, Health, Entertainment, Shopping, Other)
- **Profile features**: No password change logic unless explicitly required
- **Any feature**: Never install new npm packages mid-feature without flagging it — keep `package.json` in sync

## Definition of done

A specific testable checklist. Each item must be
something that can be verified by running the app.

---

## Step 7.5 — Validate spec

Run a validation script that checks:

1. **Routes**: Every `METHOD /path` in "Routes" section either exists in `server.js` or is marked "new"
2. **Database**: Every table/column in "Database changes" exists in `db/init.js` or is marked "new"
3. **Templates**: Every "Create" path in "Templates" doesn't already exist; every "Modify" path does exist
4. **Dependencies**: Every package in "New dependencies" is NOT already in `package.json`

If any check fails, STOP and report the mismatch. Do not save the spec.

## Step 8 — Save the spec

Ensure the specs directory exists:
```
mkdir -p .claude/specs
```

Save to: `.claude/specs/<step_number>-<feature_slug>.md`

## Step 9 — Report to the user

Print a short summary in this exact format:

```
Branch:    <branch_name>
Spec file: .claude/specs/<step_number>-<feature_slug>.md
Title:     <feature_title>
```

Then tell the user:
"Review the spec at `.claude/specs/<step_number>-<feature_slug>.md`
then enter Plan Mode with Shift+Tab twice to begin implementation."

Do not print the full spec in chat unless explicitly asked.
