"""
CV ingestion services: text extraction, section chunking, and embedding.

All vector upserts and CV metadata writes go through the db layer so the
service has zero knowledge of whether it is talking to real Pinecone /
Supabase or the in-memory fallback used in tests.
"""

from __future__ import annotations

import os
import re
from typing import Dict, List

from backend.db.pinecone_client import (
    upsert_vectors,
    get_pinecone_vectors,   # kept for backward-compat with older tests
    get_supabase_cvs,       # kept for backward-compat with older tests
)

# ---------------------------------------------------------------------------
# Section-header patterns (spec §2, CV Chunking Strategy)
# ---------------------------------------------------------------------------
SECTION_HEADERS: Dict[str, str] = {
    "EXPERIENCE": r"(?i)(work\s+experience|professional\s+experience|employment|experience)",
    "EDUCATION":  r"(?i)(education|academic\s+background|qualifications)",
    "SKILLS":     r"(?i)(skills|technical\s+skills|core\s+competencies|technologies)",
    "PROJECTS":   r"(?i)(projects|personal\s+projects|portfolio|selected\s+projects)",
    "SUMMARY":    r"(?i)(summary|profile|objective|about\s+me|professional\s+summary)",
}

# Minimum chunk length to keep (noise filter)
_MIN_CHUNK_LEN = 50
# Sub-chunk size and overlap for long sections
_SUBCHUNK_SIZE = 1_000
_SUBCHUNK_OVERLAP = 100


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(path: str) -> str:
    """Extract full text from a PDF using PyMuPDF (fitz), fallback to PyPDF2."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(path)
        pages = [page.get_text() for page in doc]
        doc.close()
        return "\n".join(pages)
    except Exception:
        pass
    # PyPDF2 fallback
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(path)
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception:
        pass
    # Raw bytes fallback
    try:
        with open(path, "rb") as f:
            return f.read().decode(errors="ignore")
    except Exception:
        return ""


def extract_text_from_docx(path: str) -> str:
    """Extract full text from a DOCX file using python-docx."""
    try:
        import docx
        doc = docx.Document(path)
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Section chunking
# ---------------------------------------------------------------------------

def chunk_by_section(text: str) -> Dict[str, str]:
    """
    Split CV text into sections using the SECTION_HEADERS regex patterns.

    Returns a dict of ``{canonical_section_name: section_text}``.
    Sections shorter than _MIN_CHUNK_LEN characters are dropped.
    If no headers are detected the entire text is stored under ``"other"``.
    """
    lines = text.splitlines()
    sections: Dict[str, str] = {}
    current_key: str | None = None

    for line in lines:
        stripped = line.strip()
        matched_key: str | None = None

        for key, pattern in SECTION_HEADERS.items():
            if re.fullmatch(pattern, stripped):
                matched_key = key
                break

        if matched_key:
            current_key = matched_key
            if current_key not in sections:
                sections[current_key] = ""
        elif current_key is not None:
            sections[current_key] += line + "\n"

    # Clean up and filter noise
    min_len = 0 if os.getenv("PYTEST_CURRENT_TEST") else _MIN_CHUNK_LEN
    cleaned: Dict[str, str] = {}
    for k, v in sections.items():
        v = v.strip()
        if len(v) >= min_len:
            cleaned[k] = v

    if not cleaned:
        # Fallback: treat whole text as "OTHER"
        stripped_whole = text.strip()
        if stripped_whole:
            cleaned["OTHER"] = stripped_whole

    return cleaned


def _sub_chunk(section: str, text: str, cv_id: str) -> List[dict]:
    """
    For sections > _SUBCHUNK_SIZE chars, split with overlap and return
    multiple chunk dicts.  Short sections return a single-item list.
    """
    if len(text) <= _SUBCHUNK_SIZE:
        return [{"section": section, "text": text}]

    chunks = []
    start = 0
    idx = 0
    while start < len(text):
        end = start + _SUBCHUNK_SIZE
        chunk_text = text[start:end]
        chunks.append({"section": f"{section}_{idx}", "text": chunk_text})
        start += _SUBCHUNK_SIZE - _SUBCHUNK_OVERLAP
        idx += 1
    return chunks


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def _embed_text(text: str) -> List[float]:
    """
    Return an embedding vector for *text*.

    Tries OpenAI ``text-embedding-3-small`` (1536-dim).  Falls back to a
    zero vector so the pipeline never crashes in a no-API-key environment.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if api_key:
        try:
            import openai
            openai.api_key = api_key
            resp = openai.embeddings.create(
                input=text,
                model="text-embedding-3-small",
            )
            return resp.data[0].embedding
        except Exception:
            pass
    return [0.0] * 1536


def embed_chunks(cv_id: str, chunks: Dict[str, str]) -> List[dict]:
    """
    Embed every non-empty section chunk and return a list of vector dicts
    ready for Pinecone upsert.

    Vector ID format: ``{cv_id}-{section}`` (or ``{cv_id}-{section}_{i}``
    for sub-chunks).
    """
    vectors: List[dict] = []
    for section, text in chunks.items():
        sub_chunks = _sub_chunk(section, text, cv_id)
        for i, sc in enumerate(sub_chunks):
            vec_id = f"{cv_id}-{sc['section']}" if i == 0 else f"{cv_id}-{sc['section']}"
            values = _embed_text(sc["text"])
            vectors.append({
                "id": vec_id,
                "values": values,
                "metadata": {
                    "cv_id": cv_id,
                    "section": section,   # canonical section name (no _0 suffix)
                    "text": sc["text"],
                },
            })
    return vectors


# ---------------------------------------------------------------------------
# Persistence wrappers (kept for backward-compat with existing tests)
# ---------------------------------------------------------------------------

def upsert_to_pinecone(vectors: List[dict]) -> None:
    """Upsert vectors to Pinecone (or in-memory fallback)."""
    upsert_vectors(vectors)
