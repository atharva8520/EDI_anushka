# HackNova - Autonomous Hackathon & Open Innovation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-psycopg3-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Groq AI](https://img.shields.io/badge/Groq%20AI-Llama3%20%2F%20GPT--OSS-F55036.svg?style=flat)](https://groq.com)
[![Pytest](https://img.shields.io/badge/Tests-131%20Passing-success.svg?style=flat)](https://pytest.org)

HackNova is a modern, full-stack open innovation and hackathon operating platform designed to take engineering teams from initial challenge discovery through AI teammate matchmaking, agile sprint execution with an AI copilot, deliverable submissions, and weighted rubric judging to the podium leaderboard.

The platform combines a dark obsidian cyber-violet aesthetic with public exploration—allowing visitors, sponsors, and participants to freely explore hackathons, official problem statements, and real-time standings before signing in or forming teams.

---

## Table of Contents

- [Platform Architecture](#platform-architecture)
- [Key Features & Modules](#key-features--modules)
  - [Module 1: Authentication & User Profiles](#module-1-authentication--user-profiles)
  - [Module 2: Hackathons & Problem Statement Engine](#module-2-hackathons--problem-statement-engine)
  - [Module 3: Squad Assembly & Invite Management](#module-3-squad-assembly--invite-management)
  - [Module 4: AI/ML Teammate Matchmaker & Scoring](#module-4-aiml-teammate-matchmaker--scoring)
  - [Module 5: Project Workspace & Agile Sprint Board](#module-5-project-workspace--agile-sprint-board)
  - [Module 6: Groq LLM AI Sprint Copilot](#module-6-groq-llm-ai-sprint-copilot)
  - [Module 7: Deliverable Submissions, Rubric Judging & Podium](#module-7-deliverable-submissions-rubric-judging--podium)
- [Tech Stack](#tech-stack)
- [Pre-Seeded Accounts for Testing](#pre-seeded-accounts-for-testing)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Running Automated Tests](#running-automated-tests)
- [Free Tier Cloud Deployment Guide](#free-tier-cloud-deployment-guide)
  - [1. Database: Neon (Free Serverless PostgreSQL)](#1-database-neon-free-serverless-postgresql)
  - [2. Backend: Render (Free Web Service)](#2-backend-render-free-web-service)
  - [3. Frontend: Vercel (Free Edge CDN)](#3-frontend-vercel-free-edge-cdn)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

---

## Platform Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               HackNova Client (Vite + React)           │
                    │   Obsidian Violet Theme • Public Discovery • Workspace │
                    └───────────────────────────┬────────────────────────────┘
                                                │ REST JSON / JWT
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │              FastAPI Backend Application               │
                    │  API Router • Auth (bcrypt/JWT) • CORS • Error Handlers│
                    └───────────┬───────────────────────────────┬────────────┘
                                │                               │
                ┌───────────────┴───────────────┐               │
                ▼                               ▼               ▼
 ┌─────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐
 │  SQLAlchemy 2.0 / Alembic   │ │     Deterministic ML       │ │    Groq Cloud API          │
 │  PostgreSQL (psycopg3) or   │ │  Teammate Matchmaker       │ │  Ultra-Low Latency LLM     │
 │  SQLite local database      │ │  (Skill Gap & TF-IDF Score)│ │  (openai/gpt-oss-120b)     │
 └─────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
```

---

## Key Features & Modules

### Module 1: Authentication & User Profiles
- **Role-Based Access Control (RBAC):** Distinct permissions for `student` (builders) and `admin` (organizers / judges).
- **Secure Password Hashing:** Powered by `passlib` with `bcrypt` (includes monkeypatched version compatibility for clean production logs).
- **Session Security:** Standard 60-minute JWT session tokens with optional 7-day "Remember Me" extended tokens.
- **Rich Builder Profiles:** Captures college, branch, year, bio, GitHub/portfolio URLs, weekly availability (`flexible`, `weekdays`, `weekends`, `limited`), categorized skills with proficiency levels (`beginner`, `intermediate`, `advanced`), preferred roles, and domain interests.

### Module 2: Hackathons & Problem Statement Engine
- **Lifecycle Statuses:** `draft`, `published`, `active`, `completed`, and `archived`.
- **Comprehensive Event Metadata:** Start/end dates, registration deadlines, hybrid/in-person city locations, team size constraints (e.g. 2–4 members), total prize pools, and rules.
- **Structured Problem Statements:** Unique challenge codes (e.g., `PF-MED-01`), constraints, target users, expected outcomes, required technologies, and evaluation criteria.
- **Public Browsing:** Guests can explore events, problem statements, verified partner companies, and previous project showcases without being forced to log in.

### Module 3: Squad Assembly & Invite Management
- **Autonomous Squad Creation:** Unique team name enforcement per hackathon with automatically generated alphanumeric invite codes.
- **Role Assignment:** Squad leadership privileges, member role designations (e.g. *Backend Lead*, *Frontend*, *ML Engineer*).
- **Invite Lifecycle:** Direct email invitations with `pending`, `accepted`, and `declined` states, plus public invite code join workflows.
- **Challenge Selection:** Official binding of a hackathon problem statement to the team workspace.

### Module 4: AI/ML Teammate Matchmaker & Scoring
- **Deterministic 5-Dimension Feature Scoring:**
  1. **Skill Gap Complement:** Identifies unfulfilled skill categories (Frontend, Backend, AI/ML, UI/UX, Data) in the squad and rewards candidates possessing them.
  2. **Skill Depth:** Weights candidates by proficiency level (Advanced = 1.0, Intermediate = 0.6, Beginner = 0.3).
  3. **Domain Alignment:** Measures overlap with the team's selected challenge domains (Healthcare, Web3, FinTech, etc.).
  4. **Preferred Role Fit:** Evaluates alignment between squad vacancies and the candidate's preferred roles.
  5. **Availability Mode:** Aligns the candidate's weekly bandwidth with the squad's dominant availability mode.
- **Zero Bloat & Instant Compute:** Runs purely in Python without heavy C-extensions, executing in sub-10ms and fitting comfortably inside 512MB RAM free-tier containers.
- **Transparent AI Explanations:** Generates human-readable explanations detailing why a teammate was recommended.

### Module 5: Project Workspace & Agile Sprint Board
- **Full Drag-and-Drop Kanban Board:** Track tasks across columns (`Backlog`, `In Progress`, `Review`, `Done`).
- **Rich Task Metadata:** Priority levels (`low`, `medium`, `high`, `urgent`), assignee user badges, and due dates.
- **Real-Time Audit Activity Log:** Chronological event timeline recording task movements, member joins, and workspace edits.
- **Pre-Flight Checklist:** Validates required MVP deliverables before final submission.
- **Team Notes & Architecture Scratchpad:** Shared Markdown workspace for design documents and technical specs.

### Module 6: Groq LLM AI Sprint Copilot
- **Ultra-Fast Generation:** Powered by Groq's high-throughput inference engine (`openai/gpt-oss-120b` or `llama-3.3-70b-versatile`).
- **Intelligent Prompt Capabilities:**
  - Automated challenge statement decomposition into bite-sized Kanban tasks.
  - MVP architecture design and tech stack selection advice.
  - RESTful API structure generation.
  - Pre-submission pitch review.
- **Resilient Fallback:** Includes a deterministic offline generator if the external network is unreachable or the API key is unconfigured.

### Module 7: Deliverable Submissions, Rubric Judging & Podium
- **Final Submission Form:** Teams submit source repository URLs (GitHub/GitLab), live preview URLs, video pitch demos (Loom/YouTube), pitch deck links (Slides), tech stack tags, and architectural notes.
- **Judge Rubric Scoring Interface:** Admins and judges score projects across weighted evaluation criteria (Innovation, Architecture, Execution, Pitch) on a 1.0–10.0 scale with qualitative feedback.
- **Podium & Live Leaderboard:** Real-time aggregated rankings with Gold (1st), Silver (2nd), and Bronze (3rd) medal displays, available publicly to participants and sponsors.

---

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 6 with React SWC
- **Styling:** Tailwind CSS with custom neon glow filters & glassmorphism
- **Routing:** React Router v6 with `PublicLayout` and `ProtectedRoute` guards
- **Icons:** Lucide React
- **HTTP Client:** Axios with JWT auto-injection interceptors

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Server:** Uvicorn with async event loop
- **ORM:** SQLAlchemy 2.0 (mapped column syntax)
- **Migrations:** Alembic
- **Database Driver:** `psycopg[binary]` (v3) for PostgreSQL / SQLite driver for local testing
- **Authentication:** `python-jose` (JWT) + `passlib[bcrypt]`
- **Validation:** Pydantic v2 & `pydantic-settings`
- **Testing:** Pytest with HTTPX TestClient

---

## Pre-Seeded Accounts for Testing

The local database (`backend/hacknova.db`) and seed script (`python -m app.seed`) include pre-configured accounts:

| Role | Full Name | Email | Password | Context |
|---|---|---|---|---|
| **Admin / Judge** | HackNova Organizer | `admin@hacknova.dev` | `Admin@12345` | Global admin access, criteria rubric scoring, hackathon management |
| **Student / Lead** | Aditi Sharma | `aditi@hacknova.dev` | `Student@123` | Leader of squad **Signal Room** (Project: *Emergency Capacity Signal*, Evaluated at 92.0/100) |
| **Student** | Rahul Mehta | `rahul@hacknova.dev` | `Student@123` | Member of squad **Signal Room** (Frontend Specialist) |
| **Student** | Meera Iyer | `meera@hacknova.dev` | `Student@123` | Candidate pool (AI/ML & NLP focus) |
| **Student** | Kabir Joshi | `kabir@hacknova.dev` | `Student@123` | Candidate pool (Full Stack & Cloud focus) |

---

## Local Development Setup

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18.0.0 or higher
- **npm:** 9.0.0 or higher
- **Git**

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # On macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

5. **(Optional) Seed demo hackathons, teams, and accounts:**
   ```bash
   python -m app.seed
   ```

6. **Start the backend development server:**
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be available at `http://127.0.0.1:8000`.

---

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install node dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   The frontend UI will be live at `http://127.0.0.1:5173`.

---

### Environment Variables

A template `.env` is loaded by the backend. Customize variables as needed:

| Variable | Default Value | Description |
|---|---|---|
| `APP_ENV` | `development` | Set to `production` in production (enforces strict JWT secret length & CORS) |
| `DATABASE_URL` | `sqlite:///./hacknova.db` | Database connection string (PostgreSQL or SQLite) |
| `JWT_SECRET` | `change-me-to-a-long-random-string` | Secret key for signing JWT tokens (min 32 characters in production) |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiration for standard logins (in minutes) |
| `ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER` | `10080` | Token expiration for "Remember Me" (7 days) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed frontend origins |
| `LLM_PROVIDER` | `groq` | Set to `groq` to use Groq LLM or `stub` for deterministic offline fallback |
| `LLM_MODEL` | `openai/gpt-oss-120b` | Target Groq model identifier |
| `LLM_API_KEY` | `gsk_...` | Groq Cloud API Key |
| `VITE_API_URL` | `http://localhost:8000/api` | Base API endpoint for the frontend client |

---

## Running Automated Tests

Run the full end-to-end backend test suite:
```bash
cd backend
pytest tests -q
```
*131 passing tests covering all routes, database transactions, permissions, and judging logic.*

To verify frontend TypeScript types and build:
```bash
cd frontend
npm run build
```

---

## Free Tier Cloud Deployment Guide

HackNova is engineered to run seamlessly on 100% free cloud tiers without database timeouts or memory crashes.

### 1. Database: Neon (Free Serverless PostgreSQL)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a project named `hacknova` and copy the connection string:
   ```text
   postgresql://hacknova_owner:password@ep-xyz.us-east-2.aws.neon.tech/hacknova?sslmode=require
   ```
3. Neon includes SSL and never sleeps, making it ideal for FastAPI's connection pool.

### 2. Backend: Render (Free Web Service)
A pre-configured [`render.yaml`](file:///c:/Users/Admin/EDI_TY/EDI_anushka/render.yaml), [`Dockerfile`](file:///c:/Users/Admin/EDI_TY/EDI_anushka/backend/Dockerfile), and [`Procfile`](file:///c:/Users/Admin/EDI_TY/EDI_anushka/backend/Procfile) are included in this repository.

1. Create a free account on [render.com](https://render.com) and link your GitHub repository.
2. Click **New +** &rarr; **Web Service**.
3. Select your repository and configure:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free` (512MB RAM)
4. Add Environment Variables:
   - `APP_ENV`: `production`
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   - `JWT_SECRET`: *(A secure 32+ character random string)*
   - `JWT_ALGORITHM`: `HS256`
   - `CORS_ORIGINS`: `https://your-frontend-domain.vercel.app`
   - `LLM_PROVIDER`: `groq`
   - `LLM_MODEL`: `openai/gpt-oss-120b`
   - `LLM_API_KEY`: *(Your Groq API key)*
5. Click **Create Web Service**. After deployment finishes, open the Render **Shell** tab and run `python -m app.seed` to populate the initial hackathons and demo teams.

### 3. Frontend: Vercel (Free Edge CDN)
SPA rewrite rules are included in [`frontend/vercel.json`](file:///c:/Users/Admin/EDI_TY/EDI_anushka/frontend/vercel.json) and [`frontend/public/_redirects`](file:///c:/Users/Admin/EDI_TY/EDI_anushka/frontend/public/_redirects).

1. Sign up on [vercel.com](https://vercel.com) and click **Add New...** &rarr; **Project**.
2. Select your GitHub repository.
3. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add the Environment Variable:
   - `VITE_API_URL`: `https://<your-render-backend-name>.onrender.com/api`
5. Click **Deploy**. Your HackNova frontend is now live globally with zero hosting fees.

---

## API Documentation

When the backend is running, interactive API documentation is automatically generated:

- **Swagger UI (Interactive Playground):** `http://127.0.0.1:8000/docs`
- **ReDoc (Specification Reference):** `http://127.0.0.1:8000/redoc`
- **OpenAPI Schema (JSON):** `http://127.0.0.1:8000/openapi.json`

Key Endpoint Categories:
- `/api/auth/*`: Registration, login, JWT token issuance, session refresh.
- `/api/profile/*`: Candidate portfolio, availability, skills matrix, domain interests.
- `/api/hackathons/*`: Hackathon listings, problem statement queries, criteria rubrics.
- `/api/teams/*`: Squad creation, member management, invite codes, problem selection.
- `/api/ai/*`: Candidate recommendation engine, Groq copilot task decomposition.
- `/api/workspace/*`: Kanban tasks, sprint notes, checklist validation, activity audit logs.
- `/api/projects/*`: Final deliverable submissions, judge rubric scoring, leaderboard rankings.

---

## Contributing

1. **Main Branch Stability:** The `main` branch must always remain in a working, deployable state.
2. **Feature Branches:** Develop all new features on dedicated branches (`feature/module-name`).
3. **Atomic Commits:** Follow conventional commit standards (`feat:`, `fix:`, `test:`, `docs:`).
4. **Secrets Hygiene:** Never commit secrets, passwords, or live `.env` files into source control.
5. **Quality Gate:** Ensure all 131 tests pass (`pytest tests -q`) and `npm run build` compiles cleanly before opening pull requests.

---

*Built with passion for innovators, builders, and hackathon communities worldwide.*
