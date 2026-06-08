# Deployment Guide — CareerPilot

This guide covers deploying CareerPilot to production. The app has three
independent components that must be deployed separately:

| Component | Platform | Tech |
|-----------|----------|------|
| **Frontend** | Vercel | Next.js 14 |
| **Backend** | Render | FastAPI (Python web service) |
| **Database** | Supabase | Managed PostgreSQL |

You also need accounts for external services (Pinecone, Groq, JSearch, etc.) —
all have free tiers.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase (Database) Setup](#2-supabase-database-setup)
3. [External Services Setup](#3-external-services-setup)
4. [Backend Deployment (Render)](#4-backend-deployment-render)
5. [Frontend Deployment (Vercel)](#5-frontend-deployment-vercel)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Verifying the Deployment](#7-verifying-the-deployment)
8. [Deployment Checklist](#8-deployment-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

- A **GitHub** account (required by both Vercel and Render)
- A **Supabase** account (free at [supabase.com](https://supabase.com))
- A **Vercel** account (free at [vercel.com](https://vercel.com))
- A **Render** account (free at [render.com](https://render.com))
- The project pushed to a **GitHub repository**

---

## 2. Supabase (Database) Setup

Supabase hosts the PostgreSQL database. The backend connects to it at startup.

### Step 2.1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name**: `careerpilot`
   - **Database Password**: generate a strong password (save it)
   - **Region**: pick the closest one to your users (e.g., Singapore for Bangladesh)
4. Wait ~2 minutes for the database to provision.

### Step 2.2 — Get your API credentials

1. In the Supabase Dashboard, go to **Project Settings → API**.
2. Copy the following values (you will need them in `.env`):
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

### Step 2.3 — Run the schema

1. In the Supabase Dashboard, go to **SQL Editor**.
2. Open `backend/db/schema.sql` from your local project and paste it.
3. Click **Run** — this creates all 8 tables, indexes, RLS policies, and triggers.
4. In the SQL Editor, open and run `backend/migrations/000_bootstrap.sql` to
   create the `_migrations` tracking table and the `exec_sql` RPC function.
5. Run any remaining migration files in `backend/migrations/` in order.

### Step 2.4 — Create a demo user record

The dev auth mode expects a user in the database:

```sql
INSERT INTO users (id, clerk_id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo_user_123', 'demo@careerpilot.ai', 'Demo User')
ON CONFLICT (clerk_id) DO NOTHING;
```

---

## 3. External Services Setup

CareerPilot integrates with several external APIs. Register and get API keys for
the ones you need:

| Service | Sign Up | What You Get | Free Tier |
|---------|---------|--------------|-----------|
| **Pinecone** | [pinecone.io](https://www.pinecone.io/) | Vector DB for CV embeddings | 100k vectors |
| **Groq** | [console.groq.com](https://console.groq.com) | LLM for chat, fit reasons, roadmaps | Free (rate-limited) |
| **JSearch** | [openwebninja.com](https://openwebninja.com) | Primary job API (supports BD) | 100 req/day |
| **Adzuna** | [developer.adzuna.com](https://developer.adzuna.com) | Fallback job API | 500 req/day |
| **Sentry** | [sentry.io](https://sentry.io) | Error tracking | 5k events/month |

**Save all keys** — you will set them as environment variables on Render.

---

## 4. Backend Deployment (Render)

The FastAPI backend runs as a Render **Python web service**. No Dockerfile is
needed — Render's native Python runtime detects `requirements.txt` at the repo
root and installs dependencies automatically.

### Step 4.1 — Create a Render Web Service

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New → Web Service**.
3. Select your CareerPilot repository.
4. Fill in the settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `careerpilot-backend` |
   | **Runtime** | `Python` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |

### Step 4.2 — Set environment variables

In Render, go to your service → **Environment** tab, and add the variables
from the [full reference](#6-environment-variables-reference) below.

**Minimum required** for the backend to boot:
- `ENV`
- `DEV_DEMO_USER_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### Step 4.3 — Deploy

1. Click **Create Web Service**.
2. Render will:
   - Clone the repo
   - Install Python dependencies from `requirements.txt`
   - Start the FastAPI server with your start command
3. Once deployed, note the generated domain (e.g., `careerpilot-backend.onrender.com`).

### Step 4.4 — Auto-deploy

Render auto-deploys on every push to the linked branch by default. You can
configure this in your service → **Settings → Deploy**.

### Step 4.5 — Health check

Render provides a health check monitor:

1. Go to your service → **Settings → Health Check**.
2. Set the **Health Check Path** to `/health`.
3. Render will ping this endpoint and restart the service if it fails.

---

## 5. Frontend Deployment (Vercel)

The Next.js frontend deploys on Vercel. Since it lives in the `frontend/`
subdirectory, you must set the **Root Directory** in Vercel's project settings.

### Step 5.1 — Import the project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Select your CareerPilot repository.
4. In the **Configure Project** page:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Next.js (auto-detected) |
   | **Root Directory** | `frontend/` |
   | **Build Command** | `npm run build` (auto) |
   | **Output Directory** | `.next` (auto) |

5. Under **Environment Variables**, add:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |
   | `NEXT_PUBLIC_DEMO_USER_ID` | `demo_user_123` |

   (Replace `your-backend` with your actual Render domain from step 4.3.)

6. Click **Deploy**.

### Step 5.2 — Content-Security-Policy

The `next.config.js` already reads `NEXT_PUBLIC_API_URL` and adds its origin
to the CSP `connect-src` automatically. No manual edit needed.

### Step 5.3 — Set up a custom domain (optional)

1. In Vercel project → **Settings → Domains**.
2. Add your domain (e.g., `careerpilot.yourdomain.com`).
3. Update your DNS records as instructed by Vercel.

### Step 5.4 — Enable automatic deploys

Vercel auto-links to GitHub. Every push to `main` triggers a production deploy.
Every PR branch gets a preview URL.

---

## 6. Environment Variables Reference

### Required for all environments

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Supabase Dashboard → Project Settings → API |
| `ENV` | `development` or `production` | You set this |

### Required only for non-mock features

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `JSEARCH_API_KEY` | Primary job search API | [openwebninja.com](https://openwebninja.com) |
| `ADZUNA_APP_ID` | Fallback job search API ID | [developer.adzuna.com](https://developer.adzuna.com) |
| `ADZUNA_APP_KEY` | Fallback job search API key | [developer.adzuna.com](https://developer.adzuna.com) |
| `PINECONE_API_KEY` | Vector database API key | [pinecone.io](https://www.pinecone.io/) |
| `PINECONE_INDEX` | Pinecone index name (default: `careerpilot-cv`) | You set this |
| `EMBED_DIM` | Embedding dimension (default: `768`) | You set this |
| `GROQ_API_KEY` | LLM inference for chat, fit reasons, roadmaps | [console.groq.com](https://console.groq.com) |
| `REDIS_URL` | Redis connection string for rate limiting | Render Redis or Upstash |

### Optional

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `SENTRY_DSN` | Error tracking DSN | [sentry.io](https://sentry.io) |
| `SENTRY_TRACES_SAMPLE_RATE` | Sampling rate (default: `0.1`) | You set this |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | You set this |
| `RATE_LIMIT_ENABLED` | `true` or `false` | You set this |
| `RATE_LIMIT_MAX` | Max requests per window (default: `120`) | You set this |
| `RATE_LIMIT_WINDOW` | Window in seconds (default: `60`) | You set this |
| `SETTINGS_ADMIN_KEY` | Admin key for `/api/settings` | You set this |
| `NEXT_PUBLIC_API_URL` | Frontend: backend URL (set on Vercel) | You set this |
| `DEV_DEMO_USER_ENABLED` | Set to `true` to allow dev token auth | You set this |

### Backend → Render (environment variables)

Set these in Render Dashboard → your service → **Environment**:

**Hackathon / demo config (recommended):**
```env
ENV=development
DEV_DEMO_USER_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=careerpilot-cv
EMBED_DIM=768
GROQ_API_KEY=gsk_...
JSEARCH_API_KEY=your_jsearch_key
ADZUNA_APP_ID=your_adzuna_id
ADZUNA_APP_KEY=your_adzuna_key
```

**Production config (requires Clerk frontend integration):**
```env
ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=careerpilot-cv
EMBED_DIM=768
GROQ_API_KEY=gsk_...
JSEARCH_API_KEY=your_jsearch_key
ADZUNA_APP_ID=your_adzuna_id
ADZUNA_APP_KEY=your_adzuna_key
CORS_ALLOWED_ORIGINS=https://careerpilot.vercel.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW=60
SENTRY_DSN=https://...
SETTINGS_ADMIN_KEY=a_secure_random_string
```

### Frontend → Vercel (environment variables)

Set these in Vercel Dashboard → your project → **Settings → Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_DEMO_USER_ID=demo_user_123
```

---

## 7. Verifying the Deployment

### Check the backend health endpoint

```
https://your-backend.onrender.com/health
```

Expected response:

```json
{
  "status": "ok",
  "environment": "development",
  "checks": {
    "supabase": true,
    "pinecone": true,
    "groq": true
  }
}
```

If any check returns `false`, the corresponding service is not configured or
unreachable. The app still works (it uses fallbacks).

### Check the frontend

1. Open `https://careerpilot.vercel.app`.
2. You should see the dashboard page.
3. Click **Jobs** in the sidebar.
4. Type "ML Internships" and click Search.
5. You should see real job cards from the JSearch API.

### Check API docs

```
https://your-backend.onrender.com/docs
```

This serves the interactive Swagger UI for all REST endpoints.

### Check backend logs

In Render Dashboard → your service → **Logs**, you should see:

```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Supabase admin client initialized
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 8. Deployment Checklist

### 🏆 Hackathon / demo deploy (single user)

- [ ] Set `ENV=development` and `DEV_DEMO_USER_ENABLED=true` on Render
- [ ] Create Supabase project and run schema + migrations
- [ ] Verify `/health` returns `"status": "ok"`
- [ ] Set `NEXT_PUBLIC_API_URL` to your Render domain on Vercel
- [ ] Deploy frontend — verify search returns job cards

### 🔒 Production deploy (multi-user with Clerk)

- [ ] **Disable dev auth**: Set `DEV_DEMO_USER_ENABLED=false` and ensure Clerk
      keys are configured (`CLERK_JWKS_URL`, `CLERK_ISSUER`,
      `CLERK_AUDIENCE`, `CLERK_WEBHOOK_SECRET`). Update `frontend/src/lib/api.ts`
      to send real Clerk JWTs instead of the hardcoded `dev:demo_user_123` token.
- [ ] **Set `ENV=production`**: Enables production-only checks (no dev bypass).
- [ ] **Restrict CORS**: Set `CORS_ALLOWED_ORIGINS` to your actual frontend
      domain only (no wildcard).
- [ ] **Enable rate limiting**: Set `RATE_LIMIT_ENABLED=true` and configure
      `REDIS_URL`.
- [ ] **Configure Sentry**: Set `SENTRY_DSN` for error monitoring.
- [ ] **Run database migrations**: The backend auto-runs pending migrations
      on startup after the bootstrap SQL is applied manually.

### Additional security hardening

- Rotate `SUPABASE_SERVICE_KEY` before production launch.
- Use a separate Supabase project for production (don't share with dev).
- Enable Supabase RLS and switch from `service_role` key to anon key +
  user JWT. See `backend/db/schema.sql` for the RLS policies.
- Use a managed Redis (Upstash, Redis Cloud) with TLS.

---

## 9. Troubleshooting

### Backend fails to start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: No module named 'backend'` | CWD not set to repo root | Ensure start command is `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| `RuntimeError: SUPABASE_URL and SUPABASE_SERVICE_KEY...` | Missing env vars | Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Render Environment. |
| `Relation "_migrations" does not exist` | Bootstrap SQL not run | Run `backend/migrations/000_bootstrap.sql` in Supabase SQL Editor. |
| `Could not find a version that satisfies the requirement` | Missing package | Check `requirements.txt` at repo root includes all needed deps. |
| Port binding error | `$PORT` not set | Render sets `$PORT` automatically. Start command must use `--port $PORT`. |

### Frontend fails to start

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page after deploy | CSP blocking assets | Check browser console for CSP errors. Verify `NEXT_PUBLIC_API_URL` is set correctly on Vercel. |
| API calls return 404 | Wrong `NEXT_PUBLIC_API_URL` | Verify the URL in Vercel env vars. Must be `https://your-backend.onrender.com` (no trailing slash). |
| API calls return CORS error | Backend CORS not configured | Add `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app` on Render. |
| `fetch failed` in logs | Backend unreachable | Check Render service is running. Go to Render → service → **Logs** to see if the process started. |

### Jobs return empty results

| Symptom | Cause | Fix |
|---------|-------|-----|
| Job search returns no results | JSearch/Adzuna keys not set | Set `JSEARCH_API_KEY` and `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` on Render. |
| Fit scores are all null | No CV uploaded or Pinecone not configured | Upload a CV first, or set `PINECONE_API_KEY`. This is expected without a CV. |

### Render-specific issues

| Issue | Fix |
|-------|-----|
| Service crashes after deploy | Check logs in Render Dashboard. Common cause: missing env vars. |
| No custom domain | Render provides `*.onrender.com` domains for free. |
| Cold start slow (~30-60s) | Render spins down after 15 min of inactivity on free tier. First request after idle triggers a cold start. |
| Want a database on Render | Instead of Supabase, you can add a Render PostgreSQL. |

### Need to redeploy

**Render**: Go to Dashboard → service → **Manual Deploy** → **Deploy latest commit**,
or push to the linked GitHub branch.

**Vercel**: Push to the linked GitHub branch, or go to Vercel Dashboard →
**Deployments** → three dots → **Redeploy**.

---

## Appendix: Quick-Reference Commands

```bash
# Deploy frontend manually via Vercel CLI
cd frontend
npx vercel --prod

# Check backend health
curl https://your-backend.onrender.com/health

# Run pending migrations
# (Backend does this automatically on startup if Supabase credentials are set)

# View backend logs
# Render Dashboard → your service → Logs
```
