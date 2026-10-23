# Integration Handoff

- Backend: `backend/`; run `python -m uvicorn app.main:app --app-dir backend --reload --port 8000` at repository root; port 8000; validate `python -m compileall backend/app`; health `GET /api/health`.
- Frontend: `frontend/`; build `npm --prefix frontend run build`; dev `npm --prefix frontend run dev`; API seam `frontend/lib/api.ts`, currently calls the live profile endpoint. No mock data.
- Routes: `GET /api/health`; `GET /api/profile`.
- Database: SQLite `sqlite:///./data/profile.db`; SQLAlchemy models `backend/app/models/`; Alembic config `backend/alembic.ini`, migration directory `backend/alembic/`; connection variable `DATABASE_URL`; PostgreSQL driver included. Create migrations as needed; **NO seed data**.
- Shared types: `frontend/lib/types.ts`; no cross-language shared package.
- Services: SQLAlchemy database (Essential), FastAPI API (Essential), Next.js frontend (Essential); no Enhancement services.
