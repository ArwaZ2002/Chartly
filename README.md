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
| Backend  | Python, FastAPI, SQLAlchemy, SQLite |
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

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@chartly.com      | admin123    |
| Analyst | analyst@chartly.com    | analyst123  |
| Viewer  | viewer@chartly.com     | viewer123   |

> Roles are enforced on both the API and the UI. Viewers can browse datasets, charts and templates; analysts (and admins) can upload, create, edit and delete; admins additionally manage users, settings and the audit trail.

## Project Structure

```
├── backend/                  # FastAPI application (self-contained)
│   ├── app/
│   │   ├── api/              # Routes: auth, datasets, charts, templates, audit
│   │   ├── core/             # Config & database
│   │   ├── models/           # SQLAlchemy models & Pydantic schemas
│   │   └── services/         # Chart generation & data profiling
│   ├── static/               # Frontend (single-page app: index.html, app.js, style.css)
│   ├── uploads/              # Uploaded dataset files (gitignored)
│   └── requirements.txt
├── docs/                     # Business requirements documents
└── .gitignore
```

## API Overview

All endpoints live under `/api` (Swagger docs at <http://localhost:8000/docs>):

| Area           | Endpoints |
|----------------|-----------|
| Auth           | `POST /api/auth/login`, `GET /api/auth/me` |
| Datasets       | `POST /api/datasets/upload`, `GET /api/datasets/`, `GET /api/datasets/{id}/preview`, `PATCH`, `DELETE` |
| Charts         | `POST /api/charts/generate`, `GET /api/charts/recommendations/{dataset_id}`, `POST /api/charts/{id}/regenerate`, `POST /api/charts/{id}/restore/{version_id}`, `GET /api/charts/{id}/render`, `DELETE /api/charts/{id}` |
| Templates      | `POST`, `GET`, `DELETE /api/templates/`, `POST /api/templates/apply` (validates against a dataset before reuse) |
| Users (admin)  | `GET`, `POST /api/users/`, `PATCH`, `DELETE /api/users/{id}` |
| Settings       | `GET`, `PUT /api/settings/` (platform name, default chart type) |
| Audit (admin)  | `GET /api/audit/` |

Every endpoint except `/auth/login` requires a `Bearer` token. Write actions require the analyst role (or admin); audit, user and settings management require admin.

## Documentation

Business requirements for the MVP are in the [`docs/`](docs/) folder.

## License

All rights reserved / internal use.