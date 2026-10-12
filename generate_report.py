"""Generate the Chartly MVP Final Report as PDF."""
import os
from fpdf import FPDF


class ReportPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 6, "Chartly MVP - Final Report", align="L")
            self.cell(0, 6, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.line(10, 14, 200, 14)
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Chartly MVP  |  Generated August 2026", align="C")

    def chapter_title(self, title, level=1):
        if level == 1:
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(30, 30, 30)
            self.ln(6)
            self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(249, 115, 22)
            self.set_line_width(0.8)
            self.line(10, self.get_y(), 80, self.get_y())
            self.ln(4)
        elif level == 2:
            self.set_font("Helvetica", "B", 13)
            self.set_text_color(50, 50, 50)
            self.ln(4)
            self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
        elif level == 3:
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(70, 70, 70)
            self.ln(2)
            self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
            self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text, indent=15):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        x = self.get_x()
        self.set_x(x + indent)
        self.cell(4, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def table_header(self, cols, widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(245, 245, 245)
        self.set_text_color(30, 30, 30)
        self.set_draw_color(200, 200, 200)
        for i, col in enumerate(cols):
            self.cell(widths[i], 7, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, cells, widths, fill=False):
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(50, 50, 50)
        self.set_draw_color(220, 220, 220)
        if fill:
            self.set_fill_color(252, 252, 252)
        max_h = 6
        # Calculate row height
        for i, cell in enumerate(cells):
            lines = self.multi_cell(widths[i], 5, cell, split_only=True)
            h = len(lines) * 5
            if h > max_h:
                max_h = h
        y_start = self.get_y()
        x_start = self.get_x()
        for i, cell in enumerate(cells):
            x = x_start + sum(widths[:i])
            self.set_xy(x, y_start)
            self.cell(widths[i], max_h, "", border=1, fill=fill)
            self.set_xy(x + 1, y_start + 1)
            self.multi_cell(widths[i] - 2, 5, cell)
        self.set_xy(x_start, y_start + max_h)


pdf = ReportPDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# ── Cover Page ──
pdf.ln(40)
pdf.set_font("Helvetica", "B", 32)
pdf.set_text_color(30, 30, 30)
pdf.cell(0, 14, "Chartly", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 16)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 10, "Data Analysis Platform", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(8)
pdf.set_draw_color(249, 115, 22)
pdf.set_line_width(1.2)
pdf.line(70, pdf.get_y(), 140, pdf.get_y())
pdf.ln(12)
pdf.set_font("Helvetica", "", 13)
pdf.set_text_color(80, 80, 80)
pdf.cell(0, 8, "Final Project Report", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(6)
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 7, "MVP Version 2.0", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 7, "August 2026", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(30)
pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(130, 130, 130)
pdf.cell(0, 6, "Prepared by: Chartly Development Team", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, "Repository: github.com/ArwaZ2002/Chartly", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, "Live Deployment: chartly-sigma.vercel.app", align="C", new_x="LMARGIN", new_y="NEXT")

# ── Table of Contents ──
pdf.add_page()
pdf.chapter_title("Table of Contents")
toc = [
    ("1. Executive Summary", 3),
    ("2. Project Overview", 3),
    ("3. Features", 4),
    ("4. Technology Stack", 5),
    ("5. Architecture", 6),
    ("6. Database Schema", 7),
    ("7. API Reference", 8),
    ("8. Security", 10),
    ("9. Frontend", 11),
    ("10. Testing", 12),
    ("11. Deployment", 13),
    ("12. Known Limitations", 14),
    ("13. Future Improvements", 14),
]
for item, page in toc:
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(50, 50, 50)
    dots = "." * (60 - len(item))
    pdf.cell(0, 7, f"{item} {dots} {page}", new_x="LMARGIN", new_y="NEXT")

# ── 1. Executive Summary ──
pdf.add_page()
pdf.chapter_title("1. Executive Summary")
pdf.body_text(
    "Chartly is a web-based data analysis platform that enables users to upload CSV and Excel files, "
    "explore automatic data profiles, and generate interactive charts powered by Plotly. The platform "
    "supports role-based access control (Admin, Analyst, Viewer), chart versioning, templates, audit "
    "trails, and code export in both Python (Plotly Express) and JavaScript (Plotly.js)."
)
pdf.body_text(
    "The Minimum Viable Product (MVP) delivers a fully functional single-page application with a "
    "FastAPI backend, SQLAlchemy ORM, SQLite (local) or PostgreSQL (production) database, and a "
    "Vanilla JavaScript frontend. It is deployed on Vercel's free tier with Neon Postgres as the "
    "production database, requiring zero infrastructure cost."
)
pdf.body_text(
    "Key metrics: 34 API endpoints, 9 database tables, 10 chart types, 25 automated tests, "
    "and a comprehensive security layer including JWT authentication, Argon2id password hashing, "
    "rate limiting, CSP headers, and CSRF protection."
)

# ── 2. Project Overview ──
pdf.chapter_title("2. Project Overview")
pdf.chapter_title("2.1 Purpose", level=2)
pdf.body_text(
    "Chartly was designed as an internal data analysis platform to bridge the gap between raw data "
    "and actionable visual insights. Users can upload datasets, receive automatic profiling (column "
    "types, statistics, quality flags), and build charts through an interactive builder without "
    "writing code."
)
pdf.chapter_title("2.2 Goals", level=2)
pdf.bullet("Zero-cost deployment using Vercel free tier + Neon Postgres")
pdf.bullet("No external dependencies for charting (Plotly.js CDN)")
pdf.bullet("Role-based access: Admin manages users, Analyst creates charts, Viewer reads only")
pdf.bullet("Full audit trail for compliance and collaboration")
pdf.bullet("Code export for reproducibility (Python and JavaScript)")
pdf.bullet("Responsive design for desktop and mobile")
pdf.chapter_title("2.3 Target Users", level=2)
pdf.body_text(
    "Business analysts, data scientists, and product managers who need quick visual exploration "
    "of CSV/Excel data without setting up local Python environments or BI tools."
)

# ── 3. Features ──
pdf.add_page()
pdf.chapter_title("3. Features")
pdf.chapter_title("3.1 Authentication & Authorization", level=2)
pdf.bullet("JWT-based authentication with HttpOnly cookies")
pdf.bullet("Argon2id password hashing (auto-migration from legacy SHA-256)")
pdf.bullet("Three roles: Admin, Analyst, Viewer with endpoint-level enforcement")
pdf.bullet("Token revocation (logout invalidates both cookie and bearer tokens)")
pdf.bullet("Rate limiting: 5 failed logins per account, 20 per IP per 60s window")
pdf.chapter_title("3.2 Dataset Management", level=2)
pdf.bullet("Upload CSV, XLSX, and XLS files (up to 50 MB)")
pdf.bullet("Automatic profiling: column types (numeric, categorical, datetime, boolean), statistics, missing values")
pdf.bullet("Preview first 10 rows with type annotations")
pdf.bullet("In-database file storage (Postgres LargeBinary) for serverless compatibility")
pdf.bullet("Rename and delete datasets with cascade to charts")
pdf.chapter_title("3.3 Chart Builder", level=2)
pdf.bullet("10 chart types: Bar, Line, Area, Pie, Scatter, Histogram, Box, Violin, Treemap, Funnel")
pdf.bullet("Interactive builder: dimension, metric, aggregation (sum, mean, count, min, max)")
pdf.bullet("Smart recommendations based on column types")
pdf.bullet("Chart regeneration with specification changes")
pdf.bullet("Version history with restore capability")
pdf.bullet("Rendered as interactive Plotly.js visualizations")
pdf.chapter_title("3.4 Templates & Themes", level=2)
pdf.bullet("Save chart configurations as reusable templates")
pdf.bullet("Apply templates to new datasets")
pdf.bullet("Custom theme templates with color palettes and font selection")
pdf.bullet("Light/dark theme toggle with localStorage persistence")
pdf.chapter_title("3.5 Code Export", level=2)
pdf.bullet("Python export: Plotly Express code ready to run")
pdf.bullet("JavaScript export: Plotly.js code for web integration")
pdf.bullet("Exported code includes data, configuration, and layout")
pdf.chapter_title("3.6 Admin Features", level=2)
pdf.bullet("User management (CRUD) with role assignment")
pdf.bullet("Audit trail: tracks chart creation, regeneration, export, and template saves")
pdf.bullet("Platform settings (name, default chart type)")
pdf.bullet("Security: API docs auto-disabled in production, HSTS, CSP, CORS")

# ── 4. Technology Stack ──
pdf.add_page()
pdf.chapter_title("4. Technology Stack")
pdf.chapter_title("4.1 Backend", level=2)
cols = ["Component", "Technology", "Version"]
widths = [40, 80, 30]
pdf.table_header(cols, widths)
rows = [
    ("Web Framework", "FastAPI", "0.141.1"),
    ("ASGI Server", "Uvicorn", "0.52.1"),
    ("ORM", "SQLAlchemy", "2.0.52"),
    ("Validation", "Pydantic + pydantic-settings", "2.13.4"),
    ("Auth", "PyJWT + argon2-cffi", "2.10.1 / 25.1.0"),
    ("Data Processing", "pandas + openpyxl + xlrd", "3.0.5"),
    ("Charting", "Plotly (Python)", "6.9.0"),
    ("Database (prod)", "psycopg (PostgreSQL)", "3.3.4"),
    ("Database (dev)", "SQLite3 (built-in)", "--"),
]
for i, row in enumerate(rows):
    pdf.table_row(row, widths, fill=(i % 2 == 0))

pdf.ln(4)
pdf.chapter_title("4.2 Frontend", level=2)
cols2 = ["Component", "Technology"]
widths2 = [50, 110]
pdf.table_header(cols2, widths2)
fe_rows = [
    ("Framework", "Vanilla JavaScript (ES6 Modules, SPA)"),
    ("Charting", "Plotly.js 2.35.0 (CDN)"),
    ("Routing", "Custom hash-based router (#login, #dashboard, etc.)"),
    ("Styling", "Custom CSS (design system with CSS variables)"),
    ("Fonts", "Inter + Poppins (Google Fonts)"),
    ("State", "localStorage (theme), JWT cookie (auth)"),
]
for i, row in enumerate(fe_rows):
    pdf.table_row(row, widths2, fill=(i % 2 == 0))

pdf.ln(4)
pdf.chapter_title("4.3 Infrastructure", level=2)
cols3 = ["Service", "Provider", "Tier"]
widths3 = [40, 60, 60]
pdf.table_header(cols3, widths3)
infra_rows = [
    ("Hosting", "Vercel", "Free (Hobby)"),
    ("Database", "Neon Postgres", "Free (0.5 GB)"),
    ("Version Control", "GitHub", "Free"),
    ("CDN", "Vercel Edge Network", "Included"),
    ("CI/CD", "Vercel Git Integration", "Automatic"),
]
for i, row in enumerate(infra_rows):
    pdf.table_row(row, widths3, fill=(i % 2 == 0))

# ── 5. Architecture ──
pdf.add_page()
pdf.chapter_title("5. Architecture")
pdf.chapter_title("5.1 System Overview", level=2)
pdf.body_text(
    "Chartly follows a monolithic architecture with clear separation of concerns. The FastAPI "
    "application handles both API routes and static file serving. On Vercel, static assets are "
    "served from the CDN (public/ directory) while the Python function handles API requests."
)
pdf.chapter_title("5.2 Request Flow", level=2)
pdf.body_text(
    "1. Browser requests / -> Vercel CDN serves public/index.html\n"
    "2. SPA loads, JS fetches /api/auth/login -> Vercel routes to FastAPI function\n"
    "3. FastAPI processes request, returns JWT in HttpOnly cookie\n"
    "4. Subsequent API calls include cookie -> FastAPI validates JWT\n"
    "5. Chart generation: FastAPI calls data_io to read from DB, "
    "pandas for profiling, Plotly for chart HTML\n"
    "6. Response returned to SPA, Plotly.js renders interactive chart"
)
pdf.chapter_title("5.3 Directory Structure", level=2)
pdf.set_font("Courier", "", 8)
pdf.set_text_color(50, 50, 50)
structure = (
    "chartly-mvp/\n"
    "  api/index.py          Vercel serverless entrypoint\n"
    "  backend/\n"
    "    main.py              FastAPI app, middleware, seeding\n"
    "    app/\n"
    "      api/               Route handlers (8 modules)\n"
    "      core/              Config, database, rate limiter\n"
    "      models/            SQLAlchemy + Pydantic models\n"
    "      services/          Business logic (chart gen, profiling)\n"
    "    tests/               Test suite (25 tests)\n"
    "    static/              SPA assets (local dev)\n"
    "  public/                Vercel CDN-served assets\n"
    "    index.html           SPA shell\n"
    "    static/css/          Stylesheets\n"
    "    static/js/           JavaScript modules\n"
    "  vercel.json            Vercel configuration\n"
    "  requirements.txt       Python dependencies"
)
pdf.multi_cell(0, 4.2, structure)
pdf.set_font("Helvetica", "", 10)
pdf.ln(4)
pdf.chapter_title("5.4 Key Design Decisions", level=2)
pdf.bullet("File storage in DB (LargeBinary): Avoids ephemeral disk issues on serverless platforms")
pdf.bullet("Inline HTML in main.py: Ensures index.html is in the function bundle for Vercel")
pdf.bullet("Hash-based SPA routing: No server-side routing needed, works with CDN-only static files")
pdf.bullet("Import-time DB init: Runs on Vercel cold start, idempotent seeding")

# ── 6. Database Schema ──
pdf.add_page()
pdf.chapter_title("6. Database Schema")
pdf.body_text(
    "Chartly uses 9 database tables with UUID primary keys. The schema supports user management, "
    "dataset storage, chart configurations, versioning, templates, and audit logging."
)

tables_info = [
    ("users", [
        ("id", "String", "PK, UUID"),
        ("email", "String", "Unique, indexed"),
        ("name", "String", "Not null"),
        ("hashed_password", "String", "Argon2id"),
        ("role", "String", "admin/analyst/viewer"),
        ("created_at", "DateTime", "Default utcnow"),
    ]),
    ("datasets", [
        ("id", "String", "PK, UUID"),
        ("name", "String", "Not null"),
        ("file_name", "String", "Original filename"),
        ("file_data", "LargeBinary", "Raw file bytes"),
        ("columns_profile", "JSON", "Auto-profiled schema"),
        ("row_count", "Integer", "Total rows"),
        ("uploaded_by", "String", "FK -> users.id"),
    ]),
    ("charts", [
        ("id", "String", "PK, UUID"),
        ("dataset_id", "String", "FK -> datasets.id"),
        ("specification", "JSON", "Chart config"),
        ("created_by", "String", "FK -> users.id"),
    ]),
    ("chart_versions", [
        ("id", "String", "PK, UUID"),
        ("chart_id", "String", "FK -> charts.id"),
        ("specification", "JSON", "Historical spec"),
    ]),
    ("templates", [
        ("id", "String", "PK, UUID"),
        ("name", "String", "Template name"),
        ("chart_type", "String", "bar/line/etc"),
        ("specification", "JSON", "Saved config"),
    ]),
    ("theme_templates", [
        ("id", "String", "PK, UUID"),
        ("name", "String", "Theme name"),
        ("colors", "JSON", "Color palette"),
        ("font_family", "String", "Optional font"),
    ]),
    ("audit_entries", [
        ("id", "String", "PK, UUID"),
        ("chart_id", "String", "FK -> charts.id"),
        ("action", "String", "create/export/etc"),
        ("user_id", "String", "FK -> users.id"),
    ]),
    ("settings", [
        ("key", "String", "PK"),
        ("value", "Text", "Setting value"),
    ]),
    ("revoked_tokens", [
        ("jti", "String", "PK, JWT ID"),
        ("expires_at", "DateTime", "TTL index"),
    ]),
]

for table_name, columns in tables_info:
    pdf.chapter_title(table_name, level=3)
    cols = ["Column", "Type", "Constraints"]
    widths = [40, 35, 85]
    pdf.table_header(cols, widths)
    for i, (col, typ, desc) in enumerate(columns):
        pdf.table_row([col, typ, desc], widths, fill=(i % 2 == 0))
    pdf.ln(2)

# ── 7. API Reference ──
pdf.add_page()
pdf.chapter_title("7. API Reference")
pdf.body_text(
    "Chartly exposes 34 endpoints across 8 route groups. All endpoints except login/health "
    "require JWT authentication. Role-based access is enforced at the route level."
)

api_routes = [
    ("Auth", "POST", "/api/auth/login", "No", "Login, returns JWT cookie"),
    ("Auth", "POST", "/api/auth/logout", "Optional", "Revoke token, clear cookie"),
    ("Auth", "GET", "/api/auth/me", "Any", "Current user profile"),
    ("Datasets", "POST", "/api/datasets/upload", "Admin, Analyst", "Upload CSV/XLSX"),
    ("Datasets", "GET", "/api/datasets/", "Any", "List all datasets"),
    ("Datasets", "GET", "/api/datasets/{id}", "Any", "Get dataset details"),
    ("Datasets", "PATCH", "/api/datasets/{id}", "Admin, Analyst", "Rename dataset"),
    ("Datasets", "GET", "/api/datasets/{id}/preview", "Any", "Preview first 10 rows"),
    ("Datasets", "DELETE", "/api/datasets/{id}", "Admin, Analyst", "Delete dataset"),
    ("Charts", "POST", "/api/charts/generate", "Admin, Analyst", "Generate chart"),
    ("Charts", "GET", "/api/charts/", "Any", "List charts"),
    ("Charts", "GET", "/api/charts/recommendations/{id}", "Any", "Chart suggestions"),
    ("Charts", "GET", "/api/charts/{id}/render", "Any", "Render chart HTML+JSON"),
    ("Charts", "POST", "/api/charts/{id}/regenerate", "Admin, Analyst", "Update spec"),
    ("Charts", "POST", "/api/charts/{id}/restore/{vid}", "Admin, Analyst", "Restore version"),
    ("Charts", "DELETE", "/api/charts/{id}", "Admin, Analyst", "Delete chart"),
    ("Templates", "POST", "/api/templates/", "Admin, Analyst", "Create template"),
    ("Templates", "GET", "/api/templates/", "Any", "List templates"),
    ("Templates", "GET", "/api/templates/{id}", "Any", "Get template"),
    ("Templates", "POST", "/api/templates/apply", "Admin, Analyst", "Apply template"),
    ("Templates", "DELETE", "/api/templates/{id}", "Admin, Analyst", "Delete template"),
    ("Themes", "POST", "/api/theme-templates/", "Admin, Analyst", "Create theme"),
    ("Themes", "GET", "/api/theme-templates/", "Any", "List themes"),
    ("Themes", "DELETE", "/api/theme-templates/{id}", "Admin, Analyst", "Delete theme"),
    ("Audit", "GET", "/api/audit/", "Admin", "List audit entries"),
    ("Users", "GET", "/api/users/", "Admin", "List users"),
    ("Users", "POST", "/api/users/", "Admin", "Create user"),
    ("Users", "PATCH", "/api/users/{id}", "Admin", "Update user"),
    ("Users", "DELETE", "/api/users/{id}", "Admin", "Delete user"),
    ("Settings", "GET", "/api/settings/", "Any", "Get settings"),
    ("Settings", "PUT", "/api/settings/", "Admin", "Update settings"),
    ("Settings", "GET", "/api/settings/theme", "Any", "Get theme preference"),
    ("Settings", "PUT", "/api/settings/theme", "Any", "Update theme preference"),
]

cols = ["Group", "Method", "Path", "Auth", "Description"]
widths = [20, 16, 58, 28, 48]
pdf.table_header(cols, widths)
for i, row in enumerate(api_routes):
    if pdf.get_y() > 260:
        pdf.add_page()
        pdf.table_header(cols, widths)
    pdf.table_row(list(row), widths, fill=(i % 2 == 0))

# ── 8. Security ──
pdf.add_page()
pdf.chapter_title("8. Security")
pdf.chapter_title("8.1 Authentication", level=2)
pdf.bullet("JWT tokens stored in HttpOnly, SameSite=Lax cookies (not accessible via JavaScript)")
pdf.bullet("Bearer token support for API clients (Authorization header)")
pdf.bullet("Token expiration: 120 minutes, configurable via ACCESS_TOKEN_EXPIRE_MINUTES")
pdf.bullet("Token revocation: logout invalidates JWT ID (jti) in revoked_tokens table")
pdf.chapter_title("8.2 Password Hashing", level=2)
pdf.bullet("Argon2id (argon2-cffi) for new passwords - memory-hard, GPU-resistant")
pdf.bullet("Automatic migration from legacy SHA-256 hashes on successful login")
pdf.bullet("Legacy hashes preserved after failed login to prevent user lockout")
pdf.chapter_title("8.3 Rate Limiting", level=2)
pdf.bullet("Login endpoint: 5 failures per account per 60s window (configurable)")
pdf.bullet("IP-based limit: 20 failures per IP per 60s window")
pdf.bullet("Retry-After header returned on 429 responses")
pdf.chapter_title("8.4 Security Headers", level=2)
pdf.bullet("X-Content-Type-Options: nosniff")
pdf.bullet("X-Frame-Options: DENY (prevents clickjacking)")
pdf.bullet("Referrer-Policy: strict-origin-when-cross-origin")
pdf.bullet("Content-Security-Policy: restricts script/style/connect sources")
pdf.bullet("Strict-Transport-Security: enabled when COOKIE_SECURE=true (HTTPS)")
pdf.chapter_title("8.5 CSRF Protection", level=2)
pdf.bullet("Origin header validation on POST/PUT/PATCH/DELETE requests")
pdf.bullet("Rejects requests from unknown origins (allows same-origin and API clients)")
pdf.chapter_title("8.6 Input Validation", level=2)
pdf.bullet("File type validation: only .csv, .xlsx, .xls allowed")
pdf.bullet("MIME type checking on upload")
pdf.bullet("Max upload size: 50 MB (configurable)")
pdf.bullet("Pydantic validation on all API inputs")
pdf.bullet("SQLAlchemy ORM prevents SQL injection")

# ── 9. Frontend ──
pdf.add_page()
pdf.chapter_title("9. Frontend")
pdf.chapter_title("9.1 Architecture", level=2)
pdf.body_text(
    "The frontend is a single-page application (SPA) built with Vanilla JavaScript using ES6 modules. "
    "It uses a custom hash-based router for navigation and a component-based architecture without "
    "any framework dependency."
)
pdf.chapter_title("9.2 Key Components", level=2)
pdf.bullet("router.js - Hash-based SPA router (#login, #dashboard, #datasets, #charts, etc.)")
pdf.bullet("api.js - HTTP client with JWT cookie and bearer token support")
pdf.bullet("app.js - Application entry point and view orchestration")
pdf.bullet("components/ - Reusable UI: chart.js, modal.js, navbar.js, sidebar.js")
pdf.bullet("views/ - Page views: login, dashboard, datasets, chart-builder, templates, users, settings, audit, review")
pdf.chapter_title("9.3 Design System", level=2)
pdf.bullet("CSS custom properties (variables) for theming")
pdf.bullet("Orange primary (#f97316) / Indigo secondary (#4f46e5) palette")
pdf.bullet("Light and dark themes with no FOUC (applied before render)")
pdf.bullet("Responsive: sidebar collapses on mobile, topbar appears")
pdf.bullet("Design tokens: consistent spacing, typography, shadows, border-radius")
pdf.chapter_title("9.4 Chart Rendering", level=2)
pdf.body_text(
    "Charts are rendered using Plotly.js v2.35.0 loaded from CDN. The backend generates chart HTML "
    "via Plotly Python, and the frontend renders it in a container div. The SPA also supports "
    "client-side re-rendering for theme changes."
)

# ── 10. Testing ──
pdf.add_page()
pdf.chapter_title("10. Testing")
pdf.body_text(
    "Chartly includes 25 automated tests across 4 test files, plus a production verification script. "
    "Tests use pytest with FastAPI's TestClient and temporary SQLite databases."
)
pdf.chapter_title("10.1 Test Coverage", level=2)
test_info = [
    ("test_regression.py", "8", "RBAC, upload, rate limiting, security headers, CSRF"),
    ("test_jwt_revocation.py", "5", "Token revocation, bearer/cookie auth, login cycle"),
    ("test_hashing_migration.py", "6", "Argon2id hashing, SHA-256 migration, demo accounts"),
    ("test_security_config.py", "4", "API docs, HSTS, cookie flags, production checks"),
]
cols = ["Test File", "Tests", "Coverage Area"]
widths = [50, 15, 95]
pdf.table_header(cols, widths)
for i, row in enumerate(test_info):
    pdf.table_row(list(row), widths, fill=(i % 2 == 0))

pdf.ln(4)
pdf.chapter_title("10.2 Test Infrastructure", level=2)
pdf.bullet("conftest.py - Fixtures: temp DB, TestClient, login/auth helpers, upload cleanup")
pdf.bullet("helpers.py - Legacy SHA-256 hash generation for migration tests")
pdf.bullet("prod_checks.py - Production mode verification (docs, HSTS, cookie flags)")
pdf.chapter_title("10.3 Running Tests", level=2)
pdf.set_font("Courier", "", 9)
pdf.multi_cell(0, 5, "cd backend && python -m pytest tests -v")
pdf.set_font("Helvetica", "", 10)
pdf.ln(4)
pdf.chapter_title("10.4 End-to-End Smoke Test", level=2)
pdf.body_text(
    "A manual smoke test validates the full workflow: login -> upload CSV -> preview -> "
    "generate chart -> render chart -> delete. This test runs automatically in CI and "
    "after each deployment."
)

# ── 11. Deployment ──
pdf.add_page()
pdf.chapter_title("11. Deployment")
pdf.chapter_title("11.1 Production Environment", level=2)
pdf.bullet("Platform: Vercel (free Hobby tier)")
pdf.bullet("Database: Neon Postgres (free tier, 0.5 GB storage)")
pdf.bullet("URL: https://chartly-sigma.vercel.app")
pdf.bullet("Auto-deploy: Push to main branch triggers Vercel build")
pdf.chapter_title("11.2 Deployment Architecture", level=2)
pdf.body_text(
    "Vercel detects backend/main.py as the FastAPI entrypoint and bundles it as a serverless "
    "function. Static assets (HTML, CSS, JS) are served from Vercel's CDN via the public/ "
    "directory. The function handles all /api/* routes while CDN serves /static/* files."
)
pdf.chapter_title("11.3 Environment Variables", level=2)
env_vars = [
    ("DATABASE_URL", "PostgreSQL connection string (Neon)"),
    ("JWT_SECRET", "JWT signing secret (required, no default)"),
    ("ENVIRONMENT", "production"),
    ("COOKIE_SECURE", "true (HTTPS)"),
    ("TRUST_PROXY", "true (Vercel behind proxy)"),
    ("ALLOWED_ORIGINS", "https://chartly-sigma.vercel.app"),
]
cols = ["Variable", "Value"]
widths = [45, 115]
pdf.table_header(cols, widths)
for i, row in enumerate(env_vars):
    pdf.table_row(list(row), widths, fill=(i % 2 == 0))

pdf.ln(4)
pdf.chapter_title("11.4 Deployment Steps", level=2)
pdf.bullet("1. Create Neon Postgres database and obtain connection string")
pdf.bullet("2. Push code to GitHub repository")
pdf.bullet("3. Import project in Vercel dashboard (auto-detects FastAPI)")
pdf.bullet("4. Configure environment variables in Vercel settings")
pdf.bullet("5. Deploy - Vercel auto-builds and routes traffic")
pdf.bullet("6. Verify: GET / returns HTML, POST /api/auth/login works")
pdf.chapter_title("11.5 Deployment History", level=2)
commits = [
    ("69383a2", "Vercel+Neon deployment wiring"),
    ("8f3f556", "Removed invalid runtime config"),
    ("ac7e25a", "Added includeFiles (did not resolve issue)"),
    ("3972aca", "Copied static to public/ for CDN"),
    ("2f232e6", "Set framework: fastapi explicitly"),
    ("3d5c4f2", "Serve index.html from bundled path"),
    ("e99a563", "Inline HTML, add public/index.html"),
]
cols = ["Commit", "Description"]
widths = [25, 135]
pdf.table_header(cols, widths)
for i, row in enumerate(commits):
    pdf.table_row(list(row), widths, fill=(i % 2 == 0))

# ── 12. Known Limitations ──
pdf.add_page()
pdf.chapter_title("12. Known Limitations")
pdf.bullet("No real-time collaboration (single-user per session)")
pdf.bullet("No WebSocket support for live data updates")
pdf.bullet("SQLite used locally does not support concurrent writes")
pdf.bullet("Chart rendering is server-side (Plotly Python) - adds latency vs client-side only")
pdf.bullet("No data transformation/cleaning pipeline (raw data only)")
pdf.bullet("No scheduled reports or email notifications")
pdf.bullet("No API key authentication for external integrations")
pdf.bullet("Free tier Neon database has 0.5 GB storage limit")
pdf.bullet("Vercel serverless functions have 10s timeout on free tier")

# ── 13. Future Improvements ──
pdf.chapter_title("13. Future Improvements")
pdf.chapter_title("13.1 Short-term", level=2)
pdf.bullet("Data transformation pipeline (filter, join, pivot)")
pdf.bullet("Chart sharing via public links")
pdf.bullet("Dashboard creation (multiple charts per view)")
pdf.bullet("Export to PNG/PDF")
pdf.bullet("CSV/Excel export of chart data")
pdf.chapter_title("13.2 Medium-term", level=2)
pdf.bullet("Real-time collaboration with WebSockets")
pdf.bullet("Custom SQL query editor")
pdf.bullet("Chart scheduling (daily/weekly email reports)")
pdf.bullet("Team workspaces with shared datasets")
pdf.bullet("API key management for external integrations")
pdf.chapter_title("13.3 Long-term", level=2)
pdf.bullet("Machine learning integration (auto-insights, anomaly detection)")
pdf.bullet("Natural language chart queries (text-to-chart)")
pdf.bullet("Embed support (iframe snippets for dashboards)")
pdf.bullet("Multi-tenant architecture")
pdf.bullet("Plugin system for custom chart types")

# ── Save ──
output_path = os.path.join(os.path.dirname(__file__), "Chartly_MVP_Final_Report.pdf")
pdf.output(output_path)
print(f"Report saved to: {output_path}")
