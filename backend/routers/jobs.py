import sys
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field

_root_path = Path(__file__).resolve().parent.parent.parent
_integrations_path = _root_path / "integrations"
for _p in (str(_root_path), str(_integrations_path)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from job_hunter import get_structured_jobs_async
from backend.db.supabase_client import get_supabase_client
from backend.services.cover_letter import generate_cover_letter
from fit_score import compute_fit_score
from backend.auth import get_current_user, get_supabase_user_client
from backend.logger import get_logger

logger = get_logger("jobs")

router = APIRouter()


class CoverLetterRequest(BaseModel):
    cv_id: str | None = None
    job_title: str | None = Field(None, min_length=1)
    company: str | None = Field(None, min_length=1)
    description: str | None = Field(None, max_length=10000)

async def compute_job_fit_score(cv_id: str, job: dict) -> dict:
    """
    Async helper that wraps the synchronous compute_fit_score in a thread pool.
    Gracefully returns null fit scores on any error (such as missing Pinecone index or invalid credentials).
    """
    job_copy = job.copy()
    try:
        # Run synchronous fit score calculation in a separate thread to keep FastAPI non-blocking
        res = await asyncio.to_thread(compute_fit_score, cv_id, job["description"])
        job_copy["fit_score"] = res.get("score")
        job_copy["fit_reasons"] = res.get("fit_reasons", [])
        job_copy["gap_reasons"] = res.get("gap_reasons", [])
    except Exception as e:
        # Fallback to null scores as required by the specifications
        logger.warning("Error computing fit score for job '%s': %s", job.get("id"), e)
        job_copy["fit_score"] = None
        job_copy["fit_reasons"] = []
        job_copy["gap_reasons"] = []
        
    return job_copy

@router.get("/api/jobs/search")
async def search_jobs_endpoint(
    q: str = Query(..., min_length=1, max_length=200, description="Job search query keywords"),
    location: str = Query("bd", min_length=2, max_length=50, description="Job location (country code, city, or country name)"),
    cv_id: str = Query(None, description="Optional CV UUID to calculate fit score"),
    user = Depends(get_current_user),
):
    """
    Search for jobs and calculate fit scores concurrently using asyncio.gather.
    Returns results sorted by fit_score descending.
    """
    try:
        # Step 1: Fetch jobs asynchronously with 30s timeout configured inside get_structured_jobs_async
        jobs = await get_structured_jobs_async(q, location)
    except Exception as e:
        logger.warning("Job search service failed: %s", e)
        jobs = []

    # Step 2: Compute fit scores concurrently if cv_id is provided
    if cv_id and jobs:
        tasks = [compute_job_fit_score(cv_id, job) for job in jobs]
        scored_jobs = await asyncio.gather(*tasks)
    else:
        # Otherwise, return all jobs with null fit scores
        scored_jobs = []
        for job in jobs:
            job_copy = job.copy()
            job_copy["fit_score"] = None
            job_copy["fit_reasons"] = []
            job_copy["gap_reasons"] = []
            scored_jobs.append(job_copy)

    # Step 3: Sort scored jobs by fit_score descending (jobs with null scores go to the bottom)
    sorted_jobs = sorted(
        scored_jobs,
        key=lambda j: (j.get("fit_score") is not None, j.get("fit_score") or -1),
        reverse=True
    )

    return {"jobs": sorted_jobs}

@router.get("/api/jobs/{job_id}/fit")
async def get_single_job_fit_endpoint(
    job_id: str,
    cv_id: str = Query(..., description="CV UUID to calculate fit score"),
    description: str = Query(None, description="Optional job description text to calculate fit against"),
    user = Depends(get_current_user),
):
    """
    Returns the fit score details for a specific single job.
    Used when a user opens a detailed card view.
    """
    desc = description or "We are seeking a Software Engineer with expertise in Python, FastAPI, and database integrations."
    try:
        res = await asyncio.to_thread(compute_fit_score, cv_id, desc)
        return {
            "fit_score": res.get("score"),
            "fit_reasons": res.get("fit_reasons", []),
            "gap_reasons": res.get("gap_reasons", [])
        }
    except Exception as e:
        logger.warning("Error computing detailed fit score for job '%s': %s", job_id, e)
        return {
            "fit_score": None,
            "fit_reasons": [],
            "gap_reasons": []
        }


@router.post("/api/jobs/{job_id}/cover-letter")
async def generate_cover_letter_endpoint(
    job_id: str,
    body: CoverLetterRequest,
    user = Depends(get_current_user),
):
    """
    Generates an AI cover letter for a saved job application.
    Fetches job details from the applications table and CV skills from cv_chunks.
    """
    supabase = get_supabase_user_client(user.jwt)

    job_title = body.job_title
    company = body.company
    description = body.description

    # Try to fetch from applications table if not provided in request
    if not job_title or not company:
        try:
            app_result = supabase.table("applications").select("*").eq("id", job_id).execute()
            if app_result.data:
                app = app_result.data[0]
                job_title = job_title or app.get("job_title", "")
                company = company or app.get("company", "")
                description = description or app.get("description", "")
        except Exception as e:
            logger.warning("Could not fetch application %s: %s", job_id, e)

    if not job_title or not company:
        raise HTTPException(status_code=400, detail="job_title and company are required")

    # Fetch CV skills
    skills_text = ""
    cv_id = body.cv_id
    if cv_id:
        try:
            chunks_result = (
                supabase.table("cv_chunks")
                .select("chunk_text")
                .eq("cv_id", cv_id)
                .eq("section_type", "skills")
                .execute()
            )
            skills_text = " ".join(c.get("chunk_text", "") for c in chunks_result.data)
        except Exception as e:
            logger.warning("Could not fetch CV skills: %s", e)

    if not skills_text:
        skills_text = "JavaScript, React, TypeScript, Node.js, Python, SQL, Git, REST APIs"

    letter = generate_cover_letter(job_title, company, description or "", skills_text)

    return {"cover_letter": letter}
