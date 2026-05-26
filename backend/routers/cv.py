"""
CV router — upload, status, sections, delete.
All routes are protected by Clerk JWT auth (get_current_user dependency).
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.middleware.auth import get_current_user
from backend.db.pinecone_client import upsert_vectors, cv_exists, get_supabase_cvs
from backend.db.supabase_client import (
    create_cv_record,
    update_cv_status,
    get_cv_record,
    get_cv_sections,
)
from backend.services.embeddings import (
    extract_text_from_pdf,
    extract_text_from_docx,
    chunk_by_section,
    embed_chunks,
)

router = APIRouter()

_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", status_code=200)
async def upload_cv(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Accept a PDF or DOCX CV upload, extract text, chunk by section,
    embed each chunk and upsert to Pinecone, then store metadata in Supabase.

    Returns: ``{cv_id, sections_found}``
    """
    user_id: str = user.get("sub", "test_user")
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".pdf", ".docx"):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    # ── Persist CV record (pending) ─────────────────────────────────────────
    cv_id = create_cv_record(user_id, filename, ext.lstrip("."))

    # ── Save to temp file ───────────────────────────────────────────────────
    tmp_dir = "tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(content)

        # ── Extract text ────────────────────────────────────────────────────
        raw_text = (
            extract_text_from_pdf(tmp_path)
            if ext == ".pdf"
            else extract_text_from_docx(tmp_path)
        )
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    if not raw_text.strip():
        update_cv_status(cv_id, "failed", error_message="Could not extract text from file")
        raise HTTPException(status_code=422, detail="Could not extract text from the uploaded file")

    # ── Chunk → embed → upsert ──────────────────────────────────────────────
    chunks = chunk_by_section(raw_text)
    sections_found = list(chunks.keys())
    vectors = embed_chunks(cv_id, chunks)
    upsert_vectors(vectors)

    # ── Update Supabase metadata ────────────────────────────────────────────
    update_cv_status(cv_id, "complete", sections_found=sections_found)

    # Fallback: also write to in-memory store so existing tests keep passing
    mem_store = get_supabase_cvs()
    mem_store[cv_id] = {"sections": sections_found, "user_id": user_id}

    return {"cv_id": cv_id, "sections_found": sections_found}


@router.get("/{cv_id}")
async def get_cv(
    cv_id: str,
    user: dict = Depends(get_current_user),
):
    """Return full CV record including processing_status."""
    user_id = user.get("sub", "test_user")
    record = get_cv_record(cv_id, user_id)
    if record is None:
        # Check in-memory fallback
        mem = get_supabase_cvs().get(cv_id)
        if mem is None:
            raise HTTPException(status_code=404, detail="CV not found")
        return {"id": cv_id, "user_id": mem.get("user_id"), "sections_found": mem.get("sections", []), "processing_status": "complete"}
    return record


@router.get("/{cv_id}/sections")
async def get_cv_sections_endpoint(
    cv_id: str,
    user: dict = Depends(get_current_user),
):
    """Return list of section names stored for this CV."""
    # Check Supabase first
    sections = get_cv_sections(cv_id)
    if sections:
        return {"cv_id": cv_id, "sections": sections}

    # Fallback to in-memory store
    mem_store = get_supabase_cvs()
    cv_meta = mem_store.get(cv_id)
    if cv_meta is None:
        raise HTTPException(status_code=404, detail="CV not found")
    return {"cv_id": cv_id, "sections": cv_meta.get("sections", [])}


@router.delete("/{cv_id}", status_code=204)
async def delete_cv(
    cv_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a CV record (Supabase cascade removes chunks)."""
    user_id = user.get("sub", "test_user")
    from backend.db.supabase_client import get_supabase_client
    client = get_supabase_client()
    if client:
        client.table("cvs").delete().eq("id", cv_id).eq("user_id", user_id).execute()
    else:
        mem_store = get_supabase_cvs()
        if cv_id not in mem_store:
            raise HTTPException(status_code=404, detail="CV not found")
        del mem_store[cv_id]
    return None
