import os
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.rag import SESSION_HISTORY
from backend.services.embeddings import embed_chunks, upsert_to_pinecone, get_pinecone_vectors, get_supabase_cvs


def _clear_stores():
    get_pinecone_vectors().clear()
    get_supabase_cvs().clear()
    SESSION_HISTORY.clear()


def test_cover_letter_endpoint():
    _clear_stores()
    cv_id = "test-cv-6"
    chunks = {"EXPERIENCE": "Data analyst at DataCo", "SKILLS": "SQL, Tableau"}
    vectors = embed_chunks(cv_id, chunks)
    upsert_to_pinecone(vectors)
    client = TestClient(app)
    payload = {"cv_id": cv_id, "job_description": "Senior Data Analyst role focusing on reporting", "tone": "friendly"}
    resp = client.post("/api/chat/cover-letter", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["cover_letter"], str)
    assert isinstance(data["sections_used"], list)
    assert len(data["sections_used"]) > 0

def test_cover_letter_invalid_cv():
    _clear_stores()
    client = TestClient(app)
    payload = {"cv_id": "nonexistent", "job_description": "Any job", "tone": "formal"}
    resp = client.post("/api/chat/cover-letter", json=payload)
    assert resp.status_code == 404
    data = resp.json()
    assert data["detail"] == "CV not found"
