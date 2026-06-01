# API Contracts — CareerPilot

> **Sacred shared document.** Frontend and backend teams must keep this in sync. Any breaking change requires updating this file first.

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local       | `http://localhost:8000` |
| Staging     | *(self-hosted)* |
| Production  | *(self-hosted)* |

## Authentication

All endpoints except `GET /health` require a valid **Clerk JWT** in the `Authorization: Bearer <token>` header. The backend validates the token against Clerk's JWKS endpoint on every request. The `user_id` is extracted from the JWT claims and used to scope all database queries.

---

## 1. System

### `GET /health`

Health check — no authentication required.

**Response `200`**
```json
{ "status": "ok", "environment": "development" }
```

---

## 2. CV Upload & Profile (`/api/cv`)

### `POST /api/cv/upload`

Upload a CV file (PDF or DOCX). Kicks off background processing via Celery.

**Request:** `multipart/form-data`
| Field  | Type     | Required | Description |
|--------|----------|----------|-------------|
| `file` | `File`   | ✅       | PDF or DOCX file |

**Response `200`**
```json
{
  "cv_id": "uuid-string",
  "status": "queued"
}
```

**Errors:**
- `400` — Unsupported file type (not PDF/DOCX)
- `401` — Missing or invalid JWT

---

## 3. Job Search (`/api/jobs`)

### `GET /api/jobs/search`

Search for jobs via the Adzuna/JSearch API. Optionally compute fit scores against user's CV.

**Query Parameters:**
| Param      | Type     | Required | Default | Description |
|------------|----------|----------|---------|-------------|
| `q`        | `string` | ✅       | —       | Job search keywords |
| `location` | `string` | ❌       | `"bd"`  | Location code (e.g. `"gb"`, `"us"`) |
| `cv_id`    | `string` | ❌       | `null`  | CV UUID — triggers fit score computation |

**Response `200`**
```json
{
  "jobs": [
    {
      "id": "jsearch-id",
      "title": "Software Engineer",
      "company": "Acme Corp",
      "location": "London, UK",
      "salary_min": 40000,
      "salary_max": 65000,
      "currency": "GBP",
      "deadline": "2026-07-01",
      "description": "Full job description...",
      "url": "https://example.com/job/123",
      "source": "adzuna",
      "fit_score": 82,
      "fit_reasons": ["Python experience matches", "FastAPI mentioned"],
      "gap_reasons": ["No Kubernetes experience listed"],
      "fetched_at": "2026-05-27T12:00:00Z"
    }
  ]
}
```

Jobs are **sorted by `fit_score` descending**; jobs with `null` scores appear last.

### `GET /api/jobs/{job_id}/fit`

Get detailed fit score for a single job.

**Query Parameters:**
| Param         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `cv_id`       | `string` | ✅       | CV UUID |
| `description` | `string` | ❌       | Job description text (fallback to default if omitted) |

**Response `200`**
```json
{
  "fit_score": 74,
  "fit_reasons": ["..."],
  "gap_reasons": ["..."]
}
```

---

## 4. AI Chat (`/api/chat`)

### `POST /api/chat/message`

Send a user message to the RAG-powered AI assistant. Returns the assistant's grounded response.

**Request Body:**
```json
{
  "content": "Am I ready for a frontend developer role?"
}
```

**Response `200`**
```json
{
  "answer": "Based on your CV, you have strong React experience but...",
  "sources": ["skills", "experience"]
}
```

The assistant supports four query types: **readiness analysis**, **skill gap analysis**, **learning roadmap**, and **cover letter drafting**. Query type is auto-detected from the message content. Conversational memory is maintained within a session (last 10 turns).

---

## 5. Kanban Tracker (`/api/tracker`)

### Applications

#### `GET /api/tracker/applications`

| Param     | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `user_id` | `string` | ✅       | UUID of the user |

**Response `200`**
```json
{
  "applications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "job_title": "Software Engineer",
      "company": "Acme Corp",
      "location": "Remote",
      "deadline": "2026-07-01",
      "status": "applied",
      "notes": "Applied via LinkedIn",
      "job_id": "jsearch-id",
      "fit_score": 85,
      "applied_at": "2026-05-27T12:00:00Z",
      "updated_at": "2026-05-27T12:00:00Z"
    }
  ]
}
```

#### `POST /api/tracker/applications`

**Request Body:** `ApplicationCreate`
```json
{
  "user_id": "uuid",
  "job_title": "Software Engineer",
  "company": "Acme Corp",
  "status": "applied"
}
```

**Response `201`** — `ApplicationResponse` object

#### `PATCH /api/tracker/applications/{id}`

**Request Body:** `ApplicationUpdate` (partial — only include fields to change)
```json
{
  "status": "interviewing",
  "notes": "Phone screen scheduled"
}
```

**Response `200`** — Updated `ApplicationResponse`

#### `DELETE /api/tracker/applications/{id}`

**Response `204`** — No content

### Todos

#### `GET /api/tracker/todos`

| Param     | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `user_id` | `string` | ✅       | UUID |
| `date`    | `string` | ❌       | Filter by `due_date` (YYYY-MM-DD) |

**Response `200`**
```json
{
  "todos": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Update LinkedIn profile",
      "due_date": "2026-05-30",
      "done": false,
      "goal_id": "uuid-or-null",
      "created_at": "2026-05-27T10:00:00Z"
    }
  ]
}
```

#### `POST /api/tracker/todos`

**Request Body:** `TodoCreate`
```json
{
  "user_id": "uuid",
  "title": "Prepare for interview",
  "due_date": "2026-06-01",
  "goal_id": "optional-goal-uuid"
}
```

**Response `201`** — `TodoResponse`

#### `PATCH /api/tracker/todos/{id}`

**Request Body:** `TodoUpdate` (partial)
```json
{ "done": true }
```

When `done` changes and the todo has a linked `goal_id`, the goal's `progress` is automatically recalculated.

**Response `200`** — Updated `TodoResponse`

#### `DELETE /api/tracker/todos/{id}`

**Response `204`** — No content. Linked goal progress is recalculated.

### Goals

#### `GET /api/tracker/goals`

| Param     | Type     | Required |
|-----------|----------|----------|
| `user_id` | `string` | ✅       |

**Response `200`**
```json
{
  "goals": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Complete Python roadmap",
      "target_date": "2026-08-01",
      "progress": 45,
      "created_at": "2026-05-27T08:00:00Z"
    }
  ]
}
```

#### `POST /api/tracker/goals` — `201`
#### `PATCH /api/tracker/goals/{id}` — `200`
#### `DELETE /api/tracker/goals/{id}` — `204` (cascade-deletes linked todos)

---

## 6. Dashboard (`/api/tracker/dashboard`)

### `GET /api/tracker/dashboard/stats`

| Param     | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `user_id` | `string` | ✅       | UUID |
| `cv_id`   | `string` | ❌       | CV UUID — used to count skills from Pinecone |

**Response `200`**
```json
{
  "applications_this_week": 3,
  "applications_last_week": 5,
  "skills_count": 12,
  "roadmap_progress": 45,
  "streak_days": 7
}
```

### `GET /api/tracker/nudge`

Proactive AI nudge — returns a message and matching jobs if user has been inactive for 3+ days.

| Param     | Type     | Required |
|-----------|----------|----------|
| `user_id` | `string` | ✅       |
| `cv_id`   | `string` | ❌       |

**Response `200`**
```json
{
  "message": "You haven't applied in 3 days. Here are 3 openings that match your profile.",
  "jobs": [{ "...job objects..." }]
}
```

If user is active: `{ "message": null, "jobs": [] }`

---

## Shared Schemas

All Pydantic schemas are defined in `backend/models/schemas.py`. The canonical data model definitions live in `context/master-spec.md` Section 6.

### Status Enum (Applications)

```
"applied" | "interviewing" | "offer" | "rejected"
```

### Activity Actions

```
"cv_uploaded" | "job_searched" | "application_created" | "application_updated"
| "application_deleted" | "chat_message_sent" | "todo_completed" | "goal_created"
```

---

## Error Format

All error responses follow:
```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| `400`  | Validation error / bad input |
| `401`  | Authentication failure |
| `404`  | Resource not found |
| `502`  | Upstream service failure (JSearch, Pinecone) |

---

*This document is the single source of truth for API contracts. Update this file before changing any endpoint signature.*
