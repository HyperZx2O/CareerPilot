# API Contracts

The backend API follows the specifications below. All endpoints return JSON responses and appropriate HTTP status codes. The implementation in `backend/routers/*` matches these contracts.

## Health
- **GET** `/health`
- **Response (200)** `{ "status": "ok" }`

## CV Endpoints (`/api/cv`)
- **GET** `/api/cv/{cv_id}/sections`
  - **200** `{ "cv_id": "<cv_id>", "sections": ["EXPERIENCE", "SKILLS", ...] }`
  - **404** `{ "detail": "CV not found" }`
- **POST** `/api/cv/upload`
  - **Request** multipart/form-data with `file` (PDF or DOCX)
  - **200** `{ "cv_id": "<generated-uuid>", "sections_found": ["EXPERIENCE", "SKILLS", ...] }`
  - **400** `{ "detail": "Unsupported file type" }`

## Chat Endpoints (`/api/chat`)
- **POST** `/api/chat/chat`
  - **Body** `{ "message": "...", "session_id": "...", "cv_id": "..." }`
  - **Response (200)** `{ "reply": "...", "sources": ["EXPERIENCE", "SKILLS"] }`
- **POST** `/api/chat/session`
  - **Response (200)** `{ "session_id": "<uuid>" }`
- **DELETE** `/api/chat/session/{session_id}`
  - **200** `{ "detail": "deleted" }`
  - **404** `{ "detail": "session not found" }`
- **POST** `/api/chat/cover-letter`
  - **Body** `{ "cv_id": "...", "job_description": "...", "tone": "formal|friendly|enthusiastic" }`
  - **200** `{ "cover_letter": "...", "sections_used": ["EXPERIENCE"] }`
  - **404** `{ "detail": "CV not found" }`
- **POST** `/api/chat/roadmap`
  - **Body** `{ "cv_id": "...", "target_role": "...", "duration_weeks": <int> }`
  - **200** `{ "roadmap": [{ "week": 1, "focus": "...", "tasks": ["..."], "resources": ["..."] }], "existing_skills_detected": ["Python", "FastAPI"] }`
  - **404** `{ "detail": "CV not found" }`

## Placeholder Routers (`/api/jobs`, `/api/tracker`)
- **GET** `/api/jobs/placeholder` → `{ "detail": "jobs router placeholder" }`
- **GET** `/api/tracker/placeholder` → `{ "detail": "tracker router placeholder" }`

All routes are mounted in `backend/main.py` with the appropriate prefixes. The status codes and JSON shapes match the tests in `backend/tests/`.
