# HackNova: End-to-End Project Documentation & Technical Specification Report

---

## Executive Summary

**Project Name:** HackNova  
**Domain:** Autonomous Hackathon & Open Innovation Operating System  
**Architecture:** Full-Stack Decoupled (FastAPI Backend + React 18 TypeScript Vite Frontend + PostgreSQL/SQLite + Groq Cloud AI Engine)  
**Primary Goal:** Transform traditional, fragmented hackathon listings into a unified, AI-assisted execution engine that guides builders from challenge discovery to team matching, agile workspace sprint tracking, AI mentoring, deliverable submission, and transparent multi-criteria rubric judging.

---

## 1. Problem Statement

### 1.1 The Real-World Problem
Every year, hundreds of thousands of developers, researchers, and students participate in hackathons worldwide. However, existing platforms (e.g., Devpost, Devfolio, Unstop) operate primarily as **static announcement boards and passive submission portals**. 

Participants and organizers face critical operational bottlenecks:

1. **The "Solo Builder" Dilemma (Fragmented Team Formation):**
   * Over 60% of interested participants fail to join or drop out because they lack a balanced team.
   * Existing solutions rely on chaotic Discord/Slack channels where finding teammates with complementary skills (e.g., matching a backend engineer with a UI/UX designer and ML specialist) is hit-or-miss.

2. **The "Black Box" 48-Hour Sprint (Zero In-Sprint Guidance):**
   * Once hackathons begin, organizers lose all visibility into what teams are doing.
   * Teams struggle with scope creep, ambiguous challenge requirements, and technical dead-ends without 24/7 mentor access.

3. **Chaotic, Subjective Deliverable Submissions:**
   * Teams scramble to submit scattered links (Google Drive, Loom, GitHub, unformatted demo URLs) into basic forms at the last minute.
   * Judges are overwhelmed by unstructured data with missing repositories or broken demos.

4. **Biased and Non-Standardized Judging:**
   * Traditional scoring often boils down to a generic 1-to-5 star vote without weighted criteria or structured rubrics.
   * Lack of transparency creates dissatisfaction and mistrust among participants.

---

## 2. How HackNova Conquered It (Solution Architecture)

HackNova solves the entire lifecycle through a closed-loop **7-stage autonomous innovation pipeline**:

```mermaid
flowchart TD
    A["1. Public Discovery\n(Hackathons & Challenges)"] --> B["2. AI Matchmaking\n(Skill-Gap & Team Assembly)"]
    B --> C["3. Squad Formation\n(Unique Invite Codes & Roles)"]
    C --> D["4. Agile Workspace\n(Kanban, Audit Logs, Notes)"]
    D --> E["5. 24/7 Groq AI Copilot\n(Task Breakdown & Architecture)"]
    E --> F["6. Deliverable Submissions\n(Multi-Asset Pre-Flight Validation)"]
    F --> G["7. Weighted Rubric Judging\n(Multi-Judge 1-10 Scale)"]
    G --> H["8. Live Podium Leaderboard\n(Gold, Silver, Bronze Rankings)"]
```

1. **Autonomous Team Assembly:** An algorithmic matchmaker evaluates 5 dimensions (unfilled category skill-gaps, depth, challenge domain overlap, preferred roles, and availability) to recommend ideal squad mates with clear, truthful AI explanations.
2. **Dedicated Sprint Workspaces:** Every squad gets an isolated workspace with a drag-and-drop Kanban board, shared architecture scratchpad, MVP pre-flight checklist, and real-time audit activity logs.
3. **24/7 Groq LLM Technical Mentor:** An integrated AI copilot powered by Groq's high-speed inference engine decomposes complex problem statements into actionable Kanban tasks, generates REST API blueprints, and advises on MVP architecture.
4. **Structured Multi-Link Deliverables:** Standardized submission schema capturing GitHub repository URLs, live deployment demos, Loom/video walkthroughs, slide decks, tech stack tags, and architectural notes.
5. **Weighted Criteria Rubric Scoring:** Industry judges and admins evaluate submissions across transparent, weighted criteria (e.g., Innovation 30%, Architecture 25%, Execution 25%, Presentation 20%) on a 1.0–10.0 scale with qualitative feedback.
6. **Instant Podium Leaderboard:** Real-time aggregated score calculation that awards 1st Place (Gold), 2nd Place (Silver), and 3rd Place (Bronze) honors, published directly to the public showcase.

---

## 3. Detailed Feature Breakdown by Module

### Module 1: Authentication, RBAC & Developer Profiles
* **Dual-Role RBAC:** Segregated access for `student` (builders) and `admin` (organizers / lead judges).
* **Cryptographic Security:** Passwords hashed with `bcrypt` (with compatibility patches ensuring zero warnings on Python 3.11/3.12).
* **JWT Token Lifecycles:** 60-minute standard access tokens and 7-day extended tokens via "Remember Me" option.
* **Granular Developer Profile:**
  * Academic data: College, department/branch, graduation year.
  * Technical inventory: Multi-category skills (Backend, Frontend, AI/ML, UI/UX, Data, Presentation) paired with explicit proficiency rankings (`beginner`, `intermediate`, `advanced`).
  * Availability settings: `flexible`, `weekdays`, `weekends`, `limited`.
  * External links: GitHub and portfolio URLs.

### Module 2: Hackathon Catalog & Structured Problem Engine
* **Lifecycle States:** `draft`, `published`, `active`, `completed`, and `archived`.
* **Public Exploration:** Complete access for unauthenticated guests to browse hackathons, problem statements, verified corporate partners, and previous projects.
* **Structured Challenge Statements:**
  * Problem Code (e.g., `PF-MED-01`).
  * Target user personas and workflow pain points.
  * Explicit technical constraints and compliance boundaries.
  * Required and suggested tech stacks.
  * Evaluation rubrics and expected MVP deliverables.

### Module 3: Team Formation & Squad Management
* **Unique Team Identity:** Hackathon-scoped unique team names with cryptographically generated alphanumeric invite codes (e.g., `TR-9X4K2L`).
* **Member Role Delegation:** Role titles (e.g., *Backend Lead*, *AI Engineer*, *Frontend Developer*).
* **Invite Workflows:** In-app invite issuance with `pending`, `accepted`, and `declined` states.
* **Challenge Binding:** Official binding of a hackathon problem statement to the team's project.

### Module 4: Deterministic AI/ML Teammate Matchmaker
* **5-Feature Scoring Engine:**
  $$\text{Score} = w_1 \cdot \text{Gap} + w_2 \cdot \text{Depth} + w_3 \cdot \text{Domain} + w_4 \cdot \text{Role} + w_5 \cdot \text{Avail}$$
* **Instant Calculation:** Computes in $<10\text{ms}$ with zero heavy dependencies (no PyTorch/TensorFlow bloat required on host).
* **Explainable Matching:** Generates dynamic explanations (e.g., *"Fills critical Backend gap with advanced FastAPI proficiency & matches your Healthcare domain"*).

### Module 5: Autonomous Sprint Workspace
* **Drag-and-Drop Kanban:** Columns for `Backlog`, `In Progress`, `Review`, and `Done`.
* **Task Attributes:** Priority flags (`low`, `medium`, `high`, `urgent`), assignees, and due dates.
* **Pre-Flight Submission Checklist:** Real-time checklist ensuring repo URLs, demo links, and video pitch requirements are fulfilled.
* **Audit Activity Timeline:** Immutable audit log tracking task status changes, team member additions, and workspace updates.

### Module 6: 24/7 Groq AI Sprint Copilot
* **Ultra-Fast LLM Inference:** Response generation via Groq API within 1–2 seconds.
* **Capabilities:**
  * Automatic challenge decomposition into structured Kanban sprint tasks.
  * Architecture & data model recommendations.
  * API contract generation (FastAPI / Express schemas).
  * Pitch review and rubric pre-evaluation.
* **Deterministic Fallback:** Automatic switch to an intelligent offline stub if internet connectivity or API limits are reached.

### Module 7: Deliverables, Judge Rubrics & Live Leaderboard
* **Multi-Asset Deliverable Submission:**
  * Source code repository URL (GitHub/GitLab).
  * Deployed live demo URL.
  * Loom/YouTube video walkthrough link.
  * Slide deck / presentation link.
  * Tech stack tags and architectural notes.
* **Judge Scoring Modal:** Slider-based 1.0–10.0 scoring across weighted criteria with mandatory judge feedback notes.
* **Podium Leaderboard:** Real-time calculation of weighted average scores, with Gold, Silver, and Bronze podium cards.

---

## 4. Technology Stack & Implementation Details

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | Core UI view library |
| **Language (Client)** | TypeScript | 5.5.3 | End-to-end type safety |
| **Build Tool** | Vite | 6.4.6 | Lightning-fast HMR and bundle compilation |
| **Styling** | Tailwind CSS | 3.4.17 | Obsidian dark violet palette, custom glow utilities |
| **Icons** | Lucide React | 0.344.0 | Modern interface iconography |
| **Routing** | React Router DOM | 6.22.3 | Client-side routing with Public & Protected layouts |
| **Backend Framework** | FastAPI | 0.115.6 | Async Python web framework |
| **Language (Server)** | Python | 3.11+ | Backend application logic |
| **ASGI Server** | Uvicorn | 0.34.0 | High-performance asynchronous server |
| **ORM** | SQLAlchemy | 2.0.36 | Modern declarative mapped-column ORM |
| **Database Migrations** | Alembic | 1.14.0 | Automated schema version control |
| **Database Engine** | PostgreSQL / SQLite | psycopg 3.2.3 | Production cloud DB / Local development DB |
| **Token Authentication** | Python-Jose | 3.3.0 | Cryptographic JWT token encoding & decoding |
| **Password Hashing** | Passlib & Bcrypt | 1.7.4 / 4.2.1 | Industry-standard password hashing |
| **HTTP Client** | HTTPX | 0.28.1 | Async communication with Groq LLM API |
| **Test Suite** | Pytest | 8.3.4 | 131 automated unit and integration tests |

---

## 5. AI & Machine Learning Specifications

### 5.1 Teammate Matchmaking Model (Deterministic ML Engine)
* **Design Philosophy:** Rather than using unpredictable black-box neural networks that demand gigabytes of server RAM, HackNova uses a **multi-dimensional deterministic heuristic scoring algorithm**.
* **Mathematical Weighting:**
  * **Skill Gap Complement ($w = 0.35$):** Evaluates which skill categories are currently missing from the squad and scores candidates that fill these gaps.
  * **Skill Depth ($w = 0.20$):** Weights candidate experience (`advanced` = 1.0, `intermediate` = 0.6, `beginner` = 0.3).
  * **Domain Overlap ($w = 0.20$):** Jaccard-based intersection of the team's selected challenge domains vs candidate interests.
  * **Preferred Role Fit ($w = 0.15$):** Matches candidate desired roles against open squad needs.
  * **Availability Match ($w = 0.10$):** Measures congruence with the dominant availability mode of active squad members.
* **Performance:** Executes in $<10\text{ms}$ on standard CPU cores with negligible RAM footprint.

### 5.2 Groq LLM Integration (AI Sprint Copilot)
* **Provider:** Groq Cloud API (`https://api.groq.com/openai/v1/chat/completions`)
* **Active Model:** `openai/gpt-oss-120b` (also compatible with `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`)
* **API Key Configuration:** Located in `.env` as `LLM_API_KEY=gsk_...`
* **Transport:** Built using `httpx` with timeout guardrails (12.0s) and structured JSON system prompting.
* **Fallback Stub:** In the event of network disruption or expired API quota, `_generate_stub_response()` deterministically extracts prompt intent and outputs markdown-formatted sprint task lists or architecture blueprints.

---

## 6. What Makes HackNova Different? (Competitive Analysis)

| Capability | Devpost / Devfolio | Unstop / HackerEarth | HackNova |
|---|---|---|---|
| **Primary Nature** | Static listing directory | Assessment / contest portal | **Complete Autonomous Operating Engine** |
| **Teammate Discovery** | External Slack / Discord | Basic forum postings | **5-Dimension Algorithmic Skill-Gap Matchmaker with AI Explanations** |
| **Sprint Execution** | None (teams work in third-party tools) | None | **Integrated Kanban Workspace, Notes, Audit Logs & Checklists** |
| **Technical Mentorship** | Dependent on human mentors | Rare / manual | **24/7 Groq LLM Copilot for Instant Task Breakdown & Architecture** |
| **Deliverable Submissions** | Basic URL form | Basic archive upload | **Multi-Asset Schema (Repo, Live Demo, Loom Pitch, Slides, Tech Stack)** |
| **Judging Transparency** | Generic 1–5 star ratings | Manual spreadsheet entries | **Weighted Multi-Criteria 1.0–10.0 Rubric Scoring with Judge Feedback** |
| **Public Accessibility** | Login often required | Login strictly required | **Full Public Exploration of Events, Challenges, and Leaderboard** |
| **UI Aesthetics** | Legacy corporate grey/white | Standard dashboard | **Cyber-Violet Obsidian Design with Glassmorphic Live Badges** |

---

## 7. Authentication, RBAC & Admin Console

### 7.1 Role-Based Access Control Matrix

| Feature / Action | Guest (Unauthenticated) | Student (Builder) | Admin / Judge |
|---|:---:|:---:|:---:|
| Browse Hackathons & Challenges | Yes | Yes | Yes |
| View Public Leaderboard & Showcase | Yes | Yes | Yes |
| Explore Verified Partner Companies | Yes | Yes | Yes |
| Create & Join Squads | No (Redirects to Login) | Yes | Yes |
| Access Kanban Sprint Workspace | No | Yes (Own Squad) | Yes (Global Oversight) |
| Prompt Groq AI Copilot | No | Yes (Own Squad) | Yes |
| Submit Final Deliverables | No | Yes (Team Leader) | Yes |
| Score Submissions on Rubrics | No | No | **Yes (Exclusive)** |
| Create & Publish Hackathons | No | No | **Yes (Exclusive)** |
| Create & Edit Problem Statements | No | No | **Yes (Exclusive)** |

### 7.2 Pre-Seeded Accounts for Testing

| Account Role | Email Address | Password | Permissions & Context |
|---|---|---|---|
| **Admin / Lead Judge** | `admin@hacknova.dev` | `Admin@12345` | Global admin console, criteria rubric scoring, hackathon creation |
| **Student (Team Lead)** | `aditi@hacknova.dev` | `Student@123` | Leader of *Signal Room* squad, project *Emergency Capacity Signal* (Score: 92/100) |
| **Student (Teammate)** | `rahul@hacknova.dev` | `Student@123` | Frontend specialist in *Signal Room* squad |
| **Student (Candidate)** | `meera@hacknova.dev` | `Student@123` | AI/ML candidate available for matchmaking |
| **Student (Candidate)** | `kabir@hacknova.dev` | `Student@123` | Full-stack cloud candidate available for matchmaking |

---

## 8. Database Architecture & Entity Relationships

The database utilizes 20 normalized tables with foreign-key constraints and cascade rules:

```mermaid
erDiagram
    USERS ||--o| PROFILES : has
    USERS ||--o{ USER_SKILLS : possesses
    USERS ||--o{ TEAM_MEMBERS : joins
    HACKATHONS ||--o{ HACKATHON_PROBLEMS : contains
    HACKATHONS ||--o{ JUDGING_CRITERIA : defines
    HACKATHONS ||--o{ TEAMS : hosts
    TEAMS ||--o{ TEAM_MEMBERS : includes
    TEAMS ||--o| TEAM_PROBLEM_SELECTIONS : selects
    TEAMS ||--o| PROJECTS : builds
    PROJECTS ||--o{ PROJECT_EVALUATIONS : receives
    PROJECT_EVALUATIONS ||--o{ CRITERION_SCORES : breaks_down
    JUDGING_CRITERIA ||--o{ CRITERION_SCORES : grades
```

* **Core Tables:** `users`, `profiles`, `skills`, `user_skills`, `hackathons`, `hackathon_problems`, `judging_criteria`, `teams`, `team_members`, `team_problem_selections`, `workspace_tasks`, `workspace_activity_logs`, `projects`, `project_evaluations`, `criterion_scores`.

---

## 9. Zero-Cost Cloud Deployment Guide

HackNova is engineered to run permanently on free-tier cloud infrastructure without memory crashes or subscription costs:

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│      Neon.tech         │      │       Render.com       │      │       Vercel           │
│  Serverless Postgres   │◄────►│  FastAPI Python Web    │◄────►│  Vite React Edge CDN   │
│  (Always-Free Tier)    │      │  (512MB RAM Free Tier) │      │  (Global Free Tier)    │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Database:** [Neon.tech](https://neon.tech) Serverless PostgreSQL (instant URI, SSL enabled, auto-normalized by `normalize_database_url`).
2. **Backend:** [Render.com](https://render.com) Python Web Service (`Dockerfile` / `Procfile` / `render.yaml` pre-configured in repository).
3. **Frontend:** [Vercel](https://vercel.com) Edge Hosting (with `vercel.json` and `_redirects` SPA rewrite rules).

---

## 10. Verification & Test Suite Summary

* **Backend Test Suite:** **131 tests passing** (`pytest tests -q`) in 153 seconds.
  * Authentication, JWT validity, and RBAC authorization guards.
  * Hackathon discovery, filtering, and problem statement retrieval.
  * Squad creation, alphanumeric invite code generation, and member acceptance.
  * 5-dimension deterministic matchmaker feature scoring.
  * Workspace Kanban task movement, pre-flight checks, and activity audit logging.
  * Groq LLM copilot task generation and deterministic fallback resilience.
  * Deliverable submissions, multi-criteria rubric evaluation, and leaderboard ranking calculations.
* **Frontend Build:** `tsc -b && vite build` compiled **2,470 modules** with **zero errors**.
* **Database Snapshot:** Complete export of all 158 rows across all 20 tables persisted in `backend/database_snapshot_export.json`.

---

*Authored for the HackNova Open Innovation Platform.*
