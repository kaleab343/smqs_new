# SMQS (Smart Queue Management System)

A full-stack, containerized appointment and queue management system:
- Frontend: Next.js (App Router) + TypeScript + Tailwind + Radix UI
- Backend: PHP 8.2 (Apache) with a lightweight MVC-style API
- Database: MySQL 8 with Dockerized initialization

This document provides end-to-end installation instructions (Docker and Local), environment configuration, a deep dive into the codebase, developer workflows, and multiple diagrams (architecture, request flow, and an ERD sketch) for clarity.


---
## Table of Contents

1. Features at a glance
2. Architecture overview (ASCII diagram)
3. Request flow (frontend to API to DB)
4. Entity-Relationship Diagram (ERD) sketch
5. Requirements
6. Quick start
7. Environment configuration
8. Running with Docker (recommended)
9. Running locally (frontend only, or with local PHP)
10. Testing and coverage
11. Project structure tour (folder-by-folder)
12. Developer workflows and scripts
13. Configuration deep-dive
14. Deployment guidance
15. Troubleshooting and FAQ
16. Contributing and code style
17. Roadmap and TODOs
18. License


---
## 1) Features at a glance

- Role-based portals: Admin, Doctor, Patient, Receptionist, Super-Admin
- Queue management and appointment lifecycle (create, update, complete)
- Analytics for administrators
- Modern, accessible UI (Radix UI + Tailwind)
- Jest-based tests for core utilities
- Docker-first local dev with MySQL auto-initialization
- Clear separation of concerns (Next.js app, PHP API, MySQL)


---
## 2) Architecture overview

High-level architecture: Next.js frontend talks to a PHP API which in turn persists to MySQL. All three are optional to run locally; Docker Compose orchestrates them for you.

```
          ┌───────────────────┐                ┌──────────────────────┐
          │    Browser /      │  HTTPS/HTTP    │    Next.js (web)     │
          │    Client UI      ├────────────────►  Container (port 3000)│
          └───────────────────┘                └─────────┬────────────┘
                                                         │
                                                         │ HTTP (JSON)
                                                         ▼
                                              ┌──────────────────────┐
                                              │     PHP API          │
                                              │  Apache Container    │
                              P                │     (port 8080)      │
                                              └─────────┬────────────┘
                                                        │
                                                        │ PDO (MySQL)
                                                        ▼
                                              ┌──────────────────────┐
                                              │      MySQL 8         │
                                              │  DB Container (3306) │
                                              └──────────────────────┘
```

Notes:
- Frontend environment variables determine the API base URL.
- Docker Compose wires the network (smqs_net) and service dependencies (API waits for DB health).


---
## 3) Request flow (frontend to API to DB)

```
User Action (UI) ──► Next.js Route/Component ──► Fetch/POST to /api/php/... (Next.js route handlers)
                     │                                  │
                     │                                  └─► Bridges call to PHP endpoints (db_samp/api)
                     │                                     (e.g., /appointments, /users, /queue)
                     │
                     └─► Updates UI state (context/hooks) and renders UI components

PHP API (Apache) ──► Router.php resolves controller ──► Controller invokes Model ──► Database (PDO)
                                                └─► Response (JSON) sent back to frontend
```

Key points:
- The Next.js app contains server-side route handlers under `app/api/php/.../route.ts` that forward or proxy to PHP endpoints.
- The PHP API follows a simple MVC-ish pattern (controllers -> models -> DB), returning JSON via a `Response` utility.


---
## 4) ERD (Entity-Relationship Diagram) sketch

This is a conceptual sketch based on the PHP models and controllers included. Exact columns may vary based on `docker/db/init/01_schema.sql` and `db_samp/api/models/*`.

```
+------------------+        +------------------+        +------------------+
|      users       |        |   appointments   |        |      doctors     |
+------------------+        +------------------+        +------------------+
| id (PK)          |   1..* | id (PK)          | *..1   | id (PK)          |
| name             |<-------| user_id (FK->users.id)    | name             |
| email            |        | doctor_id (FK->doctors.id)| specialty        |
| role             |        | status           |        | status           |
| created_at       |        | scheduled_time   |        | created_at       |
+------------------+        | completed_at     |        +------------------+
                            | notes            |
                            +------------------+
                                 |
                                 | 0..*
                                 v
                           +------------------+
                           |   queue_entries  |
                           +------------------+
                           | id (PK)          |
                           | appointment_id   |
                           | position         |
                           | status           |
                           | created_at       |
                           +------------------+

+---------------------------+
|   customer_satisfaction   |
+---------------------------+
| id (PK)                   |
| appointment_id (FK)       |
| rating (1..5)             |
| comment                   |
| created_at                |
+---------------------------+
```


---
## 5) Requirements

- Node.js 20+
- Docker and Docker Compose (if using containers)
- MySQL 8 (provided via Docker; optional for local manual setup)


---
## 6) Quick start

Choose one of the two approaches:

- Docker (recommended):
  1) Install Docker & Docker Compose.
  2) From the `SMQS` folder, run: `npm run docker:up` (equivalent to `docker compose up --build`)
  3) Web: http://localhost:3000 | API: http://localhost:8080 | DB: localhost:3306
  4) Stop with `npm run docker:down` and tail logs with `npm run docker:logs`

- Local (frontend-only or with self-hosted PHP):
  1) Install Node.js 20+.
  2) `npm install`
  3) `npm run dev` then open http://localhost:3000
  4) Configure `NEXT_PUBLIC_PHP_API_BASE` to point at your PHP API if you aren't using Docker.


---
## 7) Environment configuration

Frontend uses these variables:

- `NEXT_PUBLIC_API_BASE_URL`: Used by Dockerized web to reach the API (default in compose: `http://localhost:8080`).
- `NEXT_PUBLIC_PHP_API_BASE`: Used by `lib/php-api-config.ts` when directly calling the PHP endpoints.

Create `.env.local` for local development (not committed):

```
# If you run API locally via Apache/XAMPP and serve db_samp/api
NEXT_PUBLIC_PHP_API_BASE=http://localhost/db_samp/api

# Optional: if you want to mimic Docker behavior locally
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

MySQL (Docker) defaults in `docker-compose.yml`:

- DB name: `smart_queue_management`
- User: `smqs`
- Password: `smqs`
- Root password: `root`

You can override with environment variables: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`.


---
## 8) Running with Docker (recommended)

1) Build and start:

```
docker compose up --build
```

2) Access services:
- Web (Next.js): http://localhost:3000
- API (PHP/Apache): http://localhost:8080
- DB (MySQL): localhost:3306

3) Schema initialization
- `docker/db/init/01_schema.sql` is executed on first container start to create the necessary schema and seed data.

4) Logs and lifecycle:
- View logs: `npm run docker:logs`
- Stop: `npm run docker:down`
- Rebuild after changes: `npm run docker:up`

5) Changing ports
- Edit `docker-compose.yml` service `ports` mappings if 3000/8080/3306 conflict with your system.


---
## 9) Running locally (without Docker)

Frontend:

```
npm install
npm run dev
```

Open http://localhost:3000.

Point the frontend to your API by setting `NEXT_PUBLIC_PHP_API_BASE` in `.env.local`. Example:

```
NEXT_PUBLIC_PHP_API_BASE=http://127.0.0.1/code_(1)/db_samp/api/index.php
```

The helper in `lib/php-api-config.ts` normalizes trailing slashes and safely encodes parentheses for some Apache setups.

Production build locally:

```
npm run build
npm start
```

Optional: Running the PHP API locally without Docker
- Serve the `db_samp/api` directory via Apache (e.g., XAMPP). Ensure `pdo_mysql` is enabled.
- Configure DB connection in `db_samp/api/config.php` to point at your MySQL instance.
- Import `db_samp/api/db.sql` or mirror `docker/db/init/01_schema.sql` into your local DB.


---
## 10) Testing and coverage

Jest configuration is in `jest.config.json`. Tests currently focus on utilities in `lib/`.

- Run tests:
```
npm run test
```

- Watch mode:
```
npm run test:watch
```

- Coverage report:
```
npm run coverage
```

- Coverage thresholds are defined globally at 50% branches/functions/lines/statements. Adjust as needed.


---
## 11) Project structure tour

Top-level files:

- `app.js` – Large JS file containing shared logic/utilities. Legacy-friendly; can be incrementally migrated to TS.
- `components.json` – UI component builder/registry configuration.
- `DATABASE.md` – Database notes.
- `docker-compose.yml` – Orchestrates db/api/web services and network.
- `Dockerfile.api` – PHP 8.2 Apache image, enabling pdo_mysql, mod_rewrite, headers.
- `Dockerfile.web` – Multi-stage Next.js build and runtime using Node 20 alpine.
- `index.html` – Optional static page for local testing.
- `jest.config.json` / `jest.setup.js` – Jest test config and setup utilities.
- `middleware.ts` – Next.js middleware (auth, redirects, headers).
- `next.config.mjs` – Next.js build config; image optimization disabled, TS errors ignored on build.
- `package.json` – Dependencies and scripts (build/dev/start/lint).
- `styles.css` – Additional global styles.
- `TESTING.md` – Extra guidance on tests.
- `tsconfig.json` – TypeScript config with path alias `@/*` to project root.

Key directories and notable files:

- `app/` (Next.js App Router)
  - `globals.css` – Global app styles loaded by the App Router.
  - `page.tsx` – Root route that redirects to `/auth/login`.
  - Role-based sub-apps:
    - `admin/` – Analytics, dashboard, settings, and user management UIs.
    - `doctor/` – Doctor dashboards and patient queue views.
    - `patient/` – Patient dashboard, queue status, and appointments.
    - `receptionist/` – Receptionist dashboard, check-in flow, appointment mgmt.
    - `super-admin/` – Super manager tools, security, maintenance.
  - Auth flows:
    - `auth/login` and `auth/signup` – Authentication screens and layout.
  - API bridge:
    - `app/api/php/.../route.ts` – Next.js route handlers that act as a thin proxy to PHP endpoints.

- `components/`
  - Providers: `notification-provider.tsx`, `theme-provider.tsx`.
  - `ui/`: A comprehensive UI library (accordion, dialog, input, form, table, toast, etc.) built on Radix.

- `hooks/`
  - Shared hooks: `use-mobile.ts`, `use-toast.ts`.

- `lib/`
  - `auth-context.tsx`, `auth-utils.ts` – Client-side auth management.
  - `db-types.ts` – Shared TypeScript types.
  - `notifications.ts` – Notification helpers.
  - `php-api-config.ts` – Helper to compute base URL to the PHP API.
  - `queue-context.tsx`, `queue-engine.ts` – Queue logic and context provider for UI.
  - `storage.ts` – Local/session storage helpers.
  - `utils.ts` – General-purpose utilities.

- `public/` – Static assets: icons, placeholders, images.

- `styles/` – Global CSS for the App Router (e.g., `styles/globals.css`). If you have this file open, it is the primary stylesheet applied app-wide.

- `db_samp/api/` (PHP MVC-style API)
  - `controllers/` – Entry points for different domains (Appointments, Auth, Doctors, Queue, Customer Satisfaction, Meta).
  - `core/` – Foundation: `Database.php` (PDO), `Jwt.php`, `Response.php` (JSON encoding), `Router.php`.
  - `models/` – Data mapping: `AppointmentModel.php`, `DoctorModel.php`, `PatientModel.php`, `QueueModel.php`, `UserModel.php`.
  - Root files: `config.php`, `index.php`, `install.php`, `.htaccess`.
  - `db.sql` – Standalone SQL for manual setups.

- `docker/db/init/` – Database initialization scripts executed at container startup.

- `__tests__/`
  - `notifications.test.ts`, `queue-engine.test.ts`, `storage.test.ts`.


---
## 12) Developer workflows and scripts

- Local dev server (Next.js): `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Lint: `npm run lint`
- Tests:
  - Direct: `npx jest`
  - Suggested: `npm run test`, `npm run test:watch`, `npm run coverage`

Git branching model (suggested):
- `main` – stable
- feature branches – `feat/<scope>`
- fix branches – `fix/<scope>`
- chore/refactor branches – `chore/<scope>` or `refactor/<scope>`

Commit message convention (suggested):
- `feat: add X`
- `fix: correct Y`
- `chore: update tool Z`
- `refactor: simplify A`
- `test: add tests for B`


---
## 13) Configuration deep-dive

Next.js (frontend):
- `next.config.mjs` sets:
  - `typescript.ignoreBuildErrors: true` (allows production build to succeed with TS errors; consider turning off for stricter CI)
  - `images.unoptimized: true` (disables Next Image optimizer; good for static hosts)

TypeScript:
- `tsconfig.json` uses `module: esnext` and `moduleResolution: bundler`; includes a path alias `@/*` -> project root.

Jest:
- `jest.config.json` uses `ts-jest` with a `jsdom` environment. Includes `jest.setup.js` and a global coverage threshold.

PHP API:
- `Dockerfile.api` installs PDO MySQL, enables `rewrite` and `headers`, and copies `db_samp/api/` to Apache root.
- `db_samp/api/core/Database.php` centralizes PDO connection parameters (read from env or config).
- `db_samp/api/core/Router.php` dispatches requests to controllers based on routes.
- `db_samp/api/core/Response.php` standardizes JSON structure and status codes.

Docker Compose:
- Services: `db` (MySQL), `api` (PHP Apache), `web` (Next.js)
- Network: `smqs_net` for inter-service communication
- Healthchecks: MySQL is probed; `api` waits for DB health


---
## 14) Deployment guidance

Frontend (Next.js):
- Vercel, Netlify, or a Node host can run the built app.
- Docker-based deployment: build the `Dockerfile.web` image and run with `NODE_ENV=production`.
- Ensure environment variable `NEXT_PUBLIC_API_BASE_URL` points to the deployed API URL.

Backend (PHP API):
- Any PHP 8.2 host with Apache (or Nginx + PHP-FPM) can serve `db_samp/api`.
- Ensure `pdo_mysql` is enabled.
- Set DB credentials via environment variables or `config.php`.
- Configure `.htaccess` and mod_rewrite for clean URLs.

Database (MySQL):
- For managed DBs, import `db_samp/api/db.sql` or replicate `docker/db/init/01_schema.sql`.
- Harden users and passwords; avoid using default credentials in production.

Docker (Full stack):
- Build and push images for `web` and `api` to your registry.
- Provide environment variables at runtime (API URL, DB credentials).
- Use cloud DB or a managed MySQL service for production-grade reliability.


---
## 15) Troubleshooting and FAQ

Q: Frontend cannot reach API in Docker.
- A: Verify `NEXT_PUBLIC_API_BASE_URL` is `http://localhost:8080` (or the correct host if remote). Ensure `api` container is healthy (`docker compose ps` and `docker compose logs api`).

Q: MySQL connection errors.
- A: Check that the `db` container is healthy and accepting connections. Validate credentials and confirm `docker/db/init/01_schema.sql` ran on first start.

Q: Port conflicts on 3000/8080/3306.
- A: Change port mappings in `docker-compose.yml` or stop conflicting services.

Q: Typescript build fails in CI, but build works locally.
- A: Remember `next.config.mjs` sets `ignoreBuildErrors: true` during build. In CI, run `tsc --noEmit` separately if you want strict type checks.

Q: How do I point the frontend to a non-Docker PHP API during local dev?
- A: Create `.env.local` with `NEXT_PUBLIC_PHP_API_BASE=<your-url>`. The helper `lib/php-api-config.ts` will normalize it.

Q: How do role-based pages render?
- A: Each role has its own layout and pages under `app/<role>/...`. The root route redirects to `/auth/login`.


---
## 16) Contributing and code style

- Fork and clone the repo.
- Create a feature branch.
- Add tests if you change core logic in `lib/`.
- Run `npm run lint` and `npx jest` locally before PRs.
- Keep UI components composable and accessible; follow Radix UI best practices.
- Prefer functional components and hooks; avoid large component side effects.


---
## 17) Roadmap and TODOs

Short-term ideas:
- Add comprehensive e2e tests (e.g., Playwright) for critical flows (login, create appointment, queue actions).
- Strengthen auth flows (integrate real JWT exchange between Next.js and PHP API).
- Improve error handling and empty states across UI pages.
- Expand analytics and admin dashboards.

Longer-term:
- Migrate parts of `app.js` into TypeScript modules under `lib/`.
- Introduce a typed API client layer with Zod validation of responses.
- Add caching (React Query or server-side caching for API routes).
- Harden security and add rate limiting for sensitive endpoints.


---
## 18) License

This repository may include third‑party components under their respective licenses. See individual files and dependencies for details.


---
# Appendices

A) Detailed role capabilities (suggested baseline)
- Admin: manage users, view analytics, manage appointments and queues
- Doctor: view assigned appointments/queues, update status, complete appointments
- Patient: book/manage appointments, view queue position
- Receptionist: check-in, manage appointments and queues
- Super-Admin: system-level configuration, maintenance, security

B) UI component glossary (selected)
- Accordion, Alert Dialog, Dialog, Drawer, Dropdown Menu, Form, Input, Select, Table, Tabs, Toast, Tooltip, etc. (see `components/ui/`)

C) Request examples (pseudo)
- GET appointments:
```
fetch('/api/php/appointments', { method: 'GET' })
```
- POST create appointment:
```
fetch('/api/php/appointments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, doctorId, scheduled_time })
})
```

D) Expanded architecture diagram (with internal folders)
```
Client (Browser)
  │
  ▼
Next.js (App Router)
  ├─ app/ (routes)
  │   ├─ page.tsx (redirect)
  │   ├─ auth/*
  │   ├─ admin/* doctor/* patient/* receptionist/* super-admin/*
  │   └─ api/php/* (bridge routes)
  ├─ components/* (providers, UI)
  ├─ hooks/*
  └─ lib/* (auth, queue, storage, utils)
  │
  └── Calls HTTP ► PHP API

PHP API (db_samp/api)
  ├─ controllers/* (Appointments, Doctors, Users, Queue, CustomerSatisfaction, Meta)
  ├─ core/* (Database, Jwt, Response, Router)
  ├─ models/* (AppointmentModel, DoctorModel, PatientModel, QueueModel, UserModel)
  └─ index.php, config.php, install.php, .htaccess
  │
  └── Talks to ► MySQL (PDO)

MySQL (docker/db/init)
  └─ 01_schema.sql (schema + seed)
```

E) Minimal ERD fields (example) – refer to schema file for exact columns
- users: id, name, email, role, password_hash, created_at
- doctors: id, name, specialty, status, created_at
- appointments: id, user_id, doctor_id, scheduled_time, status, completed_at, notes
- queue_entries: id, appointment_id, position, status, created_at
- customer_satisfaction: id, appointment_id, rating, comment, created_at

F) Operational tips
- Clear volumes if schema changes drastically: `docker compose down -v`
- Recreate only one service: `docker compose up --build web` or `... api`
- Tail logs of a single service: `docker compose logs -f api`
- Check DB health: `docker compose ps` then `docker compose logs db`

G) Security notes
- Never commit secrets
- Use prepared statements (PDO) and validate input on both sides
- Consider CSRF tokens for state-changing requests
- Limit roles’ permissions server-side

H) Performance notes
- Avoid N+1 queries in API models; prefer joins where appropriate
- Cache static lookups; use HTTP caching headers where possible
- Defer non-critical JS; use React Suspense and loading.tsx patterns (already present in some routes)

I) Accessibility and UX
- Ensure keyboard navigation for dialogs/menus
- Provide status messages via toasts/snackbar (see notifications)
- Use proper aria-* attributes from Radix UI components

J) Monitoring & Observability (future)
- Add server logs with structured output
- Track frontend errors (Sentry/LogRocket)
- Add health endpoints and uptime checks

K) Backup & Restore
- Use `SMQS/app/api/php/admin/backup/route.ts` endpoints to orchestrate backups via the PHP API if available
- Ensure DB dumps include necessary tables and relationships

L) Migrations (future)
- Introduce a PHP migration runner, or use SQL files with versioning and an applied-migrations table

M) CI/CD (example)
- Lint + Typecheck: `npm run lint` and `tsc --noEmit`
- Tests: `npx jest --ci --coverage`
- Build Docker images and push to registry
- Deploy via IaC (Terraform, Pulumi) or platform-native pipelines

N) Example .env files

.env.local (frontend dev):
```
NEXT_PUBLIC_PHP_API_BASE=http://localhost/db_samp/api
# Optional, only if using the bridge variable in code
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Docker runtime (compose):
```
DB_ROOT_PASSWORD=root
DB_NAME=smart_queue_management
DB_USER=smqs
DB_PASSWORD=smqs
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

O) Glossary
- MVC: Model–View–Controller (used loosely in the PHP layer)
- App Router: Next.js routing system (app/ directory) with server components
- Provider: React context wrapper for app-wide state or features
- Bridge route: Next.js API route that proxies requests to the PHP backend

P) License addendum
- Dependencies are under their respective licenses; see npm and PHP package licenses.

Q) Acknowledgements
- Radix UI, Tailwind CSS, Jest community, Next.js contributors
