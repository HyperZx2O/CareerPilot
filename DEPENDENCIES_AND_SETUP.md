# Dependencies & Setup — CareerPilot

## 1. Project Goals

CareerPilot is an **AI-first career operating system** that helps job seekers:

1. **Search live jobs** across multiple APIs (JSearch for Bangladesh, Adzuna globally)
   with AI-powered fit scores that compare your CV against each job description.
2. **Upload and parse CVs** (PDF/DOCX) — auto-extract sections (experience, education,
   skills, projects) and embed them into a Pinecone vector store for semantic search.
3. **Get AI career coaching** via a RAG (Retrieval-Augmented Generation) chat assistant
   grounded in your actual CV, applications, todos, and goals.
4. **Track applications** on a Kanban board (Applied → Interviewing → Offer → Rejected)
   with todos and goals.
5. **Generate career roadmaps and cover letters** using Groq LLM (Llama 3.3 70B).
6. **View a dashboard** with weekly stats, streak tracking, live job matches, and
   inactivity nudges.

The entire system is designed to work **without any paid API keys** during development —
every feature has a deterministic fallback that produces realistic-but-mock data when
external services are unavailable.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Next.js 14 Frontend                        │
│  React 18 + TypeScript + TailwindCSS + Zustand + Framer      │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Pages   │ │  Store  │ │  api.ts  │ │   Components  │   │
│  │ (App Rtr)│ │(Zustand)│ │(apiFetch)│ │   (shadcn/UI) │   │
│  └──────────┘ └─────────┘ └──────────┘ └───────────────┘   │
├──────────────────────────────────────────────────────────────┤
│                 FastAPI Backend (Python)                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Routers  │ │   Services   │ │ Auth.py  │ │ Middleware  │  │
│  │ (7 REST) │ │ (RAG/Goals…) │ │(JWT+Dev) │ │(Rate/CORS) │  │
│  └──────────┘ └──────────────┘ └──────────┘ └────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                    Integrations Layer                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │  job_hunter  │ │  fit_score   │ │ embeddings_adapter   │  │
│  │ (JSearch/Adz)│ │(cosine + LLM)│ │(sentence-transform)  │  │
│  └──────────────┘ └──────────────┘ └──────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                      Data Layer                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Supabase    │ │   Pinecone   │ │    Redis     │         │
│  │ (PostgreSQL) │ │ (Vector DB)  │ │   (Cache)    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Dependency List

### 3.1 Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.0 | React framework with App Router |
| `react` | 18.3.0 | UI library |
| `react-dom` | 18.3.0 | React DOM renderer |
| `typescript` | ^5.3.0 | Type safety |
| `tailwindcss` | ^3.4.0 | Utility-first CSS |
| `tailwind-merge` | ^3.6.0 | Merge Tailwind classes safely |
| `tw-animate-css` | ^1.4.0 | CSS-only animations |
| `framer-motion` | ^12.40.0 | Declarative animations |
| `zustand` | ^4.5.0 | Lightweight global state |
| `lucide-react` | ^1.17.0 | Icon library (tree-shakeable) |
| `recharts` | ^3.8.1 | Dashboard charts |
| `react-markdown` | ^10.1.0 | Render AI chat markdown |
| `remark-gfm` | ^4.0.0 | GitHub-flavored markdown for chat |
| `remark-math` | ^6.0.0 | Math rendering in chat |
| `rehype-katex` | ^7.0.1 | KaTeX math renderer |
| `class-variance-authority` | ^0.7.1 | Component variant management |
| `clsx` | ^2.1.1 | Conditional class names |
| `@base-ui/react` | ^1.5.0 | Headless accessible components |
| `@types/react` | ^18.2.0 | React type definitions |
| `@types/react-dom` | ^18.2.0 | ReactDOM type definitions |
| `@types/node` | ^20.11.0 | Node type definitions |
| `autoprefixer` | ^10.4.0 | PostCSS vendor prefixes |
| `postcss` | ^8.4.0 | CSS processor |
| `eslint` | ^8.57.0 | Linting |
| `eslint-config-next` | 14.2.0 | Next.js ESLint rules |
| `prettier` | ^3.2.5 | Code formatting |

### 3.2 Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.136.3 | Async web framework |
| `uvicorn` | 0.22.0 | ASGI server |
| `pydantic` | 2.12.5 | Request/response validation |
| `httpx` | 0.28.1 | Async HTTP client (external APIs) |
| `requests` | 2.32.5 | Sync HTTP client (JSearch, JWKS) |
| `python-dotenv` | 1.0.1 | `.env` file loading |
| `pinecone-client` | 6.0.0 | Vector database client |
| `SQLAlchemy` | 2.0.50 | ORM for PostgreSQL |
| `aiosqlite` | 0.22.1 | Async SQLite (dev DB) |
| `asyncpg` | 0.31.0 | Async PostgreSQL driver (prod) |
| `redis` | 7.3.0 | Rate limiting backend |
| `python-jose[cryptography]` | 3.5.0 | JWT verification (Clerk) |
| `pypdf` | 6.9.2 | PDF text extraction (CV parsing) |
| `python-multipart` | 0.0.9 | File upload handling |
| `groq` | 0.15.0 | LLM inference client |
| `svix` | 1.63.0 | Clerk webhook verification |
| `sentry-sdk` | 2.30.0 | Error tracking |
| `supabase` | 2.10.0 | Supabase REST API client |
| `pytest` | 8.3.4 | Test framework |

### 3.3 External Services

| Service | Purpose | Required for MVP? | Free Tier? |
|---------|---------|-------------------|------------|
| **Supabase** (PostgreSQL) | Database for users, CVs, applications, todos, goals, chat, activity | **Yes** | 500 MB, 50k rows |
| **JSearch** (openwebninja) | Primary job search API (supports Bangladesh) | No (falls back to Adzuna) | 100 req/day |
| **Adzuna** | Fallback job search API (gb, us, au, etc.) | No (app works without jobs) | 500 req/day |
| **Groq** | LLM inference for chat, fit score reasons, cover letters, roadmaps | No (deterministic fallback) | Free (rate-limited) |
| **Pinecone** | Vector store for CV embeddings + similarity search | No (deterministic fallback) | 100k vectors free |
| **Clerk** | User authentication (JWT issuance) | No (dev token bypass) | 5k users free |
| **Redis** | Rate limiting | No (disabled in dev) | Local (free) |
| **Sentry** | Error tracking | No | 5k events/month |

**Key design principle**: Every external service has a fallback. The app boots and
works with **zero API keys configured**.

---

## 4. Setup Instructions

### 4.1 Prerequisites

- **Python 3.11+** with `uv` (recommended) or `pip`
- **Node.js 20+** with `npm`
- **Git**

### 4.2 Quick Start (One Command)

**Windows:**
```batch
start.bat
```

**macOS/Linux:**
```bash
./start.sh
```

### 4.3 Manual Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd CareerPilot

# 2. Configure environment variables
cp .env.example .env
# Edit .env — see Section 4.4 below

# 3. Set up Python virtual environment
uv venv
uv pip install -r backend/requirements.txt
uv pip install -r integrations/requirements.txt

# 4. Set up frontend
cd frontend
npm install
cd ..

# 5. Start the backend (in one terminal)
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 6. Start the frontend (in another terminal)
cd frontend && npm run dev
```

The app is now available at **http://localhost:3000** with the backend at
**http://localhost:8000** and interactive API docs at **http://localhost:8000/docs**.

### 4.4 Environment Configuration

Copy `.env.example` to `.env` and fill in the keys. Only **Supabase** is strictly
required — everything else has a working fallback.

**Minimal `.env` (all features work with mock data):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DEV_DEMO_USER_ENABLED=true
```

**Full `.env` (all real features enabled):**
```env
# Job Search
JSEARCH_API_KEY=your_key_here          # Primary for Bangladesh
ADZUNA_APP_ID=your_id_here             # Fallback for other countries
ADZUNA_APP_KEY=your_key_here

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# Vector Store
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=careerpilot-cv
EMBED_DIM=768

# LLM
GROQ_API_KEY=gsk_...                   # AI chat, fit reasons, roadmaps

# Auth (optional — dev token works without these)
CLERK_JWKS_URL=https://...clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://...clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...

# Error Tracking (optional)
SENTRY_DSN=https://...@o....ingest.us.sentry.io/...

# Rate Limiting (optional)
REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_ENABLED=false

# Dev Auth
DEV_DEMO_USER_ENABLED=true
```

### 4.5 Database Setup

The backend auto-runs pending migrations on startup via `backend/db/migrate.py`.
For a fresh Supabase project:

1. Run `backend/db/schema.sql` in the Supabase SQL Editor to create all tables,
   indexes, RLS policies, and triggers.
2. Run `backend/migrations/000_bootstrap.sql` in the SQL Editor to create the
   `_migrations` tracking table and the `exec_sql` RPC function.
3. Restart the backend — pending migrations (`.sql` files in `backend/migrations/`)
   will apply automatically.

**SQLite (local dev without Supabase):**
Set `DATABASE_URL=sqlite+aiosqlite:///./dev.db` in `.env`. The app will use
a local SQLite file instead of Supabase.

---

## 5. Running Tests

```bash
# Backend tests (pytest, async auto-detected)
cd backend && python -m pytest -v

# Run a specific test file
python -m pytest backend/tests/test_tracker.py -v

# Run fit score tests
python -m pytest integrations/test_fit_score.py -v

# Run job hunter tests
python -m pytest integrations/test_job_hunter.py -v

# Frontend type check (no runtime tests yet)
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint
```

---

## 6. Node & Python Versions

| Runtime | Min Version | Tested With | Notes |
|---------|-------------|-------------|-------|
| **Python** | 3.11 | 3.14 | FastAPI requires 3.11+ for async features |
| **Node.js** | 18 | 20+ | Next.js 14 requires 18.17+ |

---

## 7. Available Scripts

### Frontend (`cd frontend`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server (:3000) with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | TypeScript type check (no output) |

### Backend (`cd backend`)

| Command | Purpose |
|---------|---------|
| `uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000` | Start dev server with hot reload |
| `uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000` | Start production server |
| `python -m pytest -v` | Run all tests |

### Root

| Command | Purpose |
|---------|---------|
| `start.bat` | Start both servers (Windows) |
| `./start.sh` | Start both servers (macOS/Linux) |

---

## 8. Project Structure

```
CareerPilot/
│
├── .env.example              # Documented env vars template
├── start.bat / start.sh      # One-command dev start scripts
├── conftest.py               # Root pytest config (adds paths)
├── pytest.ini                # Pytest config (async mode auto)
├── nixpacks.toml             # Render/Nixpacks deployment config
│
├── frontend/                 # Next.js 14 App Router
│   ├── next.config.js        # Next.js config (rewrites, CSP, standalone)
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   ├── .env.example          # Frontend env template
│   ├── package.json          # Node dependencies & scripts
│   └── src/
│       ├── app/(app)/        # Authenticated pages (7 routes)
│       │   ├── dashboard/    # Stats, nudge, activity overview
│       │   ├── jobs/         # Job search + cards + cover letter
│       │   ├── tracker/      # Kanban board
│       │   ├── chat/         # RAG AI career coach
│       │   ├── calendar/     # Calendar view
│       │   ├── profile/      # CV upload, user info
│       │   └── settings/     # API keys, theme, notifications
│       │   └── layout.tsx    # Authenticated layout (sidebar)
│       ├── components/       # Sidebar, ThemeProvider, providers
│       ├── lib/api.ts        # Unified API client (apiFetch wrapper)
│       ├── store/            # Zustand global state
│       └── types/            # TypeScript interfaces
│
├── backend/                  # FastAPI Python backend
│   ├── main.py              # App factory, middleware, health check
│   ├── auth.py              # JWT verification + dev token bypass
│   ├── utils.py             # Placeholder detection helpers
│   ├── logger.py            # Structured JSON logging
│   ├── requirements.txt     # Python dependencies
│   ├── routers/             # Endpoint handlers (7 routers)
│   │   ├── tracker.py       # /api/tracker (todos, goals, applications, dashboard)
│   │   ├── jobs.py          # /api/jobs/search, /fit, /cover-letter
│   │   ├── cv.py            # /api/cv/upload, /sections
│   │   ├── chat.py          # /api/chat/message (RAG)
│   │   ├── roadmap.py       # /api/roadmap/generate
│   │   ├── settings.py      # /api/settings
│   │   └── webhooks.py      # Clerk webhook handler
│   ├── services/            # Business logic layer
│   │   ├── rag.py           # RAG pipeline (retrieve + generate)
│   │   ├── cover_letter.py  # Cover letter generation
│   │   ├── goals.py         # AI goal generation
│   │   ├── roadmap.py       # Roadmap generation
│   │   └── nudge.py         # Inactivity detection (stub)
│   ├── models/              # ORM + Pydantic schemas
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   └── schemas.py       # Pydantic v2 schemas
│   ├── db/                  # Database clients & migrations
│   │   ├── schema.sql       # Full PostgreSQL DDL (8 tables)
│   │   ├── supabase_client.py # Supabase client factory
│   │   └── migrate.py       # Auto-migration runner
│   ├── middleware/           # Rate limiting middleware
│   ├── migrations/          # SQL migration files
│   ├── workers/             # Background task stubs
│   └── tests/               # Pytest test suite
│
├── integrations/            # Shared modules (loaded into sys.path)
│   ├── job_hunter.py        # JSearch + Adzuna search + parse_job()
│   ├── fit_score.py         # Cosine similarity + LLM reasons
│   ├── embeddings_adapter.py # Embeddings with deterministic fallback
│   ├── test_fit_score.py    # Fit score unit tests
│   └── test_job_hunter.py   # Job hunter unit tests
│
├── supabase/                # Supabase config (future)
├── context/                 # AI-context reference files
│
├── SYSTEM_DESIGN.md         # Architecture documentation
├── STACK_REPORT.md          # Technology justification
└── README.md                # Quick-start overview
```

---

## 9. API Endpoint Reference

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/health` | System health check (Supabase, Pinecone, Groq) | None |
| `GET` | `/api/jobs/search` | Search jobs by query + location | Bearer JWT |
| `GET` | `/api/jobs/{id}/fit` | Fit score for a single job + CV | Bearer JWT |
| `POST` | `/api/jobs/{id}/cover-letter` | Generate AI cover letter | Bearer JWT |
| `POST` | `/api/cv/upload` | Upload PDF/DOCX CV (multipart) | Bearer JWT |
| `GET` | `/api/cv/sections/{cv_id}` | Get parsed CV sections | Bearer JWT |
| `DELETE` | `/api/cv/{cv_id}` | Delete CV + Pinecone vectors | Bearer JWT |
| `POST` | `/api/chat/message` | Send chat message + get AI response | Bearer JWT |
| `POST` | `/api/roadmap/generate` | Generate career roadmap | Bearer JWT |
| `GET` | `/api/tracker/applications` | List Kanban applications | Bearer JWT |
| `POST` | `/api/tracker/applications` | Create application card | Bearer JWT |
| `PATCH` | `/api/tracker/applications/{id}` | Update application status | Bearer JWT |
| `DELETE` | `/api/tracker/applications/{id}` | Delete application | Bearer JWT |
| `GET` | `/api/tracker/todos` | List todos | Bearer JWT |
| `POST` | `/api/tracker/todos` | Create todo | Bearer JWT |
| `PATCH` | `/api/tracker/todos/{id}` | Update todo | Bearer JWT |
| `DELETE` | `/api/tracker/todos/{id}` | Delete todo | Bearer JWT |
| `GET` | `/api/tracker/goals` | List goals | Bearer JWT |
| `POST` | `/api/tracker/goals` | Create goal | Bearer JWT |
| `POST` | `/api/tracker/goals/generate` | AI-generate goals from CV | Bearer JWT |
| `PATCH` | `/api/tracker/goals/{id}` | Update goal | Bearer JWT |
| `DELETE` | `/api/tracker/goals/{id}` | Delete goal | Bearer JWT |
| `GET` | `/api/tracker/dashboard/stats` | Dashboard statistics | Bearer JWT |
| `GET` | `/api/tracker/nudge` | Inactivity nudge + job suggestions | Bearer JWT |
| `GET` | `/api/settings` | Read user settings | Admin key |
| `POST` | `/api/settings` | Write user settings | Admin key |
| `POST` | `/api/webhooks/clerk` | Clerk user sync webhook | Webhook secret |

---

## 10. Development Workflow

### Making Changes

```bash
# Backend — edit Python files, server auto-reloads
# Frontend — edit TypeScript/React files, hot-reloads automatically

# Type-check frontend
cd frontend && npx tsc --noEmit

# Run backend tests
cd backend && python -m pytest -v

# Lint frontend
cd frontend && npm run lint
```

### Adding a New API Endpoint

1. Add a new function in the appropriate router (`backend/routers/`).
2. Add Pydantic schemas in `backend/models/schemas.py` if needed.
3. Add the frontend call in `frontend/src/lib/api.ts`.
4. Add TypeScript types in `frontend/src/types/index.ts` if needed.
5. Run `npx tsc --noEmit` to verify types.

### Adding a New Page

1. Create a new folder under `frontend/src/app/(app)/` (App Router convention).
2. Add `page.tsx` with a default export.
3. Add a sidebar link in `frontend/src/components/ui/Sidebar.tsx`.

---

## 11. Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Backend won't start (port in use) | Another process on :8000 | Change port or kill the process |
| `ModuleNotFoundError: No module named 'integrations'` | Python path not set | Run from project root with `uv run` |
| Frontend can't reach backend | Backend not running or wrong `NEXT_PUBLIC_API_URL` | Check `.env` — should be `http://localhost:8000` |
| `Relation "_migrations" does not exist` | Bootstrap SQL not run | Run `backend/migrations/000_bootstrap.sql` in Supabase |
| Job search returns 0 results | API keys not set, or no jobs match | Check JSEARCH/ADZUNA keys; try different query |
| Fit scores are all null | No CV uploaded or Pinecone not configured | Upload a CV first, or it's expected behavior |
| "Network error: fetch failed" | CSP blocking or backend down | Check CSP in `next.config.js`; verify backend is running |
| Chat returns generic answers | No LLM keys configured | Set `GROQ_API_KEY` or accept deterministic fallback |
| Dashboard stats are empty | No data in Supabase | Use the app (create apps, todos) to generate data |
| `ImportError: backend.routers.jobs` | Missing integrations deps | `uv pip install -r integrations/requirements.txt` |

---

## 12. Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_API_URL` → your deployed backend URL
- All other env vars from `.env.example`

### Backend → Railway (via Nixpacks)

```bash
# Connect GitHub repo to Railway
# Railway auto-detects nixpacks.toml in root
# Set all env vars in Railway Dashboard
# Deploy triggers on push to main
```

Environment variables must be set in the Railway Dashboard matching `.env.example`.

### Database → Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `backend/db/schema.sql` in SQL Editor.
3. Run `backend/migrations/000_bootstrap.sql` in SQL Editor.
4. Copy project URL and keys into `.env`.
