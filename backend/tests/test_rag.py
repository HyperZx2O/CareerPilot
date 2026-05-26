import os
import tempfile
import pytest
import httpx
import fitz

from backend.main import app
from backend.services.rag import retrieve_cv_context, build_cv_context_string

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
async def test_retrieve_cv_context_known():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, SQL")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
        cv_id = resp.json()["cv_id"]
    os.remove(pdf_path)
    results = retrieve_cv_context("Worked", cv_id)
    assert isinstance(results, list)
    assert len(results) > 0
    sections = [r["section"] for r in results]
    assert any(s.upper() == "EXPERIENCE" for s in sections)

def test_retrieve_cv_context_unknown():
    results = retrieve_cv_context("Anything", "nonexistent-id")
    assert results == []

def test_build_cv_context_string():
    chunks = [
        {"section": "EXPERIENCE", "text": "Worked at X"},
        {"section": "SKILLS", "text": "Python, SQL"},
    ]
    ctx = build_cv_context_string(chunks)
    assert "[EXPERIENCE]" in ctx
    assert "Worked at X" in ctx
    assert "[SKILLS]" in ctx
    assert "Python, SQL" in ctx
