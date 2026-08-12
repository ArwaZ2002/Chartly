# Chartly — Business Requirements Document (BRD)

| Field | Value |
|-------|-------|
| **Project Name** | Chartly |
| **Version** | 2.0 — Updated Draft |
| **Date** | 10 August 2026 |
| **Project Status** | Planning Phase |
| **Platform Type** | Internal Enterprise Tool |

---

## 1. Project Overview

Chartly is an internal tool designed for data analysts within the organization. It enables them to upload data files and use a **Guided Analysis Builder** to select chart types, columns to analyze, aggregation methods, and display options. The system automatically profiles data structure, validates the selections against column types, then generates tables and charts using a programmatic rendering engine.

In its current version, Chartly does **not** rely on a Large Language Model (LLM) or any external AI provider. Instead, the system uses **Data Profiling**, **validation rules**, and **rule-based recommendation logic** to build a Chart Specification, which is then rendered into an interactive chart.

Analysts can modify analysis settings and regenerate charts while maintaining a history of all attempts. The final chart can optionally be saved as a reusable Template in a shared team library.

**Core Goal:** Minimize the time between raw data and ready-to-use, reusable charts — reducing repetitive manual setup while keeping outputs consistent.

---

## 2. Project Objectives

- Accelerate table and chart creation via a Guided Analysis Builder.
- Reduce reliance on scattered external charting tools.
- Provide automatic Data Profiling to discover column names, types, and key properties.
- Offer dynamic analysis options that adapt to the selected chart type and column types.
- Provide initial chart type recommendations based on data characteristics.
- Build a shared, reusable Templates library at the team level.
- Ensure visual consistency through unified options for titles, colors, and display settings.
- Provide an Audit Trail for chart creation, modification, and regeneration operations.
- Manage platform access via clear user roles and permissions (Viewer / Analyst / Admin).

---

## 3. Scope of Work

### In Scope — Phase 1 and Beyond

- Upload CSV and Excel files.
- Data Profiling with basic column type discovery.
- Data sample preview.
- Guided Analysis Builder interface for selecting chart type and columns.
- Support for Bar, Line, Pie, and Scatter charts in Phase 1.
- Dimension, Metric, and Aggregation selection as needed.
- Validation rules to prevent incompatible configurations.
- Optional rule-based Chart Recommendations.
- Chart generation via a programmatic rendering engine (e.g., Plotly or equivalent).
- Chart regeneration with version history.
- Export final chart as JPG/PNG image.
- Save chart as reusable code Template in a shared library.
- Customize title, colors, and basic display settings.
- Viewer / Analyst / Admin role management.

### Out of Scope — Phase 1

- Using an LLM or any external API for understanding free-text instructions or generating charts.
- Sending organizational data to an external AI provider.
- API or database connections — deferred to a later phase.
- Dashboards, Heatmaps, and advanced chart types — deferred to a later phase.
- Export to PDF, PPTX, or Excel — current export is image-only.
- Sharing templates outside the company or creating a public store.
- Subscriptions and billing — the platform is an internal tool, not SaaS.

---

## 4. Users and Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Manages the platform, users, and general settings. | User management, roles, library, and platform settings. |
| **Analyst** | Creates analyses, charts, and manages them. | Data upload, analysis building, generation, modification, export, and template saving. |
| **Viewer** | Views final outputs only. | Browse charts and templates without creating or modifying. |

---

## 5. Core Workflow

1. Login and role-based access control.
2. Upload CSV or Excel file.
3. Data Profiling discovers column names, types, and key properties.
4. Data preview.
5. Select chart type.
6. Select appropriate columns for axes and metrics.
7. Choose Aggregation, Sorting, and Time Granularity as needed.
8. System validates selections against data types.
9. Optional: Display recommendation for a suitable chart type.
10. Convert selections to Chart Specification and generate the chart.
11. Analyst reviews the result.
12. Modify settings and regenerate; each version is saved.
13. Export chart as image.
14. Optionally save chart as Template.
15. Share Template with team based on permissions.

---

## 6. Detailed Functional Requirements

### 6.1 Data Management

| ID | Requirement |
|----|-------------|
| FR-1.1 | Upload CSV or Excel as analysis source. |
| FR-1.2 | Preview a sample of data after import. |
| FR-1.3 | Auto-discover column types. |
| FR-1.4 | Display a basic column summary (type, unique values, missing values when available). |

### 6.2 Guided Analysis Builder

| ID | Requirement |
|----|-------------|
| FR-2.1 | Select chart type from a list of supported types. |
| FR-2.2 | Select columns from dynamic lists based on data type. |
| FR-2.3 | Choose Dimension/Category and Metric/Value based on chart type. |
| FR-2.4 | Select aggregation functions: Sum, Average, Count, Min, Max where applicable. |
| FR-2.5 | Configure Sorting, Time Granularity, and display options. |
| FR-2.6 | Prevent incompatible selections based on column types. |
| FR-2.7 | Optionally suggest a suitable chart based on data characteristics. |
| FR-2.8 | Display a summary of analysis settings before generation. |

### 6.3 Chart Generation and Management

| ID | Requirement |
|----|-------------|
| FR-3.1 | Generate chart from a structured Chart Specification derived from user selections. |
| FR-3.2 | Display chart interactively within the platform. |
| FR-3.3 | Modify settings and regenerate. |
| FR-3.4 | Save each version with its settings and timestamp. |
| FR-3.5 | Export final chart as JPG/PNG. |

### 6.4 Template Library

| ID | Requirement |
|----|-------------|
| FR-4.1 | Save chart as a reusable Template. |
| FR-4.2 | Share Templates with team members based on permissions. |
| FR-4.3 | Customize title, colors, and basic display settings. |
| FR-4.4 | Search by name or chart type. |
| FR-4.5 | Reuse a Template on a new Dataset with column compatibility validation. |

### 6.5 User and Permission Management

| ID | Requirement |
|----|-------------|
| FR-5.1 | Add and remove users; assign roles. |
| FR-5.2 | Viewer can only browse. |
| FR-5.3 | Admin manages platform settings and permissions. |

### 6.6 Audit Trail

| ID | Requirement |
|----|-------------|
| FR-6.1 | Log every chart creation and regeneration with user, date, and time. |
| FR-6.2 | Store Chart Specification and settings for each version. |
| FR-6.3 | Allow access to previous versions based on permissions. |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | Encrypt data in transit and at rest when needed; apply access controls. |
| **Access Control** | Enforce Viewer/Analyst/Admin permissions at every screen and action. |
| **Audit Trail** | Log generation and regeneration operations with user, timestamp, and settings. |
| **Performance** | Define data volume limits and generation time targets via PoC. |
| **Scalability** | Start with a single data analysis team. |
| **Compatibility** | Support modern versions of Firefox, Edge, and Chrome. |
| **Reliability** | Core MVP functions must not depend on any external AI provider. |

---

## 8. Risks and Open Decisions

| Risk | Mitigation |
|------|------------|
| Data volumes and concurrent user counts are undefined. | Run a PoC with realistic data. |
| Data Profiling may fail on unclean files. | Allow manual column type override by the user. |
| Some charts may require complex analysis rules. | Build a scalable Rule Engine. |
| Templates may not match column names in a new Dataset. | Add Template Mapping/Validation. |
| Advanced charts may require different libraries. | Identify and defer to Phase 2. |

---

## 9. Proposed Implementation Phases

### Phase 1 — MVP

- CSV/Excel upload.
- Data Profiling with column type discovery.
- Data preview.
- Guided Analysis Builder.
- Bar / Line / Pie / Scatter charts.
- Column selection with Aggregation, Sorting, Time Granularity.
- Validation Rules.
- Rule-based Chart Recommendations.
- Interactive chart generation and display.
- Regeneration with Version History and Audit Trail.
- JPG/PNG export.
- Template saving and sharing.
- Viewer / Analyst / Admin roles.

### Phase 2

- API and database connections.
- Dashboards, Heatmaps, and advanced charts.
- Extended template customization.
- Improved Template Mapping.
- Team-specific statistics and analytics.

### Phase 3

- Performance optimization and scaling.
- Expanded Rule-Based Recommendation Engine.
- Evaluate adding Natural Language Guidance or LLM as a future optional feature — only if needed and privacy requirements allow.

---

## 10. General Success Criteria

- Reduce time from raw data to finished chart from hours to minutes.
- High adoption of the shared Templates library.
- Reduced reliance on external charting tools.
- High success rate of generating a correct chart on the first attempt.
- Fewer column and chart type selection errors thanks to Data Profiling and Validation.
- Analyst satisfaction with Guided Analysis Builder ease of use and accuracy of rule-based recommendations.
