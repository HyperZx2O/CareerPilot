import os
import tempfile
import pytest
import httpx
import fitz

from backend.main import app

@pytest.fixture
def anyio_backend():
    return "asyncio"

def create_sample_pdf(content: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), content)
    doc.save(path)
    doc.close()
    return path

@pytest.mark.anyio
async def test_readiness_query():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, FastAPI")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # upload CV
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = upload_resp.json()["cv_id"]
        # create session
        sess_resp = await client.post("/api/chat/session", headers={"Authorization": "Bearer test"})
        session_id = sess_resp.json()["session_id"]
        # readiness query
        payload = {"message": "Am I ready for a data engineer role?", "session_id": session_id, "cv_id": cv_id}
        resp = await client.post("/api/chat/chat", json=payload, headers={"Authorization": "Bearer test"})
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert data["sources"]

@pytest.mark.anyio
async def test_gap_analysis_query():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, FastAPI")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = upload_resp.json()["cv_id"]
        sess_resp = await client.post("/api/chat/session", headers={"Authorization": "Bearer test"})
        session_id = sess_resp.json()["session_id"]
        payload = {"message": "What skills am I missing for a Google internship?", "session_id": session_id, "cv_id": cv_id}
        resp = await client.post("/api/chat/chat", json=payload, headers={"Authorization": "Bearer test"})
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert data["sources"]

@pytest.mark.anyio
async def test_roadmap_query():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, FastAPI")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = upload_resp.json()["cv_id"]
        payload = {"cv_id": cv_id, "target_role": "Data Engineer", "duration_weeks": 4}
        resp = await client.post("/api/chat/roadmap", json=payload, headers={"Authorization": "Bearer test"})
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["roadmap"], list)
    assert len(data["roadmap"]) == 4
    assert "existing_skills_detected" in data

@pytest.mark.anyio
async def test_cover_letter_endpoint():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, FastAPI")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = upload_resp.json()["cv_id"]
        payload = {"cv_id": cv_id, "job_description": "Data analyst role at Acme Corp", "tone": "formal"}
        resp = await client.post("/api/chat/cover-letter", json=payload)
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert "cover_letter" in data
    assert isinstance(data["sections_used"], list)
    assert data["sections_used"]

@pytest.mark.anyio
async def test_memory_followup_query():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, FastAPI")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = upload_resp.json()["cv_id"]
        sess_resp = await client.post("/api/chat/session", headers={"Authorization": "Bearer test"})
        session_id = sess_resp.json()["session_id"]
        # initial query
        init_payload = {"message": "Am I ready for a data engineer role?", "session_id": session_id, "cv_id": cv_id}
        await client.post("/api/chat/chat", json=init_payload)
        # follow‑up
        follow_payload = {"message": "What about the second point you mentioned?", "session_id": session_id, "cv_id": cv_id}
        resp = await client.post("/api/chat/chat", json=follow_payload)
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert data["sources"]
