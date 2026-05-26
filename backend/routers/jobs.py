"""
Jobs router — live job search via JSearch API + fit scoring.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.middleware.auth import get_current_user
from backend.services.fit_score import compute_fit_score

router = APIRouter()


class FitRequest(BaseModel):
    job_description: str = Field(..., max_length=5000)
    cv_id: str


def _search_jsearch(q: str, location: str, page: int, per_page: int) -> dict:
    """Query JSearch (RapidAPI). Returns empty list when key not set."""
    api_key = os.getenv("JSEARCH_API_KEY", "")
    if not api_key:
        return {"jobs": [], "total": 0}
    try:
        import httpx
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }
        params = {
            "query": f"{q} in {location}" if location else q,
            "page": str(page),
            "num_pages": "1",
        }
        resp = httpx.get(
            "https://jsearch.p.rapidapi.com/search",
            headers=headers, params=params, timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        now = datetime.now(timezone.utc).isoformat()
        jobs = []
        for item in (data.get("data") or [])[:per_page]:
            jobs.append({
                "id": item.get("job_id", ""),
                "title": item.get("job_title", ""),
                "company": item.get("employer_name", ""),
                "location": item.get("job_city") or item.get("job_country", ""),
                "salary_min": item.get("job_min_salary"),
                "salary_max": item.get("job_max_salary"),
                "currency": item.get("job_salary_currency"),
                "deadline": item.get("job_offer_expiration_datetime_utc"),
                "description": (item.get("job_description") or "")[:500],
                "url": item.get("job_apply_link", ""),
                "source": "jsearch",
                "fit_score": None,
                "fit_reasons": [],
                "gap_reasons": [],
                "fetched_at": now,
            })
        return {"jobs": jobs, "total": data.get("total_count", len(jobs))}
    except Exception:
        return {"jobs": [], "total": 0}


@router.get("/search")
async def search_jobs(
    q: str = Query(...),
    location: str = Query(default=""),
    cv_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50),
    user: dict = Depends(get_current_user),
):
    """Search live job listings; optionally score against cv_id."""
    result = _search_jsearch(q, location, page, per_page)
    jobs = result["jobs"]

    if cv_id and jobs:
        for job in jobs:
            try:
                sd = compute_fit_score(cv_id=cv_id, job_description=job.get("description", ""))
                job["fit_score"] = sd.get("fit_score")
                job["fit_reasons"] = sd.get("fit_reasons", [])
                job["gap_reasons"] = sd.get("gap_reasons", [])
            except Exception:
                pass
        jobs.sort(key=lambda j: j.get("fit_score") or -1, reverse=True)

    return {"jobs": jobs, "total": result["total"], "page": page, "per_page": per_page}


@router.post("/fit")
async def job_fit(
    req: FitRequest,
    user: dict = Depends(get_current_user),
):
    """Score a pasted job description against the user's CV."""
    try:
        return compute_fit_score(cv_id=req.cv_id, job_description=req.job_description)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
