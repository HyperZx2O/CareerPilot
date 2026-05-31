# Implementation Plan for CareerPilot — Member C (Integrations, Tracker & Deployment)

## Ownership Summary

Member C is responsible for three distinct areas: (1) the Job Hunter agent — the live external job search integration and the programmatic fit score engine; (2) the Tracker backend — all Supabase tables, API endpoints, and business logic for the Kanban board, Calendar, To-Dos, Goals, Dashboard stats, and AI Nudge system; and (3) deployment — getting the full stack live on public URLs before the submission deadline. Member C's work feeds directly into Member A's AI layer (fit scores) and Member B's frontend (all tracker and dashboard data).

---

## Checklist of Phases

- [ ] Phase 1: External Services Setup & Database Schema
- [ ] Phase 2: Job Hunter Agent (Live Search + Structured Job Cards)
- [ ] Phase 3: Fit Score Engine (Programmatic Cosine Similarity)
- [ ] Phase 4: Jobs Router Integration (Wiring Agent + Fit Score to API)
- [ ] Phase 5: Application Tracker Backend (Kanban CRUD)
- [ ] Phase 6: To-Do & Goal Backend
- [ ] Phase 7: Dashboard Stats & AI Nudge Endpoint
- [ ] Phase 8: Unit Tests for Integrations & Tracker
- [ ] Phase 9: Deployment (Vercel + Railway)
- [ ] Phase 10: README, Architecture Diagram & Final Handoff

---

## Phase 1 – External Services Setup & Database Schema

### Goals

- Sign up for and verify all third-party accounts needed by Member C.
- Create all Supabase database tables that Member C's endpoints will use.
- Share credentials with the team via the shared `.env.example` file.

### Tasks

1. Sign up for **Adzuna API** at `developer.adzuna.com`. Create an application and note the `App ID` and `App Key`. Confirm the free tier allows at least 250 requests/day.
2. Sign up for **Supabase** at `supabase.com`. Create a project named `careerpilot`. Note the `Project URL` and `anon` public key.
3. Sign up for **Pinecone** at `pinecone.io`. Create an index named `careerpilot-cv` with dimension `1536` (matching `text-embedding-3-small`) and metric `cosine`. Note the API key and environment.
4. Open the Supabase SQL editor and run the following schema:
   ```sql
   CREATE TABLE cvs (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     sections_found text[],
     created_at timestamptz DEFAULT now()
   );

   CREATE TABLE applications (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     job_title text NOT NULL,
     company text NOT NULL,
     location text,
     deadline date,
     status text DEFAULT 'applied'
       CHECK (status IN ('applied', 'interviewing', 'offer', 'rejected')),
     notes text,
     job_id text,
     fit_score int,
     applied_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );

   CREATE TABLE todos (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     title text NOT NULL,
     due_date date,
     done boolean DEFAULT false,
     goal_id uuid,
     created_at timestamptz DEFAULT now()
   );

   CREATE TABLE goals (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     title text NOT NULL,
     target_date date,
     progress int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
     created_at timestamptz DEFAULT now()
   );

   CREATE TABLE activity_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     action text NOT NULL,
     created_at timestamptz DEFAULT now()
   );
   ```
5. Add Row Level Security (RLS) policies: for now, enable RLS on all tables but add a permissive policy `USING (true)` so the frontend can read/write without auth (acceptable for the hackathon demo). Comment the policy with `-- TODO: scope to authenticated user before production`.
6. Update the shared `api-contracts.md` and `.env.example` with all new keys: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PINECONE_API_KEY`, `PINECONE_ENV`, `PINECONE_INDEX`.
7. Confirm Member A can connect to Pinecone and Supabase using the shared credentials.

### Acceptance Criteria

- Adzuna API returns results for a test query via `curl`.
- All five Supabase tables exist and a test `INSERT` and `SELECT` succeed for each.
- Pinecone index `careerpilot-cv` exists with dimension 1536 and cosine metric.
- All env vars are documented in `.env.example`.

---

## Phase 2 – Job Hunter Agent (Live Search + Structured Job Cards)

### Goals

- Build a Python module that calls the Adzuna API, parses the raw response, and returns clean structured job card objects matching the API contract.
- This is the live external tool call required by the judging rubric.

### Tasks

1. Create `integrations/job_hunter.py` with the following functions:
2. Implement `search_jobs(query: str, location: str = "bd", results: int = 10) -> list[dict]`:
   - Build the Adzuna API URL: `https://api.adzuna.com/v1/api/jobs/gb/search/1` (use `gb` if `bd` returns no results — Adzuna coverage in Bangladesh is limited; fallback to `gb` and note this in the README).
   - Pass params: `app_id`, `app_key`, `what=query`, `where=location`, `results_per_page=results`, `content-type=application/json`.
   - On HTTP error, raise a descriptive exception; do not return partial data silently.
3. Implement `parse_job(raw: dict) -> dict` that transforms one Adzuna result into the canonical job card schema:
   ```python
   {
       "id": raw["id"],
       "title": raw["title"],
       "company": raw.get("company", {}).get("display_name", "Unknown"),
       "location": raw.get("location", {}).get("display_name", "Remote"),
       "salary_min": raw.get("salary_min"),
       "salary_max": raw.get("salary_max"),
       "deadline": raw.get("created"),   # ISO date string
       "description": raw.get("description", ""),
       "url": raw.get("redirect_url", ""),
   }
   ```
4. Implement `get_structured_jobs(query: str, location: str) -> list[dict]` that calls `search_jobs`, maps each result through `parse_job`, and returns the list. This is the function called by the FastAPI router.
5. Add a `__main__` block so `python integrations/job_hunter.py` prints 3 parsed job cards to the terminal for manual verification.
6. Write `integrations/requirements.txt` with `requests` and `python-dotenv`.

### Acceptance Criteria

- `python integrations/job_hunter.py` prints 3 valid structured job cards with all required fields.
- `get_structured_jobs("machine learning engineer", "london")` returns at least 5 results.
- If Adzuna returns an error (e.g. invalid key), the function raises a clear exception rather than returning an empty list silently.
- The `description` field is populated and non-empty for at least 80% of results.

---

## Phase 3 – Fit Score Engine (Programmatic Cosine Similarity)

### Goals

- Compute a numerical fit score (0–100%) for a given job against the user's uploaded CV using cosine similarity between embeddings.
- The score must be computed programmatically — not generated by the LLM as free text — so it is consistent and verifiable.

### Tasks

1. Create `integrations/fit_score.py` with the following functions:
2. Implement `embed_text(text: str) -> list[float]` that calls `openai.embeddings.create(input=text, model="text-embedding-3-small")` and returns the embedding vector.
3. Implement `cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float` using the formula:
   ```python
   import numpy as np
   def cosine_similarity(a, b):
       a, b = np.array(a), np.array(b)
       return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
   ```
4. Implement `compute_fit_score(cv_id: str, job_description: str) -> dict`:
   - Query Pinecone for the top 4 CV chunks belonging to `cv_id` using the job description as the query (reuse `retrieve_cv_context` from Member A's `services/rag.py` OR re-implement the Pinecone query directly here to avoid circular imports).
   - Embed the `job_description` text.
   - For each retrieved CV chunk, compute cosine similarity between the chunk embedding (stored in Pinecone) and the job description embedding.
   - Weighted average score: Experience chunk × 0.4, Skills chunk × 0.35, Projects chunk × 0.15, Education chunk × 0.10.
   - Multiply by 100 and round to nearest integer.
   - Return:
     ```python
     {
         "score": int,                        # 0–100
         "fit_reasons": list[str],            # top 3 reasons the job matches
         "gap_reasons": list[str],            # top 2 reasons the job does not match
     }
     ```
5. For `fit_reasons` and `gap_reasons`: after computing the score, make one LLM call with a strict prompt: `"Given the CV sections below and this job description, list exactly 3 bullet points explaining why this candidate is a good fit, and exactly 2 bullet points explaining gaps. Only reference content explicitly in the CV. Output JSON: {fit_reasons: [...], gap_reasons: [...]}"`. Parse the JSON response.
6. Add a `__main__` block that computes a fit score for a hardcoded job description and prints the result.

### Acceptance Criteria

- `compute_fit_score` returns a dict with `score` (integer 0–100), `fit_reasons` (list of 3 strings), `gap_reasons` (list of 2 strings).
- Running the same inputs twice returns the same score (deterministic cosine similarity).
- The `score` is not hardcoded or LLM-generated — it is computed via cosine similarity as above.
- `fit_reasons` and `gap_reasons` only reference content present in the CV chunks.

---

## Phase 4 – Jobs Router Integration

### Goals

- Wire the job hunter agent and fit score engine into the FastAPI backend so `GET /api/jobs/search` returns structured job cards with fit scores in a single response.

### Tasks

1. In `backend/routers/jobs.py`, implement `GET /api/jobs/search` accepting query params `q: str`, `location: str = "bd"`, `cv_id: str`.
2. In the handler:
   - Call `get_structured_jobs(q, location)` from `integrations/job_hunter.py`.
   - For each job, call `compute_fit_score(cv_id, job["description"])` from `integrations/fit_score.py`.
   - Merge the fit score result into the job card dict: add `fit_score`, `fit_reasons`, `gap_reasons`.
   - Sort the results by `fit_score` descending.
   - Return `{"jobs": sorted_job_list}`.
3. Add `GET /api/jobs/{job_id}/fit` accepting `cv_id: str` as a query param — returns the fit score for a single specific job (used when the user opens a job detail view).
4. Because fit score calls are made per job, run them concurrently using `asyncio.gather` to avoid sequential latency.
5. Add a 30-second timeout on the Adzuna API call using `httpx.AsyncClient` with `timeout=30`.
6. If `cv_id` is not provided or not found in Pinecone, return jobs without fit scores (`fit_score: null`) rather than erroring out.

### Acceptance Criteria

- `GET /api/jobs/search?q=data+engineer&location=london&cv_id=<valid_id>` returns jobs sorted by `fit_score` descending.
- Each job card contains `fit_score` (integer), `fit_reasons` (list), `gap_reasons` (list).
- Fit score calls run concurrently — total response time for 10 jobs must be under 10 seconds.
- Omitting `cv_id` returns jobs with `fit_score: null` rather than a 500 error.

---

## Phase 5 – Application Tracker Backend (Kanban CRUD)

### Goals

- Build all CRUD endpoints for the Kanban application tracker, persisting data to the Supabase `applications` table.

### Tasks

1. In `backend/routers/tracker.py`, implement the following endpoints:
2. `GET /api/tracker/applications?user_id=`: fetches all applications for a user from Supabase, ordered by `applied_at` descending. Returns `{"applications": [...]}`.
3. `POST /api/tracker/applications`: accepts the application schema below and inserts into Supabase. Returns the created row.
   ```json
   {
     "user_id": "uuid",
     "job_title": "string",
     "company": "string",
     "location": "string",
     "deadline": "YYYY-MM-DD",
     "status": "applied",
     "notes": "string",
     "job_id": "string",
     "fit_score": 82
   }
   ```
4. `PATCH /api/tracker/applications/{id}`: accepts a partial application object (any fields). Updates only the provided fields in Supabase. Used for drag-and-drop status changes and note edits. Returns the updated row.
5. `DELETE /api/tracker/applications/{id}`: deletes the application by id. Returns `204 No Content`.
6. After every write operation (`POST`, `PATCH`, `DELETE`), insert a row into the `activity_log` table: `{"user_id": user_id, "action": "application_created" | "application_updated" | "application_deleted"}`.
7. Add input validation using Pydantic models in `backend/models/schemas.py` for the application create and update payloads.

### Acceptance Criteria

- `POST /api/tracker/applications` inserts a row in Supabase and returns the full created object.
- `PATCH /api/tracker/applications/{id}` with `{"status": "interviewing"}` updates only the status and returns the updated row.
- `DELETE /api/tracker/applications/{id}` removes the row and returns `204`.
- Every write logs to `activity_log`.
- Invalid `status` values (not in the enum) return `422 Unprocessable Entity`.

---

## Phase 6 – To-Do & Goal Backend

### Goals

- Build CRUD endpoints for the To-Do list and Goals system that Member B's calendar and goal tracker rely on.

### Tasks

1. In `backend/routers/tracker.py`, add the following To-Do endpoints:
2. `GET /api/tracker/todos?user_id=&date=`: fetches todos for a user. If `date` is provided (format `YYYY-MM-DD`), filter by `due_date = date`. Returns `{"todos": [...]}`.
3. `POST /api/tracker/todos`: creates a new todo. Accepts `{"user_id", "title", "due_date", "goal_id"}`. Returns the created row.
4. `PATCH /api/tracker/todos/{id}`: updates a todo (supports `done: true/false`, `title`, `due_date`, `goal_id`). Returns the updated row.
5. `DELETE /api/tracker/todos/{id}`: deletes a todo. Returns `204`.
6. Add the following Goal endpoints:
7. `GET /api/tracker/goals?user_id=`: fetches all goals for a user. Returns `{"goals": [...]}`.
8. `POST /api/tracker/goals`: creates a goal. Accepts `{"user_id", "title", "target_date"}`. Returns the created row.
9. `PATCH /api/tracker/goals/{id}`: updates a goal. Supports `progress` (0–100), `title`, `target_date`. Returns the updated row.
10. `DELETE /api/tracker/goals/{id}`: deletes a goal and all linked todos (cascade). Returns `204`.
11. Validate that `progress` is between 0 and 100 in the Pydantic model; return `422` otherwise.
12. When a todo is marked `done: true`, automatically recalculate the linked goal's `progress` field: `progress = (count of done todos for this goal / total todos for this goal) * 100`, rounded to integer, and `PATCH` the goal in Supabase.

### Acceptance Criteria

- `GET /api/tracker/todos?user_id=x&date=2025-06-01` returns only todos due on that date.
- Marking a todo done triggers automatic goal progress recalculation in Supabase.
- `DELETE /api/tracker/goals/{id}` also removes all todos with that `goal_id`.
- `PATCH /api/tracker/goals/{id}` with `{"progress": 150}` returns `422`.

---

## Phase 7 – Dashboard Stats & AI Nudge Endpoint

### Goals

- Build `GET /api/dashboard/stats` that aggregates real data from Supabase for the progress dashboard.
- Build `GET /api/nudge` that proactively detects inactivity and surfaces matching job openings.

### Tasks

1. In `backend/routers/tracker.py`, implement `GET /api/dashboard/stats?user_id=&cv_id=`:
   - **Applications this week**: count of `applications` rows where `applied_at >= now() - interval '7 days'`.
   - **Applications last week**: same for the prior 7-day window. Used by frontend to compute the trend arrow.
   - **Skills count**: count the number of comma/newline-separated tokens in the Skills section of the CV (fetch from Pinecone metadata for `{cv_id}-skills` and count whitespace-separated words as a proxy).
   - **Roadmap progress**: fetch the goal named closest to "roadmap" (case-insensitive LIKE query) and return its `progress` field. If none found, return `0`.
   - **Streak**: count consecutive days (from today backwards) where `activity_log` has at least one entry for the user. Stop counting on the first day with no entry.
   - Return all as `{"applications_this_week": int, "applications_last_week": int, "skills_count": int, "roadmap_progress": int, "streak_days": int}`.
2. Implement `GET /api/nudge?user_id=&cv_id=`:
   - Check `activity_log` for the user. If there are no entries in the last 3 days, the nudge is active.
   - If nudge is active: call `get_structured_jobs` with a query derived from the CV's Skills section (top 3 skill tokens joined with spaces), compute fit scores, and return the top 3 jobs plus the message: `"You haven't applied in 3 days. Here are 3 openings that match your profile."`.
   - If nudge is not active, return `{"message": null, "jobs": []}`.

### Acceptance Criteria

- `GET /api/dashboard/stats` returns all 5 fields with correct values based on real Supabase data.
- Streak counter correctly identifies consecutive active days (test with manually inserted `activity_log` rows).
- `GET /api/nudge` returns a non-null message and 3 jobs when the user has no activity in the past 3 days.
- `GET /api/nudge` returns `{"message": null, "jobs": []}` when the user has recent activity.

---

## Phase 8 – Unit Tests for Integrations & Tracker

### Goals

- Verify the job hunter, fit score engine, and all tracker endpoints behave correctly.

### Tasks

1. Create `backend/tests/test_jobs.py` with tests for:
   - `parse_job` correctly maps an Adzuna raw result to the canonical schema.
   - `GET /api/jobs/search` with a valid `q` and `cv_id` returns jobs with `fit_score` populated.
   - `GET /api/jobs/search` with no `cv_id` returns jobs with `fit_score: null`.
2. Create `backend/tests/test_fit_score.py` with tests for:
   - `cosine_similarity` of two identical vectors returns `1.0`.
   - `cosine_similarity` of two orthogonal vectors returns `0.0`.
   - `compute_fit_score` returns a dict with keys `score`, `fit_reasons`, `gap_reasons`.
   - `score` is an integer between 0 and 100.
3. Create `backend/tests/test_tracker.py` with tests for:
   - `POST /api/tracker/applications` creates a row and returns it.
   - `PATCH /api/tracker/applications/{id}` with `{"status": "interviewing"}` returns updated row.
   - `DELETE /api/tracker/applications/{id}` returns `204` and the row no longer exists.
   - `PATCH /api/tracker/todos/{id}` with `{"done": true}` triggers goal progress recalculation.
   - `GET /api/dashboard/stats` returns all 5 expected fields.
4. Run `pytest backend/tests/test_jobs.py backend/tests/test_fit_score.py backend/tests/test_tracker.py -v` and confirm all tests pass.

### Acceptance Criteria

- All tests pass with `pytest -v`.
- `cosine_similarity` unit tests confirm mathematical correctness.
- Tracker CRUD tests use a test Supabase project or mock the Supabase client — do not pollute the production database with test data.

---

## Phase 9 – Deployment (Vercel + Railway)

### Goals

- Deploy the full stack to public URLs before the submission deadline. This is required for the bonus live deployment points.

### Tasks

1. **Deploy backend to Railway**:
   - Go to `railway.app`, create a new project, connect the GitHub repo.
   - Set the root directory to `backend/`.
   - Add a `Procfile` in `backend/`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`.
   - Set all environment variables in the Railway dashboard (copy from `.env`).
   - Trigger a deploy and confirm `GET /health` returns `200` on the Railway public URL.
   - Share the Railway URL with Member A (for their `.env` update) and Member B (for `NEXT_PUBLIC_API_URL`).
2. **Deploy frontend to Vercel**:
   - Go to `vercel.com`, import the GitHub repo.
   - Set the root directory to `frontend/`.
   - Add environment variable `NEXT_PUBLIC_API_URL=<railway_backend_url>`.
   - Trigger a deploy and confirm the Vercel URL loads the onboarding page.
3. **Smoke test the live deployment**:
   - Upload a PDF CV on the live Vercel URL and confirm `cv_id` is returned.
   - Search for a job and confirm fit scores appear.
   - Send a chat message and confirm a RAG-grounded response is returned.
   - Add an application to the Kanban board and confirm it persists on refresh.
4. **Add live URLs to README**:
   - `Frontend`: `<vercel_url>`
   - `Backend API`: `<railway_url>`
   - `API Docs`: `<railway_url>/docs` (FastAPI auto-generates Swagger UI)

### Acceptance Criteria

- Both URLs are publicly accessible without VPN or login.
- All four pillars are functional on the live deployment.
- `GET <railway_url>/health` returns `200`.
- `GET <railway_url>/docs` renders the FastAPI Swagger UI with all endpoints listed.
- Live URLs are committed to `README.md`.

---

## Phase 10 – README, Architecture Diagram & Final Handoff

### Goals

- Produce the project-level documentation required by the judging rubric: a complete README, an architecture diagram showing data flow from CV upload to agent response, and a final end-to-end review.

### Tasks

1. Write the root `README.md` with the following sections:
   - **Project overview**: one paragraph describing CareerPilot and the four pillars.
   - **Live demo**: Vercel URL and a link to the demo video.
   - **Architecture**: embed the architecture diagram image (see below).
   - **Tech stack**: table listing Frontend (Next.js 14, Tailwind, shadcn/ui), Backend (FastAPI, LangChain, OpenAI), Vector DB (Pinecone), Database (Supabase), Deployment (Vercel + Railway).
   - **Setup (local)**: numbered steps — clone repo, copy `.env.example` to `.env`, fill in keys, `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`, `cd frontend && npm install && npm run dev`.
   - **Required environment variables**: table with variable name, description, and where to get it.
   - **Running tests**: `pytest backend/tests/ -v`.
   - **Team**: list all three members and their ownership areas.
2. Create `docs/architecture.png`: draw and export an architecture diagram (use Excalidraw or draw.io) showing: User → Next.js frontend → FastAPI backend → [Pinecone, Supabase, OpenAI, Adzuna API]. Arrows labelled with the data they carry (e.g. "CV chunks + embeddings", "job search query", "RAG response").
3. Reference `docs/architecture.png` in `README.md` with `![Architecture](docs/architecture.png)`.
4. Confirm the judging panel can run the project locally in under 5 minutes by following only the README steps — no additional guidance should be needed.
5. Create a final GitHub release tag `v1.0.0` on the `main` branch after all code is merged.

### Acceptance Criteria

- `README.md` covers all eight listed sections.
- A fresh developer following only the README can run the project locally without errors.
- `docs/architecture.png` is committed and renders in the GitHub README.
- A `v1.0.0` release tag exists on the `main` branch.
- All branches (`feature/backend-rag`, `feature/frontend-ui`, `feature/integrations-tracker`) are merged into `main`.

---

*This plan is intentionally granular to enable a coding agent to work through each phase sequentially. Complete each phase fully and verify all acceptance criteria before proceeding to the next.*
