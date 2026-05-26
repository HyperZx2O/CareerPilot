import os
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.rag import SESSION_HISTORY
from backend.services.embeddings import embed_chunks, upsert_to_pinecone, get_pinecone_vectors, get_supabase_cvs


def _clear_stores():
    get_pinecone_vectors().clear()
    get_supabase_cvs().clear()
    SESSION_HISTORY.clear()


def test_session_lifecycle():
    _clear_stores()
    cv_id = "test-cv-5"
    chunks = {"EXPERIENCE": "Test experience", "SKILLS": "Test skill"}
    vectors = embed_chunks(cv_id, chunks)
    upsert_to_pinecone(vectors)

    client = TestClient(app)
    # Create session
    resp = client.post("/api/chat/session")
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["session_id"]

    # Initial chat
    payload = {"message": "What is my experience?", "session_id": session_id, "cv_id": cv_id}
    resp = client.post("/api/chat/chat", json=payload)
    assert resp.status_code == 200

    # Multiple follow‑up chats to exceed 10 turns (20 messages)
    for i in range(12):
        payload = {"message": f"Follow up {i}", "session_id": session_id, "cv_id": cv_id}
        client.post("/api/chat/chat", json=payload)

    # History capped at 20 messages (10 turns)
    hist = SESSION_HISTORY.get(session_id, [])
    assert len(hist) <= 20

    # Delete session
    resp = client.delete(f"/api/chat/session/{session_id}")
    assert resp.status_code == 200
    assert session_id not in SESSION_HISTORY
