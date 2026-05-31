# System Design — CareerPilot

## 1. Overview

CareerPilot is an AI-first career operating system built as a monorepo with three layers:

```
┌──────────────────────────────────────────────────────────┐
│                     User Browser                         │
├──────────────────────────────────────────────────────────┤
│              Next.js 14 (Vercel Edge)                    │
│  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ Zustand │ │ TanStack │ │  Clerk  │ │ Tailwind CSS │  │
│  │  Store  │ │  Query   │ │  Auth   │ │   + shadcn   │  │
│  └────────┘ └──────────┘ └─────────┘ └──────────────┘  │
├──────────────────────────────────────────────────────────┤
│              FastAPI Backend (Railway)                    │
│  ┌────────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   REST API     │ │  AI Service  │ │   Tracker    │   │
│  │  (Routers)     │ │  (RAG/Chat)  │ │  (Kanban)    │   │
│  └────────────────┘ └──────────────┘ └──────────────┘   │
│  ┌────────────────┐ ┌──────────────┐                    │
│  │  Fit Score     │ │   Celery     │                    │
│  │   Engine       │ │  Workers     │                    │
│  └────────────────┘ └──────────────┘                    │
├──────────────────────────────────────────────────────────┤
│                     Data Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  PostgreSQL   │ │   Pinecone   │ │    Redis     │    │
│  │  (Supabase)   │ │ Vector Store │ │    Cache     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## 2. Four Pillars

| Pillar | Feature | Key Technology |
|--------|---------|---------------|
| 1 — Job Hunter Agent | Live job search with programmatic fit scores | Adzuna/JSearch API + Pinecone cosine similarity |
| 2 — Profile & Resume Intelligence | CV upload, semantic chunking, embedding | Pinecone + Gemini embeddings |
| 3 — Personal AI Assistant | RAG-powered conversational career advisor | LangChain + Gemini + Pinecone |
| 4 — Productivity Tracker | Kanban board, todos, goals, dashboard | PostgreSQL + SQLAlchemy async |

## 3. Data Flow

### CV Upload Pipeline
```
User uploads PDF/DOCX
  → FastAPI /api/cv/upload validates file type
  → Creates CV record in PostgreSQL (status: "pending")
  → Dispatches Celery task: process_cv
  → Celery worker:
      1. Extracts text from PDF/DOCX
      2. Chunks by section (experience, education, skills, projects)
      3. Embeds each chunk via Gemini embedding API
      4. Upserts vectors to Pinecone with metadata {user_id, cv_id, section}
      5. Updates PostgreSQL CV record (status: "complete", sections_found)
```

### Job Search + Fit Score
```
User enters search query
  → GET /api/jobs/search?q=...&cv_id=...
  → FastAPI calls Adzuna/JSearch API asynchronously
  → For each job (concurrently via asyncio.gather):
      1. Fetch user's CV embeddings from Pinecone
      2. Embed job description
      3. Compute cosine similarity → fit_score (0-100)
      4. Derive fit_reasons and gap_reasons from vector distances
  → Sort by fit_score descending
  → Return to frontend
```

### AI Chat (RAG Pipeline)
```
User sends message
  → POST /api/chat/message
  → Retrieve relevant CV chunks from Pinecone (similarity search)
  → Compose prompt: system prompt + CV context + last 10 turns + user message
  → Call Gemini API (fallback: OpenAI)
  → Return answer + source sections
  → Store message pair in PostgreSQL
```

### Dashboard & Nudge
```
Dashboard load → GET /api/tracker/dashboard/stats
  → Aggregate from PostgreSQL:
      - applications_this_week (count WHERE applied_at >= 7 days ago)
      - applications_last_week (count in 7-14 day window)
      - roadmap_progress (from Goal matching "roadmap")
      - streak_days (consecutive activity dates from activity_log)
  → From Pinecone: skills_count (tokenize CV skills section)

Nudge check → GET /api/tracker/nudge
  → If no activity_log entries in 3 days:
      - Derive search query from CV skills
      - Fetch 3 matching jobs from Adzuna
      - Return nudge message + jobs
```

## 4. Database Schema

### PostgreSQL Tables (Supabase)

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `users` | `id` (UUID) | `email`, `clerk_id`, `full_name` |
| `cvs` | `id` (UUID) | `user_id`, `file_name`, `file_type`, `processing_status`, `sections_found` (JSON) |
| `cv_chunks` | `id` (UUID) | `cv_id`, `section`, `content`, `chroma_vector_id` |
| `applications` | `id` (UUID) | `user_id`, `job_title`, `company`, `status` (enum), `fit_score`, `applied_at` |
| `todos` | `id` (UUID) | `user_id`, `goal_id` (FK nullable), `title`, `due_date`, `done` |
| `goals` | `id` (UUID) | `user_id`, `title`, `target_date`, `progress` (0-100) |
| `activity_log` | `id` (UUID) | `user_id`, `action` (enum), `metadata` (JSON), `created_at` |
| `chat_messages` | `id` (UUID) | `session_id`, `role`, `content`, `sources` (JSON), `query_type` |

### Pinecone Index: `careerpilot-cv`

- **Dimension:** Matches Gemini embedding output (768 or 1536)
- **Metadata fields:** `user_id`, `cv_id`, `section`, `content`
- **Query pattern:** Filter by `user_id`, similarity search over `content`

## 5. Authentication & Authorization

```
Browser → Clerk OAuth/Email Login → Session + JWT
Browser → Next.js → Forward Bearer JWT → FastAPI
FastAPI → Clerk JWKS validation → Extract user_id
FastAPI → All DB queries scoped by user_id
```

- JWT expiry: 1 hour
- All database queries are user-scoped — no cross-user data access
- Admin role checked via `publicMetadata.role` claim
- No route except `/health` is accessible without auth

## 6. Deployment Architecture

```
┌─────────────┐     HTTPS      ┌────────────────┐
│   Vercel     │ ──────────────→│  Railway       │
│   (Next.js)  │   + JWT        │  (FastAPI)     │
│   :443       │                │  :8000         │
└─────────────┘                │                │
                               │  ┌───────────┐ │
                               │  │  Celery   │ │
                               │  │  Workers  │ │
                               │  └───────────┘ │
                               │  ┌───────────┐ │
                               │  │   Redis   │ │
                               │  │  :6379    │ │
                               │  └───────────┘ │
                               └────────────────┘
                                      │
                          ┌───────────┼───────────┐
                          │           │           │
                   ┌──────▼───┐ ┌────▼─────┐ ┌──▼──────┐
                   │ Supabase │ │ Pinecone │ │ Gemini  │
                   │ Postgres │ │ Vectors  │ │   API   │
                   └──────────┘ └──────────┘ └─────────┘
```

## 7. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vector store | Pinecone (production) / in-memory (tests) | Managed, scales beyond 100k users; ChromaDB for local dev |
| LLM provider | Gemini (primary) + OpenAI (fallback) | Cost-effective + redundancy |
| Fit score computation | Programmatic cosine similarity | Reproducible, not LLM-hallucinated |
| DB access | SQLAlchemy async + Pydantic v2 | Type-safe, async-native, FastAPI integration |
| Auth | Clerk | Zero infrastructure, JWT-based, easy frontend integration |
| Background jobs | Celery + Redis | CV processing, nudge checking, decoupled from API |
| Frontend state | Zustand + TanStack Query | Lightweight global state + server state caching |

## 8. Non-Functional Requirements

| Metric | MVP Target |
|--------|-----------|
| Concurrent users | 50 |
| Job search latency | < 5 seconds |
| AI chat response | < 8 seconds |
| Uptime SLO | 95% |
| DB pool size | 10 (max overflow 20) |
| LLM retry | 3 attempts, exponential backoff |
| User token budget | 10,000 tokens/day |

## 9. Security Measures

- **Transport:** TLS 1.2+ everywhere (Vercel, Railway, Supabase enforce)
- **Prompt injection:** CV text sanitized before embedding; input length limit 2,000 chars
- **Data isolation:** All Pinecone queries filtered by `user_id` metadata
- **CORS:** Configured per environment (wildcard in dev, specific origins in prod)
- **Secrets:** Environment variables only — never committed to repo

## 10. Observability

- Structured JSON logging on all backend services
- Request ID propagated through service calls
- AI telemetry: prompt, model, token count, latency logged per LLM call
- Frontend: Error boundary reporting (Sentry in production)
- Health check endpoint: `GET /health`

---

*Refer to `context/master-spec.md` for the complete specification and `api-contracts.md` for endpoint details.*
