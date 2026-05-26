import os
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.embeddings import get_supabase_cvs


def _clear_stores():
    get_supabase_cvs().clear()

def test_get_cv_sections_invalid_cv():
    _clear_stores()
    client = TestClient(app)
    # Try to get sections for a CV ID that does not exist
    resp = client.get("/api/cv/nonexistent-id/sections")
    assert resp.status_code == 404
    data = resp.json()
    assert data["detail"] == "CV not found"
