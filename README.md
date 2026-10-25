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
backend/.venv/Scripts/python -m uvicorn app.main:app --app-dir backend --reload --port 8001
```

Startup creates the tables, applies pending Alembic migrations, and uses `./data/profile.db` by default. Set `DATABASE_URL` in a root `.env` file (copy `.env.example`) to configure the database. A standard `postgresql://...` URL is normalized to the included psycopg 3 driver; supply credentials via environment settings.

The `/admin` editor requires `ADMIN_PASSWORD` (at least 8 characters) and `ADMIN_SESSION_SECRET` (at least 32 random characters) in the root `.env` file. Generate values with `python -c "import secrets; print('ADMIN_PASSWORD=' + secrets.token_urlsafe(24)); print('ADMIN_SESSION_SECRET=' + secrets.token_urlsafe(48))"`, then paste both lines into `.env`. The password is never stored in the database. Successful sign-ins receive a signed token that expires after 8 hours; the frontend keeps it in memory, so you sign in again after a full page reload. On a production deployment, set `APP_ENV=production`, use HTTPS, and set `FRONTEND_ORIGIN` to the allowed frontend origin(s), comma-separated when needed.

- Health: <http://localhost:8001/api/health>
- Profile JSON: <http://localhost:8001/api/profile>
- OpenAPI docs: <http://localhost:8001/docs>

### Frontend

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Visit <http://localhost:3000>. Configure `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the API is elsewhere. Select **View resume** to reveal the CV. Open <http://localhost:3000/admin> and sign in with `ADMIN_PASSWORD` to edit the profile shown on the homepage; save changes to publish them immediately. The profile is structured around professional experience, grouped technical skills, awards, and education. No personal details are seeded or fabricated.

The authenticated `/admin` page also accepts files of any type. Uploads are written to `PHOTO_UPLOAD_DIR` (default `./data/photos`), are limited to 100 MB per file, and are not served publicly. Exact duplicate contents in the destination folder are skipped. Set `PHOTO_UPLOAD_MOUNT` to the mounted external-drive root in production; uploads return an unavailable error if that drive is not mounted.

The owner can invite additional upload-only accounts from `/admin`. Invitations are single-use links that expire after seven days; copy and share the link yourself because no email delivery service is configured. The recipient sets a password and signs in at `/upload`. Each account writes only to its own `users/user-<id>` subfolder under `PHOTO_UPLOAD_DIR`; it cannot edit the profile, browse other folders, or invite more accounts. The owner can revoke pending invitations and disable upload accounts. Upload sessions expire after eight hours.

The upload page lists the signed-in account's original filenames, without exposing the generated storage prefix. Invited accounts can see filenames only; they cannot download file contents. In `/admin`, **Browse backup files** identifies accounts by name/email and lets the owner list and download their files. Stored filenames, content hashes, and folder identifiers remain unchanged, including for existing uploads. Downloads require an owner session and are served as attachments; files are never published as public assets.

### GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` builds the frontend as static files and deploys it to GitHub Pages whenever `main` changes. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Add a repository variable named `NEXT_PUBLIC_API_URL` with `https://conradspi4.tailb5b410.ts.net` before deploying. The Pi API is published through Tailscale Funnel and allows the Pages site's origin through `FRONTEND_ORIGIN`.

The frontend uses the Pages base path automatically, including when the repository is published at `https://<owner>.github.io/<repository>/`. The admin editor uses a signed bearer token rather than depending on cross-site cookies, so a custom domain is optional. The Pi service definition is in `deploy/profile-api.service`; it listens only on the Pi's loopback interface. Tailscale Funnel publishes it at `https://conradspi4.tailb5b410.ts.net`.

When the Pi API is unavailable, every route shows a **Preview only** homepage. Navigation, contact links, the hidden admin link, and the theme button are visibly disabled; disabled links have no destination. The first availability check times out after five seconds. Visible pages retry every 30 seconds and when the tab regains focus or the browser reconnects. Normal pages and controls return automatically when the API responds. The preview uses the last public profile loaded in the current page session, or the built-in homepage copy for a first visit while offline. No login or account data is cached for preview mode.

## Database and migrations

Default URL: `sqlite:///./data/profile.db`. SQLAlchemy models, repositories, and services are in `backend/app/`. Alembic is configured in `backend/alembic.ini`; create/apply migrations with `python -m alembic -c backend/alembic.ini revision --autogenerate -m "describe schema change"` and `python -m alembic -c backend/alembic.ini upgrade head` (run with the project environment active). The app creates missing tables on startup for easy local setup. Never add secrets to checked-in environment examples.

## Checks

```powershell
backend/.venv/Scripts/python -m pytest backend/tests
npm --prefix frontend run typecheck
npm --prefix frontend run build
```
