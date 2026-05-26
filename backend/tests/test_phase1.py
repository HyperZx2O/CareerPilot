from fastapi.testclient import TestClient

from backend.main import app

def test_health_endpoint():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_routers_importable():
    import backend.routers.cv as cv
    import backend.routers.chat as chat
    import backend.routers.jobs as jobs
    import backend.routers.tracker as tracker
    assert hasattr(cv, "router")
    assert hasattr(chat, "router")
    assert hasattr(jobs, "router")
    assert hasattr(tracker, "router")
