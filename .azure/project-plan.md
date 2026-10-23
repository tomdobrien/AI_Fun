# Project Plan

**Status**: Awaiting Integration
**Created**: 2026-10-22
**Mode**: APPROVED

---

## 1. Project Overview

Build a polished personal profile and resume site that introduces the owner, highlights their background, and reveals a full CV on demand. The app should feel like a modern digital portfolio with a compact landing state and a clean resume-view experience, while keeping the content easy to manage from a local database-backed API.

This is a cloud-agnostic project intended to run locally first. The backend is Python-based with FastAPI, the frontend is a React app using TypeScript and Next.js, and the initial persistent store is SQLite. The design is intentionally flexible so the app can later swap to PostgreSQL without changing the API contract.

**App Type**: SPA + API
**Authentication**: None required
**Deployment Target**: Cloud-agnostic; not Azure-specific in the initial build

---

## 2. Product Goals

- Present a concise personal identity and professional summary
- Allow a visitor to open a resume/CV view on demand without forcing the full CV to appear on first load
- Store and expose portfolio data such as experience, links, selected projects, skills, and contact info through a backend API
- Keep the system easy to extend for future database migration or additional content types
- Maintain a local-first development workflow with minimal infrastructure complexity

---

## 3. Backend Architecture

| Component | Decision |
|-----------|----------|
| Language | Python |
| Framework | FastAPI |
| Runtime | Python 3.x |
| Package Manager | pip |
| ORM / DB Layer | SQLAlchemy |
| Database | SQLite for local development |
| Migrations | Alembic |
| Test Runner | pytest |
| API Style | REST JSON API |

### Backend responsibilities

- Serve a public API for reading profile and CV content
- Query profile records from a database-backed repository layer
- Expose structured data such as:
  - profile summary
  - work history / experience
  - projects / selected work
  - skills
  - public links / contact information
- Keep all database access behind service/repository boundaries
- Use a configurable `DATABASE_URL` so the app can later target PostgreSQL without rewriting the routes or business logic

### Database strategy

The initial project should use SQLite locally and keep the database in a simple, portable file location such as `./data/profile.db`. The app should be configured to allow a later switch to PostgreSQL by using environment-based configuration and a standard SQLAlchemy connection pattern.

---

## 4. Frontend Architecture

| Component | Decision |
|-----------|----------|
| Language | TypeScript |
| Framework | React + Next.js |
| Package Manager | npm |
| Styling | CSS modules / component styling |
| Testing | Vitest |
| API Integration | Fetch client or typed API layer |

### Frontend responsibilities

- Render a compact landing page and introductory profile section
- Keep the resume hidden until the user explicitly requests it
- Display profile rows, work history, skills, and links in an elegant, scannable format
- Avoid inventing or fabricating personal details that are not explicitly provided by the owner
- Present a responsive, clean layout focused on readability rather than heavy animation

---

## 5. Content Model

The app should support owner-managed records for the following sections:

| Section | Example fields |
|---------|----------------|
| Profile | display name, headline, intro summary |
| Experience | employer, role, dates, description, highlights |
| Selected Work | title, summary, technologies, URL |
| Skills | name, category |
| Links | email, portfolio, GitHub, LinkedIn, other public profiles |

The implementation should treat these as database-backed content rather than hardcoded placeholders. The layout should support both a minimal first view and a richer resume experience.

---

## 6. User Experience and Design

### High-level UX

The homepage should feel like a refined personal landing page:

- a clear introduction
- a calm visual tone with restrained typography and spacing
- a single obvious primary action such as “View resume”
- a smooth reveal of the CV content after user action
- a strong emphasis on readability and trust

### Visual direction

| Element | Direction |
|---------|-----------|
| Palette | muted neutrals with a deep teal or warm accent |
| Type | modern sans-serif with strong hierarchy |
| Layout | generous whitespace, card-like sections, simple grid structure |
| Motion | minimal and subtle |

### Empty-state behavior

If no profile data has been added yet, the resume view should show a helpful empty state instead of fake content. The page should visibly communicate that the profile owner has not added resume content yet.

---

## 7. Services and Infrastructure

The initial stack is intentionally lightweight and local-first.

| Service | Role | Environment Variable | Default |
|---------|------|---------------------|---------|
| SQLite | Local relational storage for profile data | `DATABASE_URL` | `sqlite:///./data/profile.db` |
| FastAPI backend | Serves profile/resume data | `APP_ENV` / `DATABASE_URL` | local |
| Next.js frontend | Renders the personal profile experience | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

No Azure-managed resource is required for the initial build. When a deployment target is chosen later, the system should be able to move to a managed PostgreSQL database without changing the app’s public API behavior.

---

## 8. Project Structure

```text
project-root/
├── .azure/
│   ├── requirements.json
│   └── project-plan.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── config.py
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── tests/
├── data/
│   └── profile.db
├── README.md
└── .gitignore
```

---

## 9. API Contract

### Health check

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/api/health` | Verify API readiness | 200 / 503 |

### Profile data

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/api/profile` | Return profile and resume information from the database | 200 / 500 |

Example response shape:

```json
{
  "displayName": "Your Name",
  "headline": "Senior software engineer",
  "introduction": "Short personal summary",
  "experience": [],
  "selectedWork": [],
  "skills": [],
  "links": []
}
```

---

## 10. Acceptance Criteria

The project is considered ready for scaffolding when the following are in place:

- A Python FastAPI backend exists and starts successfully
- A React + TypeScript + Next.js frontend exists and runs locally
- SQLite is configured as the default local database
- A profile/resume data endpoint exists and returns JSON
- The frontend can show a splash/profile landing page and an on-demand resume view
- No authentication flow is required for initial usage
- The app is structured so it can later move to PostgreSQL without redesigning the API

---

## 11. Next Steps

1. Scaffold the backend and frontend skeletons
2. Implement the local SQLite schema and seed/configuration flow
3. Build the profile API endpoints and repository/service pattern
4. Build the Next.js profile page and resume-view experience
5. Wire frontend API calls to the backend response model
6. Validate local startup, API health, and basic profile rendering
7. Only after initial success, decide on a hosting target and migrate the database layer if needed
