import os
import sys
import asyncio
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException

# Add monorepo root and integrations path to sys.path for seamless imports
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))
sys.path.append(str(root_path / "integrations"))

# Import Phase 2 and Phase 3 functions
from job_hunter import get_structured_jobs_async
from fit_score import compute_fit_score

router = APIRouter()

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
        print(f"Error computing fit score for job '{job.get('id')}': {e}")
        job_copy["fit_score"] = None
        job_copy["fit_reasons"] = []
        job_copy["gap_reasons"] = []
        
    return job_copy

@router.get("/api/jobs/search")
async def search_jobs_endpoint(
    q: str = Query(..., description="Job search query keywords"),
    location: str = Query("bd", description="Job location code (e.g. 'bd' or 'gb')"),
    cv_id: str = Query(None, description="Optional CV UUID to calculate fit score")
):
    """
    Search for jobs and calculate fit scores concurrently using asyncio.gather.
    Returns results sorted by fit_score descending.
    """
    try:
        # Step 1: Fetch jobs asynchronously with 30s timeout configured inside get_structured_jobs_async
        jobs = await get_structured_jobs_async(q, location)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Job search service failed: {str(e)}")

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
    description: str = Query(None, description="Optional job description text to calculate fit against")
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
        print(f"Error computing detailed fit score for job '{job_id}': {e}")
        return {
            "fit_score": None,
            "fit_reasons": [],
            "gap_reasons": []
        }
