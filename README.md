# CareerPilot

AI-powered job search engine and application tracker. Upload your CV, get AI-generated career goals and roadmaps, search live jobs with automated fit scoring, manage applications on a Kanban board, and chat with an AI career coach grounded in your actual skills.

---

## ✨ Features

- **🔍 Live Job Search** — Fetch real-time listings from JSearch & Adzuna with AI-powered fit scores
- **📄 CV Parsing** — Upload PDF/DOCX, auto-extract sections into Pinecone vector store
- **📊 Fit Score Engine** — Cosine similarity matching of CV against job descriptions with explainable reasons
- **📋 Kanban Tracker** — Drag-free application management (Applied → Interviewing → Offer → Rejected)
- **🎯 AI Goals & Roadmap** — Generate career goals and weekly learning roadmaps from your CV skills via Groq
- **💬 AI Career Coach** — RAG chat answering questions grounded in your CV and application history
- **📈 Dashboard** — Weekly stats, streak tracking, live job matches, and inactivity nudges
- **🔐 Supabase + Clerk Auth** — Row-level security with Clerk JWT authentication

---

## 🚀 Quick Start

```bash
# 1. Clone and configure
cp .env.example .env   # Fill in your API keys

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend
cd ../frontend
npm install
npm run dev
```

---

## 🧪 Tests

```bash
# Backend (102 tests)
cd backend && python -m pytest -v

# Frontend typecheck
cd frontend && npx tsc --noEmit
```

---

## 🏗 Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14, TailwindCSS, Framer Motion, Recharts | Responsive UI with animations |
| **Backend** | FastAPI (Python 3.14), Starlette | Async REST API |
| **Auth** | Clerk + Supabase JWT | User auth & row-level security |
| **Database** | Supabase (PostgreSQL) | Apps, todos, goals, activity logs |
| **Vector DB** | Pinecone | CV chunk similarity search |
| **LLM** | Groq (Llama 3.3 70B) / NVIDIA NIM | Goal gen, roadmap, RAG chat, cover letters |
| **Job APIs** | JSearch (primary) + Adzuna (fallback) | Live job listings |
| **Queue** | Redis | Rate limiter backend |

---

## 🔑 Environment Variables

| Variable | Source |
|----------|--------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | [Supabase](https://supabase.com) |
| `PINECONE_API_KEY`, `PINECONE_INDEX` | [Pinecone](https://pinecone.io) |
| `GROQ_API_KEY` | [Groq](https://groq.com) |
| `JSEARCH_API_KEY` | [OpenWebNinja](https://openwebninja.com) |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | [Adzuna](https://developer.adzuna.com) |
| `REDIS_URL` | Redis (localhost or Upstash) |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk](https://clerk.com) |

See `.env.example` for the full list.

---

## 📁 Project Structure

```
backend/
├── auth.py              # JWT verification, Clerk integration
├── main.py              # FastAPI app, middleware, health
├── routers/             # API endpoints by domain
│   ├── tracker.py       # Applications, todos, goals, dashboard
│   ├── jobs.py          # Job search + fit score + cover letter
│   ├── cv.py            # CV upload & sections
│   ├── chat.py          # RAG chat messages
│   ├── roadmap.py       # Roadmap generation
│   └── webhooks.py      # Clerk webhook handler
├── services/            # Business logic
│   ├── rag.py           # RAG retrieval + LLM chat
│   ├── goals.py         # AI career goal generation
│   ├── roadmap.py       # AI roadmap generation
│   ├── cover_letter.py  # AI cover letter generation
│   └── nudge.py         # Inactivity detection
├── db/                  # Database clients & schema
└── workers/             # Background CV parsing
frontend/
└── src/
    ├── app/             # Next.js pages & routes
    ├── components/      # Shared UI components
    ├── lib/api.ts       # API client
    ├── store/           # Zustand state
    └── types/           # TypeScript types
```
