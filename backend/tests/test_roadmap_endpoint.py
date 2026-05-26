import os
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.embeddings import embed_chunks, upsert_to_pinecone, get_pinecone_vectors


def _clear_stores():
    get_pinecone_vectors().clear()


def test_roadmap_endpoint_success():
    _clear_stores()
    cv_id = "test-cv-5"
    chunks = {
        "SKILLS": "Python, FastAPI, SQL",
        "PROJECTS": "Project Alpha: data pipeline, Project Beta: API service"
    }
    vectors = embed_chunks(cv_id, chunks)
    upsert_to_pinecone(vectors)
    client = TestClient(app)
    payload = {"cv_id": cv_id, "target_role": "Data Engineer", "duration_weeks": 4}
    resp = client.post("/api/chat/roadmap", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # Expect roadmap list length matches duration_weeks
    assert isinstance(data.get("roadmap"), list)
    assert len(data["roadmap"]) == 4
    for week_entry in data["roadmap"]:
        assert isinstance(week_entry.get("week"), int)
        assert isinstance(week_entry.get("focus"), str)
        assert isinstance(week_entry.get("tasks"), list)
        assert isinstance(week_entry.get("resources"), list)
    # existing_skills_detected should contain parsed skills
    assert isinstance(data.get("existing_skills_detected"), list)
    assert "Python" in data["existing_skills_detected"]
