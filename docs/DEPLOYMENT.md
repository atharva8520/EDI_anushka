# Deployment Guide

This document describes how to configure, build, migrate, and operate HackNova in a public deployment environment.

---

## Environment Variables

| Variable | Description | Secret? | Default / Example |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection URI. Automatically normalized from `postgres://` or `postgresql://` to `postgresql+psycopg://`. | **Yes** | `postgresql+psycopg://user:password@host:5432/dbname` |
| `JWT_SECRET` | Secret key used for signing JWT access tokens. In production (`APP_ENV=production`), must NOT be default and must be at least 32 characters long. | **Yes** | 64+ char random hex or base64 string |
| `JWT_ALGORITHM` | Algorithm used for JWT encoding/decoding. | No | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Standard access token lifetime in minutes. | No | `60` |
| `ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER` | Remember-me access token lifetime in minutes. | No | `10080` (7 days) |
| `CORS_ORIGINS` | Comma-separated list of allowed web origins. In production (`APP_ENV=production`), cannot be empty and cannot contain wildcard `*`. | No | `https://hacknova.example.com` |
| `APP_ENV` | Application environment identifier (`production`, `staging`, `development`). Enforces production safeguards when set to `production`. | No | `production` |
| `LLM_PROVIDER` | LLM provider identifier (`stub`, `gemini`, `openai`). | No | `stub` |
| `LLM_API_KEY` | API key for the chosen LLM provider. | **Yes** | Provider API key |
| `LLM_MODEL` | Model identifier to use for LLM evaluations and recommendations. | No | `gpt-4o-mini` |
| `VITE_API_URL` | Frontend API base URL baked at build time. Points to the backend public endpoint. | No | `https://api.hacknova.example.com/api` |

### Optional Operational Variables

| Variable | Description | Secret? |
| :--- | :--- | :---: |
| `ADMIN_EMAIL` | Default email used by `backend/scripts/create_admin.py`. | No |
| `ADMIN_NAME` | Default full name used by `backend/scripts/create_admin.py`. | No |
| `ADMIN_PASSWORD` | Default password used by `backend/scripts/create_admin.py` (minimum 12 characters). | **Yes** |
| `ALLOW_PRODUCTION_SEED` | Must be set to `true` to allow `backend/app/seed.py` in `production`. | No |
| `SEED_ADMIN_PASSWORD` | Mandatory admin password when seeding in production. | **Yes** |
| `SEED_STUDENT_PASSWORD` | Mandatory student accounts password when seeding in production. | **Yes** |

---

## Build & Start Commands

### Backend

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

3. **Start the application server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Frontend

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build static bundle:**
   ```bash
   npm run build
   ```

3. **Publish assets:**
   - Deploy/publish the generated `dist/` directory to your static hosting service.
   - Configure Single Page Application (SPA) fallback rewrite: route all requests `/*` to `/index.html`.

---

## Database Migrations

### Apply Migrations
To bring the database schema up to the latest revision:
```bash
alembic upgrade head
```

### Roll Back One Migration
To revert the most recent migration step:
```bash
alembic downgrade -1
```

---

## Creating the First Admin

To create the initial organizer/admin account, run the CLI utility inside the backend environment:

```bash
python scripts/create_admin.py --email admin@example.com --name "HackNova Admin" --password "StrongAdminPassword123!"
```

Alternatively, supply values via environment variables:
```bash
ADMIN_EMAIL="admin@example.com" ADMIN_NAME="HackNova Admin" ADMIN_PASSWORD="StrongAdminPassword123!" python scripts/create_admin.py
```

- **Validation:** Passwords shorter than 12 characters are refused.
- **Idempotency:** If an admin with the provided email already exists, the script exits safely without making changes.
- **Password Reset:** Pass `--reset-password` to update the password of an existing admin:
  ```bash
  python scripts/create_admin.py --email admin@example.com --password "NewStrongAdminPassword123!" --reset-password
  ```

---

## Known Risks & Limitations

1. **No Login Rate Limiting:**
   The authentication endpoints (`/api/auth/login` and `/api/auth/register`) do not currently enforce rate limiting or IP-level brute-force throttling at the application layer. For public deployments, place a reverse proxy, WAF, or edge gateway (e.g., Cloudflare, NGINX `limit_req`, or AWS WAF) in front of the API to throttle repetitive authentication attempts.

2. **Free-Tier Sleep / Cold Starts:**
   When hosting on free-tier container services (e.g., Render, Railway, Fly.io, or similar platforms), instances may scale down or idle after inactivity. Initial incoming requests will experience cold-start latency or request timeouts while the container spins up and establishes database connection pools.
