import os
import uuid
import tempfile
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.db.supabase_client import get_supabase_client
from backend.auth import get_current_user

router = APIRouter()


@router.get("/api/cv/sections/{cv_id}")
async def get_cv_sections(cv_id: str, supabase=Depends(get_supabase_client), user=Depends(get_current_user)):
    """Fetch parsed CV sections for display."""
    user_id = str(user.id) if user.id else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cv_result = supabase.table("cvs").select("*").eq("id", cv_id).execute()
    if not cv_result.data:
        raise HTTPException(status_code=404, detail="CV not found")
    cv = cv_result.data[0]

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
    supabase=Depends(get_supabase_client),
    user=Depends(get_current_user),
):
    user_id = str(user.id) if user.id else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    print(f"[CV] Upload request received for file: {file.filename}")

    # Verify file extension
    file_ext = os.path.splitext(file.filename)[-1].lower() if file.filename else ""
    if file_ext not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and DOCX files are allowed.")

    # Save file to temp dir
    tmp_path = os.path.join(tempfile.gettempdir(), f"careerpilot_{uuid.uuid4()}_{file.filename}")
    try:
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)
        print(f"[CV] File saved to {tmp_path}")
    except Exception as e:
        print(f"[CV ERROR] Failed to save file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

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
        "filename": file.filename,
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
        print(f"[CV] Created CV record: {cv['id']}")
    except Exception as e:
        print(f"[CV ERROR] Failed to create CV record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create CV record: {str(e)}")

    # Kick off background processing
    try:
        from backend.workers.cv_worker import parse_and_index_cv
        background_tasks.add_task(parse_and_index_cv, cv["id"], tmp_path)
        print(f"[CV] Background processing task queued for CV {cv['id']}")
    except Exception as e:
        print(f"[CV ERROR] Failed to queue background task: {e}")

    return {"cv_id": cv["id"], "status": "queued"}
