# Chartly

Internal data analysis platform: upload CSV/Excel files, explore profiles, and build interactive charts with templates, version history, role-based access, and full audit trails.

## Features

- **Authentication** with role-based access (admin / analyst / viewer)
- **Dataset upload** (CSV, XLSX, XLS) with automatic column profiling (types, unique counts, missing values) and row preview
- **10 interactive chart types**: bar, line, area, pie, scatter, histogram, box, violin, treemap, funnel
- **Smart chart suggestions** based on column profiles
- **Templates** — save a chart style once and reuse it on any dataset with one click
- **Version history** — edit any chart, save changes, and restore previous versions at any time
- **Audit trail** — every create / regenerate / restore action is recorded
- **Code export** — Python (Plotly Express) and JavaScript (Plotly.js) snippets for every chart
- Responsive UI with a collapsible sidebar (mobile friendly)

## Tech Stack

| Layer    | Tech |
|----------|------|
| Backend  | Python, FastAPI, SQLAlchemy |
| Database | SQLite (local) / Postgres via Neon (Vercel) |
| Charts   | Plotly Express / Plotly.js |
| Frontend | Vanilla JS single-page app (no build step), served by FastAPI |

## Getting Started

Prerequisites: Python 3.11+

```bash
# 1. Set up the backend
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env

# 4. Run the server
python -m uvicorn main:app --reload
```

Open <http://localhost:8000> — a SQLite database is created automatically and seeded with demo users on first start.

### Demo accounts

Dedicated fake demo accounts are seeded automatically on first start so anyone can test the app after cloning. These credentials are public and for testing only.

| Role    | Email                | Password        |
|---------|----------------------|-----------------|
| Admin   | admin@chartly.demo   | admin-demo-123  |
| Analyst | analyst@chartly.demo | analyst-demo-123 |
| Viewer  | viewer@chartly.demo  | viewer-demo-123 |

The login form does not pre-fill anything — enter the demo credentials manually. Roles are enforced on the server: viewers can browse datasets, charts and templates; analysts (and admins) can upload, create, edit and delete; admins additionally manage users, settings and the audit trail. A role can never be chosen or sent by the client.

## Project Structure

```
├── backend/                  # FastAPI application (self-contained)
│   ├── app/
│   │   ├── api/              # Routes: auth, datasets, charts, templates, audit
│   │   ├── core/             # Config & database
│   │   ├── models/           # SQLAlchemy models & Pydantic schemas
│   │   └── services/         # Chart generation, data profiling & file I/O
│   ├── static/               # Frontend SPA: index.html, css/, js/ (router, api, views/, components/)
│   └── requirements.txt
├── api/index.py              # Vercel serverless entrypoint
├── vercel.json               # Vercel function & rewrite config
├── requirements.txt          # Root copy used by Vercel (keep in sync with backend/)
├── docs/                     # Business requirements documents
└── .gitignore
```

## API Overview

All endpoints live under `/api` (Swagger docs at <http://localhost:8000/docs>):

| Area           | Endpoints |
|----------------|-----------|
| Auth           | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Datasets       | `POST /api/datasets/upload`, `GET /api/datasets/`, `GET /api/datasets/{id}/preview`, `PATCH`, `DELETE` |
| Charts         | `POST /api/charts/generate`, `GET /api/charts/recommendations/{dataset_id}`, `POST /api/charts/{id}/regenerate`, `POST /api/charts/{id}/restore/{version_id}`, `GET /api/charts/{id}/render`, `DELETE /api/charts/{id}` |
| Templates      | `POST`, `GET`, `DELETE /api/templates/`, `POST /api/templates/apply` (validates against a dataset before reuse) |
| Users (admin)  | `GET`, `POST /api/users/`, `PATCH`, `DELETE /api/users/{id}` |
| Settings       | `GET`, `PUT /api/settings/` (platform name, default chart type) |
| Audit (admin)  | `GET /api/audit/` |

Every endpoint except `/auth/login` and `/auth/logout` requires authentication. The JWT is delivered as an HttpOnly cookie and is invalidated server-side on logout (revoked tokens are rejected until they expire). Write actions require the analyst role (or admin); audit, user and settings management require admin.

## Security & configuration

Environment variables (`backend/.env`, see `.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `development` | `production` disables API docs and switches to production defaults |
| `SECRET_KEY` / `JWT_SECRET_KEY` | placeholder | JWT signing secret — **generate a strong random value in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `120` | Access token lifetime |
| `ALLOWED_ORIGINS` | `http://localhost:8000` | Comma-separated browser origins allowed to call the API (no wildcard) |
| `ENABLE_API_DOCS` | auto | Empty = enabled in development, disabled in production; set `true`/`false` to override |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS (also enables the HSTS header) |
| `LOGIN_RATE_LIMIT` | `5` | Max failed logins per account per window |
| `LOGIN_RATE_LIMIT_IP` | `20` | Max failed logins per IP per window |
| `LOGIN_RATE_WINDOW_SECONDS` | `60` | Rate-limit window |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum dataset upload size |
| `TRUST_PROXY` | `false` | Set `true` behind a trusted reverse proxy to read client IPs from `X-Forwarded-For` |

## Deploying to Vercel (free)

Chartly runs on Vercel serverless functions with **Neon Postgres** as the
database. Uploaded dataset files are stored as raw bytes in the database, so
no persistent filesystem is needed — this is what makes a fully free (no
credit card) serverless deployment possible.

The repo is already wired for it:

- [`api/index.py`](api/index.py) — serverless entrypoint that imports the FastAPI app
- [`vercel.json`](vercel.json) — routes all traffic to the function (Python 3.12)
- [`requirements.txt`](requirements.txt) — root copy Vercel uses to install deps
- `app/core/database.py` — accepts plain `postgres://...` URLs (psycopg v3)
- Schema and demo users are seeded on every cold start (idempotent)

### One-time setup

1. Push this repository to GitHub.
2. Create a free account at [neon.tech](https://neon.tech) (no credit card) and
   create a project — you get a connection string like
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/chartly?sslmode=require`.
3. Create a free account at [vercel.com](https://vercel.com) (no credit card),
   then **Add New → Project → Import** your GitHub repo. Vercel detects the
   `vercel.json` automatically.
4. In the project's **Settings → Environment Variables**, add:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
   | `ENVIRONMENT` | `production` |
   | `COOKIE_SECURE` | `true` |
   | `TRUST_PROXY` | `true` |
   | `MAX_UPLOAD_SIZE_MB` | `4` (Vercel free tier request-body limit is 4.5 MB) |
   | `ALLOWED_ORIGINS` | your `*.vercel.app` URL (optional; same-origin requests are always allowed) |
5. **Deploy**. Open the URL — demo accounts are seeded automatically:
   - Admin: `admin@chartly.demo` / `admin-demo-123`
   - Analyst: `analyst@chartly.demo` / `analyst-demo-123`
   - Viewer: `viewer@chartly.demo` / `viewer-demo-123`

### Free-tier limits to know

- **Uploads capped at ~4 MB** on Vercel's free plan (request-body limit).
  Lower `MAX_UPLOAD_SIZE_MB` accordingly.
- **Neon free** gives 0.5 GB of storage — uploaded files count against it.
  Delete old datasets to stay within limits.
- The first request after a cold start takes a few seconds (pandas is a large
  dependency); subsequent requests are fast.
- Vercel free deployments are public by default — anyone with the URL can see
  the app, so the seeded demo accounts are intentionally fake.

### Development

Local development is unchanged: SQLite via `DATABASE_URL=sqlite:///./chartly.db`,
uploads stored in the DB. No `uploads/` directory is used anymore.

## Documentation

Business requirements for the MVP are in the [`docs/`](docs/) folder.

## License

All rights reserved / internal use.