import re
import os
import uuid
import tempfile
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.db.supabase_client import get_supabase_client
from backend.auth import get_current_user
from backend.logger import get_logger

logger = get_logger("cv")

router = APIRouter()


def _resolve_db_user_id(supabase, auth_user_id: str) -> str | None:
    """Convert an auth user id (clerk_id) to the internal `users.id` UUID."""
    try:
        row = supabase.table("users").select("id").eq("clerk_id", auth_user_id).limit(1).execute()
        if row.data:
            return row.data[0]["id"]
        supabase.table("users").insert({"clerk_id": auth_user_id}).execute()
        row = supabase.table("users").select("id").eq("clerk_id", auth_user_id).limit(1).execute()
        return row.data[0]["id"] if row.data else None
    except Exception as e:
        logger.warning("Failed to resolve/create DB user: %s", e)
        return None


@router.get("/api/cv/sections/{cv_id}")
async def get_cv_sections(cv_id: str, user=Depends(get_current_user)):
    """Fetch parsed CV sections for display."""
    supabase = get_supabase_client()
    user_id = str(user.id) if user.id else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cv_result = supabase.table("cvs").select("*").eq("id", cv_id).execute()
    if not cv_result.data:
        raise HTTPException(status_code=404, detail="CV not found")
    cv = cv_result.data[0]

    db_user_id = _resolve_db_user_id(supabase, user_id)
    if db_user_id and cv.get("user_id") != db_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot access another user's CV")

    chunks_result = supabase.table("cv_chunks").select("*").eq("cv_id", cv_id).execute()
    return {
        "cv_id": cv["id"],
        "file_name": cv["filename"],
        "processing_status": cv["processing_status"],
        "sections": [
            {"section": chunk["section_type"], "content": chunk["chunk_text"]}
            for chunk in chunks_result.data
        ]
    }


@router.post("/api/cv/upload")
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    supabase = get_supabase_client()
    user_id = str(user.id) if user.id else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.info("Upload request received for file: %s", file.filename)

    # Verify file extension and sanitize filename
    file_ext = os.path.splitext(file.filename)[-1].lower() if file.filename else ""

    # Secure filename: strip path and allow only safe characters
    safe_name = os.path.basename(file.filename) if file.filename else "upload"
    safe_name = re.sub(r'[^A-Za-z0-9._-]', '_', safe_name)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if file_ext not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and DOCX files are allowed.")

    # Read content for magic-byte validation
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Magic-byte verification
    if file_ext == ".pdf" and content[:5] != b"%PDF-":
        raise HTTPException(status_code=400, detail="File extension mismatch: not a valid PDF.")
    if file_ext == ".docx" and content[:2] not in (b"PK",):
        raise HTTPException(status_code=400, detail="File extension mismatch: not a valid DOCX.")

    # Save file to temp dir using safe name
    tmp_path = os.path.join(tempfile.gettempdir(), f"careerpilot_{uuid.uuid4()}_{safe_name}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(content)
        logger.info("File saved to %s", tmp_path)
    except Exception as e:
        logger.error("Failed to save file: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save file.")

    # Upsert user record in users table
    user_result = supabase.table("users").select("*").eq("clerk_id", user_id).execute()
    if not user_result.data:
        supabase.table("users").insert({"clerk_id": user_id}).execute()
        db_user_id = supabase.table("users").select("*").eq("clerk_id", user_id).execute().data[0]["id"]
    else:
        db_user_id = user_result.data[0]["id"]

    # Create CV record — schema fields: filename, original_content, processing_status, sections, metadata
    cv_id = str(uuid.uuid4())
    cv_data = {
        "id": cv_id,
        "user_id": db_user_id,
        "filename": safe_name,
        "original_content": "",
        "processing_status": "pending",
        "sections": {},
        "metadata": {
            "file_size": len(content),
            "content_type": file.content_type,
            "uploaded_at": str(datetime.utcnow().isoformat())
        }
    }
    try:
        result = supabase.table("cvs").insert(cv_data).execute()
        cv = result.data[0]
        logger.info("Created CV record: %s", cv["id"])
    except Exception as e:
        logger.error("Failed to create CV record: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create CV record.")

    # Kick off background processing
    try:
        from backend.workers.cv_worker import parse_and_index_cv
        background_tasks.add_task(parse_and_index_cv, cv["id"], tmp_path)
        logger.info("Background processing task queued for CV %s", cv["id"])
    except Exception as e:
        logger.error("Failed to queue background task: %s", e)

    return {"cv_id": cv["id"], "status": "queued"}


@router.delete("/api/cv/{cv_id}")
async def delete_cv(
    cv_id: str,
    user=Depends(get_current_user),
):
    """Delete a CV and its associated chunks. Only the owner can delete."""
    supabase = get_supabase_client()
    user_id = str(user.id) if user.id else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cv_result = supabase.table("cvs").select("*").eq("id", cv_id).execute()
    if not cv_result.data:
        raise HTTPException(status_code=404, detail="CV not found")
    cv = cv_result.data[0]

    db_user_id = _resolve_db_user_id(supabase, user_id)
    if db_user_id and cv.get("user_id") != db_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot delete another user's CV")

    supabase.table("cv_chunks").delete().eq("cv_id", cv_id).execute()
    supabase.table("cvs").delete().eq("id", cv_id).execute()
    logger.info("Deleted CV %s for user %s", cv_id, user_id)
    return {"deleted": True}
