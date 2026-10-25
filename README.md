# Personal Profile

A local-first personal profile and resume site: FastAPI + SQLAlchemy + SQLite behind a Next.js / TypeScript frontend. Profile fields start empty; add real owner-provided content before sharing the site.

## Requirements

- Python 3.10+ (tested with Python 3.12)
- Node.js 18.18+ and npm

## Run locally

Run the services from the repository root with npm:

```powershell
npm run backend   # Backend only
npm run frontend  # Frontend only
npm run dev       # Both services; Ctrl+C stops both
```

In VS Code, open **Explorer** in the left sidebar, then expand **NPM Scripts** near the bottom. Under `frontend\package.json`, run `dev` for the frontend, `backend` for the API, or `dev:all` for both. These entries run in VS Code's integrated terminal; press `Ctrl+C` there to stop them.

### Backend

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Startup creates the tables, applies pending Alembic migrations, and uses `./data/profile.db` by default. Set `DATABASE_URL` in a root `.env` file (copy `.env.example`) to configure the database. A standard `postgresql://...` URL is normalized to the included psycopg 3 driver; supply credentials via environment settings.

- Health: <http://localhost:8000/api/health>
- Profile JSON: <http://localhost:8000/api/profile>
- OpenAPI docs: <http://localhost:8000/docs>

### Frontend

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Visit <http://localhost:3000>. Configure `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the API is elsewhere. Select **View resume** to reveal the CV. Open <http://localhost:3000/admin> to edit the profile shown on the homepage; save changes to publish them immediately. The profile is structured around professional experience, grouped technical skills, awards, and education. No personal details are seeded or fabricated.

## Database and migrations

Default URL: `sqlite:///./data/profile.db`. SQLAlchemy models, repositories, and services are in `backend/app/`. Alembic is configured in `backend/alembic.ini`; create/apply migrations with `python -m alembic -c backend/alembic.ini revision --autogenerate -m "describe schema change"` and `python -m alembic -c backend/alembic.ini upgrade head` (run with the project environment active). The app creates missing tables on startup for easy local setup. Never add secrets to checked-in environment examples.

## Checks

```powershell
backend/.venv/Scripts/python -m pytest backend/tests
npm --prefix frontend run typecheck
npm --prefix frontend run build
```
