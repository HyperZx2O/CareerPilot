import sys
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure project root is on sys.path so `backend` is importable
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from backend.main import app
import backend.db.supabase_client as sb
from backend.tests._fake_supabase import FakeSupabaseClient
import json


def setup_fake():
    sb._supabase_client = FakeSupabaseClient()
    # Create a demo user and a completed CV with one chunk
    user = sb._supabase_client.insert_row("users", {"clerk_id": "demo_user_123"})
    db_user_id = user["id"]
    cv = sb._supabase_client.insert_row("cvs", {"id": "cv-1", "user_id": db_user_id, "filename": "resume.pdf", "processing_status": "completed"})
    sb._supabase_client.insert_row("cv_chunks", {"cv_id": cv["id"], "chunk_index": 0, "section_type": "skills", "chunk_text": "Python, FastAPI, React"})
    return sb._supabase_client


def run_tests():
    setup_fake()
    client = TestClient(app)
    results = []

    r = client.get("/health")
    results.append(("GET /health", r.status_code, r.json()))

    r = client.get("/api/settings")
    results.append(("GET /api/settings", r.status_code, r.json()))

    app_payload = {"user_id": "demo_user_123", "job_title": "Backend Engineer", "company": "ACME"}
    r = client.post("/api/tracker/applications", json=app_payload)
    results.append(("POST /api/tracker/applications", r.status_code, r.json() if r.content else None))
    app_id = r.json().get("id") if r.status_code == 201 else None

    r = client.get("/api/tracker/applications", params={"user_id": "demo_user_123"})
    results.append(("GET /api/tracker/applications", r.status_code, r.json()))

    todo_payload = {"user_id": "demo_user_123", "title": "Prepare resume"}
    r = client.post("/api/tracker/todos", json=todo_payload)
    results.append(("POST /api/tracker/todos", r.status_code, r.json() if r.content else None))

    r = client.get("/api/tracker/todos", params={"user_id": "demo_user_123"})
    results.append(("GET /api/tracker/todos", r.status_code, r.json()))

    goal_payload = {"user_id": "demo_user_123", "title": "Improve backend skills"}
    r = client.post("/api/tracker/goals", json=goal_payload)
    results.append(("POST /api/tracker/goals", r.status_code, r.json() if r.content else None))

    r = client.post("/api/tracker/goals/generate", params={"user_id": "demo_user_123"})
    results.append(("POST /api/tracker/goals/generate", r.status_code, r.json() if r.content else None))

    r = client.get(f"/api/cv/sections/cv-1")
    results.append(("GET /api/cv/sections/cv-1", r.status_code, r.json() if r.content else None))

    _mock_chunks = [{"section": "skills", "content": "Python, FastAPI, React"}]
    _mock_answer = "Mock response about improving skills."

    with patch("backend.routers.chat.retrieve_relevant_chunks", return_value=_mock_chunks):
        with patch("backend.routers.chat.generate_answer", return_value=_mock_answer):
            r = client.post("/api/chat/message", json={"content": "How can I improve my skills?"})
            results.append(("POST /api/chat/message", r.status_code, r.json() if r.content else None))

    print(json.dumps({"results": results}, indent=2, default=str))


if __name__ == "__main__":
    run_tests()
