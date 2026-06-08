# Stack Report — CareerPilot

## 1. Overview

CareerPilot is an AI-first career operating system built as a **monorepo** with three
layers: a **Next.js 14** frontend, a **FastAPI** backend, and a **Supabase (PostgreSQL)**
database, augmented by a **Pinecone** vector store and multiple external AI/API services.

The system helps users search live jobs, upload CVs for AI-powered fit analysis, chat
with an AI career coach (RAG), and track applications, todos, and goals on a Kanban
board.

---

## 2. Frontend Stack

### Next.js 14 (App Router)

- **Why**: Full-stack React framework with file-based routing (App Router), React Server
  Components, and built-in optimizations (code splitting, image optimization). The App
  Router's nested layouts and loading boundaries make multi-page apps like CareerPilot
  (dashboard, jobs, chat, tracker, calendar, settings, profile) easy to structure.
- **Trade-off**: Next.js 14.2 is an older stable. We avoid bleeding-edge canary features
  for stability during the hackathon. No ISR/SSG is used — all pages are
  `force-dynamic` (server-rendered per request) since every view is user-specific.

### React 18

- **Why**: Stable, widely supported. Enables concurrent rendering and `Suspense` for
  data-fetching boundaries.

### TypeScript

- **Why**: Type safety across the entire frontend. Catches API contract mismatches at
  compile time. The `Job`, `Application`, `Todo`, etc. types mirror the backend Pydantic
  schemas exactly.

### Tailwind CSS + `tw-animate-css`

- **Why**: Utility-first CSS for rapid prototyping. No CSS files to manage — all styling
  is inline via class names. `tw-animate-css` adds CSS-native animations without
  JavaScript.
- **Trade-off**: JSX can become verbose with long class strings. We use `clsx` + `cva`
  (class-variance-authority) for reusable component variants.

### Framer Motion

- **Why**: Declarative animations (layout animations, page transitions, micro-
  interactions on cards). Provides `AnimatePresence` for mount/unmount animations.
- **Trade-off**: Adds ~30 KB gzip. Only used on pages where UX polish matters (jobs,
  dashboard). Simpler pages (settings, profile) are static.

### Zustand

- **Why**: Lightweight global state (2 KB). Replaces Redux boilerplate. Stores are
  plain functions — no providers, no reducers, no action types.
- **Persistence**: Zustand's `persist` middleware writes to `localStorage` so the user's
  `cvId`, `userId`, settings, and Kanban cards survive page refreshes. API keys are
  explicitly excluded from persistence (`partialize`).

### Lucide React

- **Why**: Consistent icon library (1,000+ icons, tree-shakeable). Replaced all emoji
  icons during a redesign for a more professional look.

### Recharts

- **Why**: Lightweight charting library for the dashboard stats visualization. Built on
  React components — no separate charting framework.

### react-markdown + remark-gfm + rehype-katex

- **Why**: The AI chat assistant returns Markdown responses. `react-markdown` renders
  them safely (no `dangerouslySetInnerHTML`). GFM adds tables/task-lists, KaTeX adds
  math rendering for technical content.

### shadcn

- **Why**: Copy-paste component library based on `@base-ui/react` (headless, accessible
  primitives). No npm dependency on shadcn itself — components are checked into the
  codebase and fully customizable.

---

## 3. Backend Stack

### Python 3.11+

- **Why**: Dominant language for AI/ML tooling (Pinecone SDK, Groq SDK, sentence-
  transformers, embedding libraries). FastAPI is Python-native.

### FastAPI 0.136

- **Why**: Async-native Python web framework with automatic OpenAPI docs, Pydantic v2
  validation, and dependency injection. Outperforms Flask and Django REST for I/O-bound
  workloads (job search, fit score computation, AI chat).
- **Trade-off**: Younger ecosystem than Django. No built-in admin panel or ORM (we use
  SQLAlchemy).

### Uvicorn

- **Why**: ASGI server for FastAPI. Async event loop handles concurrent requests without
  the GIL bottleneck.

### SQLAlchemy 2.0 (async)

- **Why**: Mature async ORM with connection pooling, migration support, and type-safe
  queries. We use `aiosqlite` for dev and `asyncpg` for production PostgreSQL.

### Pydantic v2

- **Why**: Request/response validation with zero overhead. Generates JSON Schema for
  OpenAPI docs automatically. Nested models, discriminated unions, and custom validators
  are used throughout the API layer.

### httpx

- **Why**: Async HTTP client for calling external APIs (JSearch, Adzuna, Groq) without
  blocking the event loop. Used in `search_jobs_async()`.

### Pinecone Client 6.0

- **Why**: Managed vector database for CV chunk storage and cosine similarity search.
  Scales horizontally, handles metadata filtering (`user_id`, `cv_id`), and returns
  sub-100ms queries.
- **Trade-off**: Vendor lock-in. The `embeddings_adapter.py` provides a deterministic
  fallback so the app works without Pinecone during development.

### Groq SDK

- **Why**: LLM inference provider for the AI coach. Uses `llama-3.3-70b-versatile` —
  fast (500+ tok/s), free tier available, no GPU required.

### Supabase Client (Python)

- **Why**: Direct PostgreSQL access via Supabase's REST API wrapper. Used for read-heavy
  operations (dashboard stats, activity log). Write operations go through SQLAlchemy for
  transaction support.

### Python-jose (JWT)

- **Why**: Decodes Clerk-issued JWTs on the backend. Verifies the `kid` header against
  Clerk's JWKS endpoint.

### Sentry SDK

- **Why**: Error tracking in production. Captures unhandled exceptions, slow requests,
  and AI pipeline failures.

### Svix

- **Why**: Webhook processing for Clerk events (user created/updated/deleted). Keeps the
  `users` table in sync.

---

## 4. Database & Storage

### Supabase (PostgreSQL 15)

- **8 tables**: `users`, `cvs`, `cv_chunks`, `applications`, `goals`, `todos`,
  `chat_messages`, `activity_log`, `audit_log`.
- **Why**: Managed PostgreSQL with built-in auth, REST API, real-time subscriptions, and
  a generous free tier (500 MB). The `supabase-py` client is used for quick
  query building; SQLAlchemy is used for complex transactional writes.
- **RLS**: Row-level security policies are defined in `schema.sql` but are currently
  bypassed (backend uses the `service_role` key). Intended for future anon-key migration.

### Pinecone (Vector DB)

- **Index**: `careerpilot-cv` — stores CV chunk embeddings with metadata
  (`user_id`, `cv_id`, `section`, `content`).
- **Dimension**: Configurable via `EMBED_DIM` (default 768).
- **Why**: Purpose-built for vector similarity search. Sub-100 ms queries with metadata
  filtering. Handles 100k+ vectors without manual sharding.

### Redis (via REDIS_URL)

- **Why**: Rate-limit tracking (sliding window counter). Configured but rate-limiting is
  disabled in development (`RATE_LIMIT_ENABLED=false`).

---

## 5. External APIs & Integrations

### JSearch (openwebninja.com)

- **Purpose**: Primary job search API, supports Bangladesh (unlike most job APIs).
- **Endpoint**: `GET https://api.openwebninja.com/jsearch/search-v2`
- **Auth**: `x-api-key` header.
- **Fallback chain**: JSearch → Adzuna BD → Adzuna GB.

### Adzuna

- **Purpose**: Fallback job API for countries JSearch doesn't cover (gb, us, au, de,
  fr, it, nl, nz, sg, za).
- **Limitation**: Does not support Bangladesh natively. Used as secondary fallback.

### Groq

- **Purpose**: LLM inference for the AI career coach. Model: `llama-3.3-70b-versatile`.
- **Why**: Free tier, extremely fast (500+ tok/s), good quality for career advice.

### NVIDIA NIM

- **Purpose**: Secondary LLM fallback (not yet integrated in the runtime, env vars are
  accepted).

### Clerk (Authentication — partially replaced)

- **Original design**: Clerk handles OAuth, email/password, JWT issuance, and webhooks
  for user sync.
- **Current state**: The frontend was migrated to a **dev token bypass** for hackathon
  simplicity. The frontend always sends `Authorization: Bearer dev:demo_user_123`. The
  backend accepts it when `DEV_DEMO_USER_ENABLED=true`. Clerk JWKS verification is still
  wired up for production.

---

## 6. AI/ML Architecture

### Embedding Pipeline

```
User uploads PDF/DOCX
  → pypdf extracts text
  → Text is split into chunks by section (experience, education, skills, projects)
  → Each chunk is embedded via:
      1. sentence-transformers (all-MiniLM-L6-v2, if installed)
      2. Deterministic SHA256-based fallback (never crashes)
  → Embeddings upserted to Pinecone with metadata
```

### Fit Score Engine (`integrations/fit_score.py`)

- **Programmatic cosine similarity** (not LLM-hallucinated): CV chunks are weighted by
  section type (experience 40%, skills 35%, projects 15%, education 10%).
- **Score range**: 0-100, rounded to integer.
- **Reasons**: Generated by Groq LLM from the CV context + job description. Falls back
  to deterministic heuristics when no LLM keys are configured.
- **Mock mode**: When Pinecone credentials are placeholders, returns realistic mock
  scores based on keyword matching (e.g., "react" in description → 88%).

### RAG Chat (`backend/services/rag.py`)

1. User sends a message.
2. `retrieve_relevant_chunks()` queries Pinecone (or Supabase, or hardcoded fallback)
   for the top 3 CV chunks matching the query.
3. User's recent applications, todos, and goals are appended as context.
4. A prompt is composed and sent to Groq (`llama-3.3-70b-versatile`).
5. If Groq fails or is unconfigured, a deterministic template engine generates responses
   based on keyword detection (skills → roadmap suggestion, resume → optimization check,
   etc.).

---

## 7. Authentication & Authorization

| Layer | Mechanism |
|-------|-----------|
| Frontend | Sends `Bearer dev:demo_user_123` via `apiFetch()` |
| Backend | (1) Checks for `dev:` prefix → accept without validation. (2) Falls back to Clerk JWKS verification. |
| Database | User-scoped queries via `user_id` column in every table. Supabase RLS defined but not active (uses service key). |

**Intended production flow**: Clerk issues JWT → frontend forwards JWT → backend
verifies via Clerk JWKS → extracts `sub` (user ID) → scopes all queries.

---

## 8. Deployment Architecture

```
┌──────────────┐     HTTPS + JWT     ┌──────────────────┐
│   Vercel      │ ───────────────────→│    Railway        │
│  (Next.js)    │                     │   (FastAPI)       │
│  :443         │                     │   :8000           │
└──────────────┘                     │                  │
                                      │  ┌────────────┐  │
                                      │  │  Celery*    │  │
                                      │  │  Workers    │  │
                                      │  └────────────┘  │
                                      │  ┌────────────┐  │
                                      │  │   Redis     │  │
                                      │  │   :6379     │  │
                                      │  └────────────┘  │
                                      └──────────────────┘
                                             │
                                  ┌──────────┼──────────┐
                                  │          │          │
                           ┌──────▼───┐ ┌───▼────┐ ┌──▼──────┐
                           │ Supabase  │ │Pinecone│ │  Groq   │
                           │ Postgres  │ │Vectors │ │  API    │
                           └──────────┘ └────────┘ └─────────┘
```

\* Celery is defined in the system design but not yet wired in the current codebase.
Background task processing is done synchronously or via `asyncio.to_thread()`.

- **Frontend**: Deployed on Vercel (via `vercel deploy`). Build output is static
  export + serverless functions.
- **Backend**: Deployed on Railway (via Nixpacks + `nixpacks.toml`). Single `uvicorn`
  process handles all requests.
- **Database**: Supabase managed PostgreSQL.
- **Vector Store**: Pinecone (serverless index).

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo | Single repo with `/frontend`, `/backend`, `/integrations` | Simpler dev workflow, shared types, single CI/CD |
| Async backend | FastAPI + asyncio + httpx | Fit score computation and job search are I/O-bound — async avoids blocking |
| Programmatic fit scores | Cosine similarity (not LLM) | Deterministic, reproducible, no token cost, sub-50ms per job |
| Embedding fallback | SHA256 deterministic vector | Never crashes — dev UX is preserved without API keys |
| Mock data layers | 5 layers (Pinecone → Supabase → hardcoded chunks → demo reasons → template engine) | Every feature works without any external API configured |
| Zustand over Redux | 2 KB vs 12 KB | Simple app — no need for middleware, devtools, or normalized stores |
| Tailwind over styled-components | No runtime CSS-in-JS, fast refresh, smaller bundles | Utility classes eliminate context-switching |
| Clerk → dev token bypass | Hackathon pragmatic | Removes OAuth redirect friction during demo. Production path still intact |
| JSearch primary, Adzuna fallback | Bangladesh support | Adzuna doesn't support BD; JSearch does |
| No Celery workers (yet) | `asyncio.to_thread()` | Sufficient for MVP scale (50 concurrent users). Celery adds deployment complexity |

---

## 10. Testing Strategy

- **Backend**: pytest + `asyncio` fixtures. Tests in `backend/tests/`. Mock external
  APIs via httpx mock or monkeypatch. Fit score tests in `integrations/test_fit_score.py`.
- **Frontend**: No unit tests currently (hackathon timeline). TypeScript catches type
  errors. Manual testing via `npm run dev`.
- **CI**: No CI pipeline yet. Lint via `npm run lint` (frontend) and `ruff` (backend).

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| JWT forgery | JWKS validation with pinned Clerk domain (`clerk.com`, `api.clerk.dev`) |
| Prompt injection | Input length limit (2,000 chars), CV text sanitized before embedding |
| Data isolation | All queries filtered by `user_id`. Pinecone queries use metadata filter |
| CORS | Configured per environment. Wildcard in dev, specific origins in prod |
| Secrets | No secrets in code. `.env` is git-ignored. Placeholder detection in `utils.py` |
| Body size limit | 10 MB max request body (413 on overflow) |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` |

---

## 12. Non-Functional Requirements

| Metric | Target |
|--------|--------|
| Concurrent users | 50 |
| Job search latency | < 5 seconds |
| AI chat response | < 8 seconds |
| Fit score per job | < 50 ms |
| Uptime SLO | 95% |
| DB pool size | 10 (max overflow 20) |
| LLM retry | 3 attempts, exponential backoff |

---

## 13. Data Flow Summary

### Job Search
```
User types "React developer" + clicks Search
  → searchJobs("React developer", "bd") in api.ts
  → GET /api/jobs/search?q=React+developer&location=bd
  → get_structured_jobs_async()
      → search_jobs_async("React developer", "bd")
          → search_jsearch("React developer", "Bangladesh")  [JSearch API]
          → fallback: search_adzuna("bd")  [Adzuna API]
          → fallback: search_adzuna("gb")
      → parse_job() for each result
  → compute_fit_score() for each job (if cv_id provided)
  → Sort by fit_score descending
  → Return { jobs: [...] }
  → Display in <JobCard /> grid
```

### CV Upload
```
User uploads PDF
  → POST /api/cv/upload (multipart/form-data)
  → pypdf extracts text
  → Split into sections (summary, experience, education, skills, projects)
  → Embed each chunk → Pinecone upsert
  → Store in PostgreSQL cvs + cv_chunks tables
  → Return { cv_id, status: "complete" }
```

### AI Chat
```
User types "What skills should I improve?"
  → POST /api/chat/message { content: "..." }
  → retrieve_relevant_chunks("skills should I improve", cv_id)
      → Pinecone similarity search (or Supabase, or hardcoded fallback)
  → get_user_context_data(user_id) — fetches recent apps/todos/goals
  → Compose prompt with system instructions + CV context + user context
  → Groq API call (llama-3.3-70b-versatile, timeout 20s)
  → Fallback: deterministic template engine
  → Store user message + assistant response in chat_messages
  → Return { answer, sources: [...] }
```

---

## 14. File Structure (Key Paths)

```
CareerPilot/
├── frontend/                        # Next.js 14 App Router
│   ├── src/
│   │   ├── app/(app)/               # Authenticated pages
│   │   │   ├── dashboard/           # Stats, nudge, activity overview
│   │   │   ├── jobs/                # Job search + cards + cover letter
│   │   │   ├── tracker/             # Kanban board (applications, todos, goals)
│   │   │   ├── chat/                # RAG AI career coach
│   │   │   ├── calendar/            # Calendar view
│   │   │   ├── profile/             # User profile + CV upload
│   │   │   └── settings/            # API keys, preferences
│   │   ├── components/              # Reusable UI (Sidebar, providers, theme)
│   │   ├── lib/api.ts              # All API calls (apiFetch wrapper)
│   │   ├── store/useAppStore.ts    # Zustand global state
│   │   └── types/index.ts          # TypeScript interfaces
│   └── tailwind.config.ts
├── backend/                         # FastAPI
│   ├── main.py                     # App factory, middleware, health check
│   ├── auth.py                     # JWT verification + dev token bypass
│   ├── routers/                    # API endpoint handlers
│   │   ├── jobs.py                 # /api/jobs/search, /fit, /cover-letter
│   │   ├── tracker.py              # /api/tracker (todos, goals, applications, stats)
│   │   ├── cv.py                   # /api/cv/upload, /sections
│   │   ├── chat.py                 # /api/chat/message
│   │   ├── roadmap.py              # /api/roadmap/generate
│   │   ├── settings.py             # /api/settings
│   │   └── webhooks.py             # Clerk webhooks
│   ├── services/                   # Business logic
│   │   ├── rag.py                  # RAG pipeline (retrieve + generate)
│   │   ├── cover_letter.py         # Cover letter generation
│   │   ├── goals.py                # AI goal generation
│   │   └── roadmap.py              # Roadmap generation
│   ├── models/models.py + schemas.py  # SQLAlchemy ORM + Pydantic schemas
│   ├── db/
│   │   ├── schema.sql              # Full PostgreSQL DDL + RLS policies
│   │   ├── supabase_client.py      # Supabase client factory
│   │   └── migrate.py              # Migration runner
│   ├── middleware/rate_limit.py    # Sliding window rate limiter
│   └── tests/                      # pytest suite
├── integrations/                    # Shared modules (loaded by backend)
│   ├── job_hunter.py               # JSearch + Adzuna search, parse_job()
│   ├── fit_score.py                # Cosine similarity, weighted scoring, LLM reasons
│   ├── embeddings_adapter.py       # sentence-transformers + deterministic fallback
│   ├── test_fit_score.py           # Fit score unit tests
│   └── test_job_hunter.py          # Job hunter unit tests
├── supabase/                        # Supabase config (future)
├── .env.example                     # Documented env vars template
├── nixpacks.toml                    # Render/Nixpacks build config
├── start.bat / start.sh             # One-command dev start scripts
├── README.md
├── SYSTEM_DESIGN.md
└── STACK_REPORT.md                  # This file
```

---

## 15. Trade-offs & Future Improvements

| Area | Current | Future |
|------|---------|--------|
| Background jobs | `asyncio.to_thread()` | Celery + Redis for CV processing, nudge checking |
| Auth | Dev token bypass for hackathon | Restore Clerk full flow + RLS with anon key |
| Testing | Manual + pytest (backend only) | React Testing Library + Playwright E2E |
| Observability | Structured logging + Sentry | OpenTelemetry tracing, Datadog/Grafana |
| Caching | None (Redis configured but unused) | Cache job search results, fit scores, embeddings |
| CI/CD | None | GitHub Actions: lint → test → build → deploy |
| Rate limiting | Configured, disabled in dev | Enable with per-user quota tracking |
| Fit score reasons | Heuristic fallback when no LLM | Always use LLM, cache results |
| CV processing | Synchronous in request thread | Background worker with progress tracking |
