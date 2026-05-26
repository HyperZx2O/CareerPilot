# Implementation Plan for CareerPilot — Member A (Backend & AI / RAG Layer)

## Ownership Summary

Member A is solely responsible for the FastAPI backend, the CV ingestion pipeline, the RAG retrieval chain, the AI assistant service, and all LLM-grounded response logic. Every other feature in the product depends on this layer working correctly. Treat the RAG pipeline as the highest-priority deliverable in the entire project.

---

## Checklist of Phases

- [X] Phase 1: Repo Scaffold & Backend Skeleton
- [X] Phase 2: CV Ingestion Pipeline (PDF / DOCX → Chunks → Embeddings → Pinecone)
- [X] Phase 3: RAG Retrieval Chain
- [X] Phase 4: AI Assistant Service (All Benchmark Query Types)
- [X] Phase 5: Conversational Memory Layer
- [X] Phase 6: Cover Letter Generation Endpoint
- [X] Phase 7: Learning Roadmap Generation Endpoint
- [X] Phase 8: Unit Tests & Evaluation Suite
- [ ] Phase 9: System Design Document
- [ ] Phase 10: Final Integration, Docs & Handoff

---

## Phase 1 – Repo Scaffold & Backend Skeleton

### Goals

- Initialise the `backend/` directory with a working FastAPI application.
- Connect environment variables for all downstream services.
- Confirm the server runs and all routers are reachable before any logic is built.

### Tasks

1. Create `backend/` directory with the following structure:
   ```
   backend/
   ├── main.py
   ├── requirements.txt
   ├── .env               (gitignored)
   ├── routers/
   │   ├── __init__.py
   │   ├── cv.py
   │   ├── chat.py
   │   ├── jobs.py
   │   └── tracker.py
   ├── services/
   │   ├── __init__.py
   │   ├── rag.py
   │   ├── embeddings.py
   │   ├── fit_score.py
   │   ├── cover_letter.py
   │   └── roadmap.py
   └── models/
       ├── __init__.py
       └── schemas.py
   ```
2. Write `requirements.txt` with pinned versions:
   ```
   fastapi==0.111.0
   uvicorn[standard]==0.29.0
   python-multipart==0.0.9
   python-dotenv==1.0.1
   openai==1.30.0
   pinecone-client==4.1.0
   langchain==0.2.0
   langchain-openai==0.1.8
   pymupdf==1.24.4
   python-docx==1.1.2
   supabase==2.4.3
   httpx==0.27.0
   pytest==8.2.0
   pytest-asyncio==0.23.7
   ```
3. Scaffold `main.py` with CORS middleware, health endpoint `GET /health`, and include all four routers under `/api` prefix.
4. Add `.env.example` to repo root (not `.env`) listing: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_ENV`, `PINECONE_INDEX`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:8000`.
5. Confirm `uvicorn main:app --reload` starts with no import errors and `GET /health` returns `{"status": "ok"}`.

### Acceptance Criteria

- `uvicorn main:app --reload` runs without errors.
- `GET /health` returns `200 {"status": "ok"}`.
- All router files exist and are importable even if endpoints are stubs.
- `.env` is in `.gitignore`; `.env.example` is committed.

---

## Phase 2 – CV Ingestion Pipeline

### Goals

- Accept a PDF or DOCX CV upload via `POST /api/cv/upload`.
- Extract raw text, chunk it by semantic section (Experience, Education, Skills, Projects).
- Embed each chunk using OpenAI's `text-embedding-3-small`.
- Upsert embeddings into a Pinecone index keyed by `{cv_id}-{section}`.
- Store metadata (cv_id, user_id, section names, raw text) in Supabase.

### Tasks

1. In `routers/cv.py`, implement `POST /api/cv/upload` that accepts `multipart/form-data` with a `file` field (`.pdf` or `.docx`).
2. In `services/embeddings.py`, implement `extract_text_from_pdf(path) -> str` using `fitz` (PyMuPDF) and `extract_text_from_docx(path) -> str` using `python-docx`.
3. In `services/embeddings.py`, implement `chunk_by_section(text: str) -> dict` that uses regex to detect common CV section headers (e.g. `EXPERIENCE`, `EDUCATION`, `SKILLS`, `PROJECTS`, `SUMMARY`, case-insensitive) and returns a dict of `{section_name: text_content}`. Sections not found return an empty string, not an error.
4. In `services/embeddings.py`, implement `embed_chunks(cv_id: str, chunks: dict) -> list[dict]` that:
   - Calls `openai.embeddings.create(input=text, model="text-embedding-3-small")` for each non-empty section.
   - Returns a list of `{"id": f"{cv_id}-{section}", "values": embedding_vector, "metadata": {"cv_id": cv_id, "section": section, "text": text}}`.
5. In `services/embeddings.py`, implement `upsert_to_pinecone(vectors: list[dict])` that initialises a Pinecone client from env vars and calls `index.upsert(vectors=vectors)`.
6. In `routers/cv.py`, wire the full pipeline: save uploaded file to a temp path → extract text → chunk → embed → upsert → store cv_id in Supabase `cvs` table → return `{"cv_id": cv_id, "sections_found": [...]}`.
7. Generate a unique `cv_id` using `uuid.uuid4()`.
8. Delete the temp file after processing.

### Acceptance Criteria

- `POST /api/cv/upload` with a real PDF returns `200` with a `cv_id` and list of detected sections.
- Pinecone index contains vectors for each detected section keyed as `{cv_id}-{section}`.
- Uploading a DOCX file works identically to PDF.
- Uploading a non-PDF/DOCX file returns `400 {"detail": "Unsupported file type"}`.
- No raw CV text is logged to console or stored in plaintext outside Supabase.

---

## Phase 3 – RAG Retrieval Chain

### Goals

- Given a natural language query and a `cv_id`, retrieve the most relevant CV chunks from Pinecone and return them as context.
- This function is the single shared primitive used by every downstream AI feature. It must never hallucinate or invent user data.

### Tasks

1. In `services/rag.py`, implement `retrieve_cv_context(query: str, cv_id: str, top_k: int = 4) -> list[dict]` that:
   - Embeds the query using `text-embedding-3-small`.
   - Queries Pinecone with `filter={"cv_id": cv_id}` and `top_k=top_k`.
   - Returns a list of `{"section": metadata.section, "text": metadata.text, "score": match.score}` for each result.
2. In `services/rag.py`, implement `build_cv_context_string(chunks: list[dict]) -> str` that formats retrieved chunks into a clean prompt-ready string, e.g.:
   ```
   [EXPERIENCE]
   <text>

   [SKILLS]
   <text>
   ```
3. In `services/rag.py`, implement `rag_query(query: str, cv_id: str, system_prompt: str) -> dict` that:
   - Calls `retrieve_cv_context`.
   - Builds the context string.
   - Calls `openai.chat.completions.create` with the provided system prompt and context injected.
   - Returns `{"answer": str, "sources": [section_names_used]}`.
4. Add a hard instruction to every system prompt: `"You must only use the information provided in the CV context below. Do not invent or assume any experience, skill, or qualification not explicitly stated."`.
5. Expose `GET /api/cv/{cv_id}/sections` that returns the list of sections stored for that cv_id (useful for frontend profile preview).

### Acceptance Criteria

- `retrieve_cv_context` returns only chunks belonging to the given `cv_id`.
- If `cv_id` does not exist in Pinecone, return an empty list, not an error.
- `rag_query` never returns an answer that contradicts the retrieved chunks.
- The `sources` field in the response lists which CV sections were used.

---

## Phase 4 – AI Assistant Service (All Benchmark Query Types)

### Goals

- Implement `POST /api/chat` that handles all four benchmark query types: job readiness analysis, skill gap analysis, learning roadmap generation, and cover letter drafting.
- All responses must be grounded in the user's CV via the RAG chain from Phase 3.

### Tasks

1. In `routers/chat.py`, implement `POST /api/chat` accepting `{"message": str, "session_id": str, "cv_id": str}` and returning `{"reply": str, "sources": list[str]}`.
2. In `services/rag.py`, implement query-type detection using keyword matching:
   - Readiness: keywords like `"ready"`, `"fit for"`, `"qualified"`.
   - Gap analysis: keywords like `"missing"`, `"gap"`, `"need to learn"`, `"don't have"`.
   - Roadmap: keywords like `"roadmap"`, `"plan"`, `"how to become"`, `"3 month"`.
   - Cover letter: keywords like `"cover letter"`, `"write a letter"`, `"application letter"`.
   - Default: general Q&A grounded in CV.
3. Implement a specific system prompt for each query type:
   - **Readiness**: `"You are a career coach. Given the candidate's CV and the job description in the message, provide: (1) a clear READY / NOT READY / PARTIALLY READY verdict, (2) a bullet list of matching strengths, (3) a bullet list of gaps. Ground every point in the CV context. Do not invent qualifications."`.
   - **Gap analysis**: `"You are a career advisor. Compare the candidate's CV against the benchmark or job mentioned in the message. List only skills and qualifications that are explicitly absent from the CV. Do not suggest skills the CV already shows."`.
   - **Roadmap**: `"You are a learning planner. Based on the candidate's current skills in the CV and the target role in the message, generate a structured week-by-week roadmap for the requested duration. Include specific free learning resources (course names, platforms). Do not repeat skills already in the CV as things to learn."`.
   - **Cover letter**: `"You are a professional writer. Draft a personalised cover letter for the job described in the message. Use ONLY the experience, skills, and projects from the CV context. Do not fabricate any achievements or qualifications."`.
4. Route each detected query type to `rag_query` with the appropriate system prompt.
5. Return the LLM response and the list of CV sections used as sources.

### Acceptance Criteria

- `POST /api/chat` with `"Am I ready for a data engineer role?"` returns a verdict (READY/NOT READY/PARTIALLY READY) plus reasoning grounded in the CV.
- `POST /api/chat` with `"What skills am I missing for a Google internship?"` returns only skills absent from the CV.
- `POST /api/chat` with `"Build me a 3-month roadmap"` returns a week-by-week structured plan.
- `POST /api/chat` with `"Draft a cover letter for this posting: [description]"` returns a letter referencing actual CV content.
- Every response includes a non-empty `sources` list.
- Responses never reference experience or skills not present in the retrieved CV chunks.

---

## Phase 5 – Conversational Memory Layer

### Goals

- The assistant must remember the conversation history within a session so users can ask follow-up questions without repeating context.
- Memory is in-process (dict keyed by `session_id`); no persistence across server restarts is required for the hackathon.

### Tasks

1. In `services/rag.py`, create a module-level dict `SESSION_HISTORY: dict[str, list] = {}`.
2. Modify `POST /api/chat` handler to:
   - Look up `SESSION_HISTORY[session_id]` (default empty list).
   - Append `{"role": "user", "content": message}` to the history.
   - Pass the full history as the `messages` array to `openai.chat.completions.create`, with the system prompt as the first message and CV context injected into the system prompt.
   - Append the assistant's reply to the history.
   - Cap history at the last 10 turns to avoid exceeding context limits.
3. `POST /api/chat/session` (new endpoint) accepts `{}` and returns `{"session_id": uuid4()}` so the frontend can initialise a session.
4. `DELETE /api/chat/session/{session_id}` clears the session from memory.

### Acceptance Criteria

- A second message in the same session correctly references the first (e.g. "What about the second point you mentioned?").
- A new `session_id` starts with a clean history.
- History is capped and does not grow unboundedly.
- Deleting a session clears its history.

---

## Phase 6 – Cover Letter Generation Endpoint

### Goals

- Provide a dedicated `POST /api/chat/cover-letter` endpoint that accepts a job posting text and generates a personalised cover letter grounded entirely in the user's CV.

### Tasks

1. In `routers/chat.py`, implement `POST /api/chat/cover-letter` accepting `{"cv_id": str, "job_description": str, "tone": str}` where `tone` is one of `"formal"` | `"friendly"` | `"enthusiastic"` (default `"formal"`).
2. In `services/cover_letter.py`, implement `generate_cover_letter(cv_id: str, job_description: str, tone: str) -> dict`:
   - Retrieve all CV sections via `retrieve_cv_context(query=job_description, cv_id=cv_id, top_k=6)`.
   - Build a system prompt instructing the model to write a cover letter in the requested tone, using only retrieved CV content, structured as: opening paragraph, experience paragraph, skills paragraph, closing paragraph.
   - Call the LLM and return `{"cover_letter": str, "sections_used": list[str]}`.
3. Ensure the prompt explicitly prohibits inventing job titles, companies, or dates not present in the CV.

### Acceptance Criteria

- `POST /api/chat/cover-letter` returns a complete cover letter referencing real content from the uploaded CV.
- The `sections_used` field correctly lists which CV sections were drawn from.
- Changing `tone` produces noticeably different opening sentences.
- If `cv_id` is invalid, returns `404 {"detail": "CV not found"}`.

---

## Phase 7 – Learning Roadmap Generation Endpoint

### Goals

- Provide `POST /api/chat/roadmap` that generates a structured, week-by-week learning plan bridging the gap between the user's current CV skills and a target role.

### Tasks

1. In `routers/chat.py`, implement `POST /api/chat/roadmap` accepting `{"cv_id": str, "target_role": str, "duration_weeks": int}` where `duration_weeks` defaults to 12.
2. In `services/roadmap.py`, implement `generate_roadmap(cv_id: str, target_role: str, duration_weeks: int) -> dict`:
   - Retrieve Skills and Projects sections from Pinecone for `cv_id`.
   - Build a prompt that lists the user's existing skills (from CV) and asks the model to produce a week-by-week roadmap for `duration_weeks` weeks, skipping skills already present, including specific free resources (platform name + course/topic name) for each week.
   - Return `{"roadmap": [{"week": int, "focus": str, "tasks": list[str], "resources": list[str]}], "existing_skills_detected": list[str]}`.
3. The response must be valid JSON matching the schema above. Use `response_format={"type": "json_object"}` in the OpenAI call.

### Acceptance Criteria

- `POST /api/chat/roadmap` returns a list of week objects with `week`, `focus`, `tasks`, and `resources` keys.
- Skills already present in the CV do not appear as things to learn in the roadmap.
- `existing_skills_detected` lists skills found in the CV that are relevant to the target role.
- Duration is respected (correct number of week objects returned).

---

## Phase 8 – Unit Tests & Evaluation Suite

### Goals

- Prove that the RAG pipeline never hallucinate, fit scores are computed correctly, and all endpoints behave as specified.
- Produce the evaluation suite required by the judging rubric (5+ documented test cases).

### Tasks

1. Create `backend/tests/` with `test_cv.py`, `test_rag.py`, `test_chat.py`.
2. In `test_cv.py`, write tests for:
   - `extract_text_from_pdf` returns non-empty string for a sample PDF.
   - `chunk_by_section` correctly identifies at least Skills and Experience sections.
   - `POST /api/cv/upload` with a valid PDF returns `200` and a `cv_id`.
   - `POST /api/cv/upload` with a `.txt` file returns `400`.
3. In `test_rag.py`, write tests for:
   - `retrieve_cv_context` with a known `cv_id` returns results with matching metadata.
   - `retrieve_cv_context` with an unknown `cv_id` returns an empty list.
   - `build_cv_context_string` formats sections correctly.
4. In `test_chat.py`, write 5 end-to-end test cases for the evaluation suite, each documented as:
   ```
   Test ID: TC-01
   Input: POST /api/chat { "message": "Am I ready for a data engineer role?", "cv_id": "<test_cv_id>", "session_id": "s1" }
   Expected output: Reply contains READY/NOT READY/PARTIALLY READY verdict; sources is non-empty.
   Actual output: <filled after run>
   Pass/Fail: <filled after run>
   ```
   Cover: readiness query, gap analysis query, roadmap query, cover letter query, follow-up memory query.
5. Add `pytest.ini` configuring `asyncio_mode = auto`.
6. Run `pytest backend/tests/ -v` and confirm all tests pass.

### Acceptance Criteria

- All unit tests pass with `pytest backend/tests/ -v`.
- Evaluation suite document (`EVAL.md`) is committed to repo with 5+ test cases, each with input, expected output, actual output, and pass/fail.
- No test mocks the LLM response — at least the integration tests call the real API.

---

## Phase 9 – System Design Document

### Goals

- Produce the system design bonus document required by the judging rubric, authored by Member A since the architecture is owned here.

### Tasks

1. Create `SYSTEM_DESIGN.md` in the repo root.
2. Include the following sections:
   - **Data flow**: step-by-step description from CV upload → text extraction → chunking → embedding → Pinecone upsert → query → RAG retrieval → LLM completion → response.
   - **Architecture diagram**: ASCII or embedded image showing all services and their connections.
   - **Scaling to 10,000 users**: address Pinecone index capacity, OpenAI rate limits (use batching, exponential backoff), Supabase connection pooling (PgBouncer), horizontal scaling of FastAPI with a load balancer.
   - **Estimated cost per user/month**: calculate based on average CV size (~3,000 tokens), average 20 chat queries/month (~500 tokens each), embedding costs, Pinecone pod costs, Supabase storage. Provide a table.
   - **Key bottlenecks**: Pinecone query latency (~100ms), OpenAI embedding call on every query (mitigation: cache query embeddings), cold-start on free-tier deployment.
3. The document must be written in clear prose with specific numbers, not vague statements.

### Acceptance Criteria

- `SYSTEM_DESIGN.md` is committed and contains all five sections.
- Cost estimate includes a table with line items and a total per user/month figure.
- Bottlenecks section identifies at least three specific issues with concrete mitigations.

---

## Phase 10 – Final Integration, Docs & Handoff

### Goals

- Ensure Member A's backend integrates cleanly with Member B's frontend and Member C's integrations.
- Backend is deployable and documented.

### Tasks

1. Confirm all API contracts in `api-contracts.md` are implemented exactly as specified — same field names, same HTTP status codes.
2. Verify CORS allows requests from the deployed frontend URL (update `allow_origins` in `main.py`).
3. Write `backend/README.md` with: prerequisites (Python 3.11+), installation steps (`pip install -r requirements.txt`), required env vars (copy from `.env.example`), how to run locally (`uvicorn main:app --reload`), how to run tests (`pytest`).
4. Deploy backend to Railway: connect GitHub repo, set env vars in Railway dashboard, confirm `GET /health` returns `200` on the public URL.
5. Share the Railway public URL with Member B so they can update `NEXT_PUBLIC_API_URL`.
6. Run the full demo flow end-to-end with Member B and Member C present: upload CV → query chat → confirm sources are real CV sections.

### Acceptance Criteria

- All endpoints in `api-contracts.md` return the documented response shapes.
- `backend/README.md` allows a fresh developer to run the project with no additional guidance.
- Backend is live on Railway with a public HTTPS URL.
- End-to-end demo flow passes without errors.

---

*This plan is intentionally granular to enable a coding agent to work through each phase sequentially. Complete each phase fully and verify all acceptance criteria before proceeding to the next.*
