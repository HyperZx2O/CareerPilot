import os
import tempfile
import pytest
import httpx
import fitz

from backend.services.embeddings import extract_text_from_pdf, chunk_by_section
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
async def test_extract_text_from_pdf():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, Java")
    text = extract_text_from_pdf(pdf_path)
    os.remove(pdf_path)
    assert "EXPERIENCE" in text
    assert "PYTHON" in text.upper()

@pytest.mark.anyio
async def test_chunk_by_section():
    sample = "EXPERIENCE\nDid something\n\nSKILLS\nPython, Java"
    chunks = chunk_by_section(sample)
    assert "EXPERIENCE" in chunks
    assert "SKILLS" in chunks
    assert "Did something" in chunks["EXPERIENCE"]
    assert "Python" in chunks["SKILLS"]

@pytest.mark.anyio
async def test_cv_upload_and_validation():
    pdf_path = create_sample_pdf("EXPERIENCE\nWorked at X\n\nSKILLS\nPython, SQL")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
    os.remove(pdf_path)
    assert resp.status_code == 200
    data = resp.json()
    assert "cv_id" in data
    assert isinstance(data["cv_id"], str)
    assert "sections_found" in data
    assert len(data["sections_found"]) >= 2

@pytest.mark.anyio
async def test_cv_upload_invalid_file():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("sample.txt", b"plain text", "text/plain")}
        resp = await client.post("/api/cv/upload", files=files, headers={"Authorization": "Bearer test"})
    assert resp.status_code == 400
    data = resp.json()
    assert data["detail"] == "Unsupported file type"
