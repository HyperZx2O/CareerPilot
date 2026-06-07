import sys
from pathlib import Path

# Add root folder to sys.path
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))

from fastapi import APIRouter, status
from pydantic import BaseModel
from backend.db.supabase_client import get_supabase_client
from backend.models.schemas import TodoResponse
from backend.services.roadmap import generate_roadmap
from backend.logger import get_logger

logger = get_logger("roadmap")

router = APIRouter(prefix="/api/roadmap", tags=["Roadmap"])


class RoadmapRequest(BaseModel):
    user_id: str
    cv_id: str | None = None
    goal_id: str | None = None
    target_role: str


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_roadmap_endpoint(payload: RoadmapRequest):
    """
    Generates a week-by-week learning roadmap from CV skills and creates
    todo items linked to the specified goal (or unlinked if no goal_id).
    """
    supabase = get_supabase_client()

    # Fetch skills from cv_chunks
    skills_chunks = []
    if payload.cv_id:
        chunks_result = (
            supabase.table("cv_chunks")
            .select("chunk_text")
            .eq("cv_id", payload.cv_id)
            .eq("section_type", "skills")
            .execute()
        )
        skills_chunks = [c.get("chunk_text", "") for c in chunks_result.data]

    skills_text = " ".join(skills_chunks)

    # If no skills found, use demo skills for development
    if not skills_text:
        skills_text = "JavaScript, React, TypeScript, Node.js, Python, SQL, Git, REST APIs, CSS, HTML"

    # Generate roadmap via LLM
    try:
        todos_text = generate_roadmap(payload.target_role, skills_text)
    except Exception as e:
        logger.warning("generation failed: %s", e)
        todos_text = []

    # Create todo rows in Supabase
    inserted = []
    for i, step in enumerate(todos_text):
        # Due date: week i+1 from today
        due_date = None
        try:
            from datetime import date, timedelta
            due_date = (date.today() + timedelta(weeks=i + 1)).isoformat()
        except Exception:
            pass

        todo_payload = {
            "user_id": payload.user_id,
            "title": step["title"],
            "goal_id": payload.goal_id,
            "due_date": due_date,
        }
        result = supabase.table("todos").insert(todo_payload).execute()
        if result.data:
            inserted.append(TodoResponse(**result.data[0]))

    # Log activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": payload.user_id,
            "action": "roadmap_generated",
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical

    return {
        "message": f"Generated {len(inserted)} roadmap steps",
        "todos": inserted,
        "steps": todos_text,
    }