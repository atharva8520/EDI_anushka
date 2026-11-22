# HackNova

> Autonomous Hackathon Platform with AI Squad Matching, Real-Time Workspace, Groq LLM Copilot & Judging Leaderboard.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791)](https://www.postgresql.org)
[![Groq AI](https://img.shields.io/badge/AI-Groq%20Cloud-F55036)](https://groq.com)
[![Tests](https://img.shields.io/badge/Tests-131%20Passed-brightgreen)](https://pytest.org)

---

## Key Features

- **Public Event Discovery:** Browse hackathons, problem statements, leaderboard, and companies without login.
- **AI Teammate Matchmaker:** 5-dimension recommendation algorithm (skills, depth, domains, roles, availability).
- **Autonomous Workspace:** Agile Kanban board with task priority, shared notes, checklists, and audit logging.
- **24/7 AI Sprint Copilot:** Powered by Groq LLM for instant challenge breakdown and architecture advice.
- **Deliverables & Judging:** Submit code, demo, slides, and video pitch; weighted 1.0–10.0 rubric evaluation.
- **Live Podium Leaderboard:** Real-time Gold, Silver, and Bronze rankings.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI, Python 3.11, Uvicorn, Pydantic v2 |
| **Database & ORM** | PostgreSQL (`psycopg3`) / SQLite, SQLAlchemy 2.0, Alembic |
| **AI / ML** | Groq Cloud API (`openai/gpt-oss-120b`), deterministic skill-gap scoring |
| **Security** | JWT auth (60m / 7d Remember Me), `passlib` with `bcrypt` |

---

## Demo Test Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin / Judge** | `admin@hacknova.dev` | `Admin@12345` | Global admin & judging rubric scoring |
| **Student / Lead** | `aditi@hacknova.dev` | `Student@123` | Signal Room lead (submitted project, score: 92/100) |
| **Student** | `rahul@hacknova.dev` | `Student@123` | Signal Room teammate |

---

## Quick Start (Run Locally)

### 1. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Mac/Linux:
# source .venv/bin/activate

# Install dependencies & run migrations
pip install -r requirements.txt
alembic upgrade head

# Seed initial hackathons and demo accounts
python -m app.seed

# Start backend server (http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend

# Install packages & run development server (http://127.0.0.1:5173)
npm install
npm run dev
```

---

## Testing

```bash
# Backend tests (all 131 tests)
cd backend
pytest tests -q

# Frontend production build
cd frontend
npm run build
```

---

## Free Cloud Deployment

| Component | Platform | Build / Start Command | Env Variables |
|---|---|---|---|
| **Database** | [Neon.tech](https://neon.tech) (Free Postgres) | Instant cloud database URI | None |
| **Backend** | [Render.com](https://render.com) (Free Web Service) | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `DATABASE_URL`, `JWT_SECRET`, `LLM_API_KEY`, `CORS_ORIGINS` |
| **Frontend** | [Vercel](https://vercel.com) (Free Edge CDN) | `npm run build` (Root: `frontend`, Output: `dist`) | `VITE_API_URL=https://<your-backend>.onrender.com/api` |

---

## API Docs

With the backend running:
- **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
