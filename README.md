# CareerPilot

> **IUTCS CodeSprint 2026** — AI-powered job search engine and application tracker.

Upload your CV, get AI-generated career goals and roadmaps, search live jobs with automated fit scoring, manage applications on a Kanban board, track deadlines on a calendar, and chat with an AI career coach grounded in your actual skills.

---

## ✨ Features

- **🔍 Live Job Search** — Fetch real-time listings from JSearch & Adzuna with AI-powered fit scores
- **📄 CV Parsing** — Upload PDF/DOCX, auto-extract sections into Pinecone vector store
- **📊 Fit Score Engine** — Cosine similarity matching of CV against job descriptions with explainable reasons
- **📋 Kanban Tracker** — Drag-free application management (Applied → Interview → Offer → Rejected → Withdrawn)
- **📅 Calendar View** — Visualize application deadlines, interviews, and tasks on a timeline
- **🎯 AI Goals & Roadmap** — Generate career goals and weekly learning roadmaps from your CV skills via Groq
- **💬 AI Career Coach** — RAG chat grounded in your CV, goals, todos, and application history
- **📈 Dashboard** — Weekly stats, streak tracking, live job matches, and inactivity nudges
- **🔐 Clerk Auth + Supabase RLS** — Secure authentication with row-level security

---

## 🚀 Quick Start

```bash
# 1. Clone and configure
cp .env.example .env   # Fill in your API keys

# 2. Backend (port 8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Frontend (port 3000)
cd ../frontend
npm install
npm run dev
```

Or run both together via the start script:

```bash
.\start.bat
```

---

## 🧪 Tests

```bash
# Backend
cd backend && python -m pytest -v

# Frontend typecheck
cd frontend && npx tsc --noEmit
```

---

## 🏗 Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 15, TailwindCSS, Framer Motion, Recharts | Responsive UI with animations |
| **Backend** | FastAPI (Python 3.14), Starlette, Uvicorn | Async REST API |
| **Auth** | Clerk + Supabase JWT | User auth & row-level security |
| **Database** | Supabase (PostgreSQL) | Apps, todos, goals, activity logs |
| **Vector DB** | Pinecone | CV chunk similarity search |
| **LLM** | Groq (Llama 3.3 70B) / NVIDIA NIM | Goal gen, roadmap, RAG chat, cover letters |
| **Job APIs** | JSearch (primary) + Adzuna (fallback) | Live job listings |

---

## 🔑 Environment Variables

| Variable | Source |
|----------|--------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | [Supabase](https://supabase.com) |
| `PINECONE_API_KEY`, `PINECONE_INDEX` | [Pinecone](https://pinecone.io) |
| `GROQ_API_KEY` | [Groq](https://groq.com) |
| `JSEARCH_API_KEY` | [OpenWebNinja](https://openwebninja.com) |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | [Adzuna](https://developer.adzuna.com) |
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

---

## 👥 Team

Built by **Team Hackaroos** for **IUTCS CodeSprint 2026**.

| Name | Links |
|------|-------|
| **MD. Sadman Saif Zarif** | [GitHub](https://github.com/HyperZx2O) · [Facebook](https://www.facebook.com/hype.saif2) |
| **Montaha Zaman** | [GitHub](https://github.com/yvonnieeez) · [Facebook](https://www.facebook.com/profile.php?id=61574841340223) |
| **Tasmiah Tanha** | [GitHub](https://github.com/tasmiahtanhaa) · [Facebook](https://www.facebook.com/tasmiah.tanha.2025) |
