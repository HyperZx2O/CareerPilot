import os
import re
import logging
from dotenv import load_dotenv

logger = logging.getLogger("job_hunter")
load_dotenv()

def clean_html(text: str) -> str:
    """Strip HTML tags from a string to clean up titles and descriptions."""
    if not text:
        return ""
    # Replace common HTML tags with empty string
    clean = re.sub(r'<[^>]+>', '', text)
    return clean.strip()

# ── JSearch API (openwebninja - Supports Bangladesh) ─────────────────────────
def search_jsearch(query: str, location: str = "Bangladesh", results: int = 10) -> list[dict]:
    """
    Search for jobs using JSearch API (openwebninja).
    Supports Bangladesh and worldwide job search.
    Sign up at: https://www.openwebninja.com/api/jsearch
    """
    JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")
    if not JSEARCH_API_KEY or "your_" in JSEARCH_API_KEY:
        logger.warning("JSearch API key not configured")
        return []
    
    try:
        # Use openwebninja.com endpoint with GET request
        url = "https://api.openwebninja.com/jsearch/search-v2"
        params = {
            "query": f"{query} in {location}",
 }
        headers = {
            "x-api-key": JSEARCH_API_KEY,
        }
        
        logger.info("JSearch requesting: %s in %s", query, location)
        import requests
        response = requests.get(url, headers=headers, params=params, timeout=30)
        logger.info("JSearch response status: %s", response.status_code)
        
        if response.status_code != 200:
            logger.warning("JSearch API error: %s", response.text[:200])
            return []
            
        data = response.json()
        # Response structure: {"data": {"jobs": [...]}}
        job_list = data.get("data", {}).get("jobs", data.get("data", []))
        
        results_list = []
        for job in job_list[:results]:
            # Use job_apply_link for direct application, fallback to job_google_link
            job_url = job.get("job_apply_link") or job.get("job_google_link") or ""
            results_list.append({
                "id": job.get("job_id", ""),
                "title": clean_html(job.get("job_title", "")),
                "company": {"display_name": clean_html(job.get("employer_name", job.get("employer_company_type", "Unknown")))},
                "location": {"display_name": clean_html(job.get("job_location", "Remote"))},
                "salary_min": job.get("job_min_salary") or job.get("job_estimated_salary"),
                "salary_max": job.get("job_max_salary") or job.get("job_estimated_salary"),
                "created": job.get("job_posted_at_datetime_utc", ""),
                "description": clean_html(job.get("job_description", "")),
                "redirect_url": job_url
            })
        return results_list
    except Exception as e:
        logger.warning("JSearch API call failed: %s", e)
        return []

# ── Adzuna API (Limited countries) ────────────────────────────────────────────
def search_adzuna(query: str, country: str = "gb", results: int = 10) -> list[dict]:
    """Search using Adzuna API. Only supports: gb, us, au, ca, de, fr, it, nl, nz, sg, za"""
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key or "your_" in app_id or "your_" in app_key:
        raise ValueError("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set")

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": results,
        "content-type": "application/json"
    }

    import requests
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    return data.get("results", [])

def get_bangladesh_jobs(query: str, results: int = 10) -> list[dict]:
    """
    Get jobs specifically for Bangladesh using available APIs.
    Priority: JSearch (openwebninja, supports BD) > Adzuna Singapore
    """
    # First try JSearch (openwebninja - supports Bangladesh)
    jobs = search_jsearch(query, "Bangladesh", results)
    if jobs:
        logger.info("Found %s jobs via JSearch (Bangladesh)", len(jobs))
        return jobs

    # Next try Adzuna for Bangladesh (bd)
    try:
        jobs = search_adzuna(query, "bd", results)
        if jobs:
            logger.info("Found %s jobs via Adzuna (bd)", len(jobs))
            return jobs
    except Exception as e:
        logger.warning("Adzuna bd call failed: %s", e)

    # Fallback to Adzuna GB
    try:
        jobs = search_adzuna(query, "gb", results)
        if jobs:
            logger.info("Found %s jobs via Adzuna (gb)", len(jobs))
            return jobs
    except Exception as e:
        logger.warning("Adzuna gb call failed: %s", e)

    # If nothing found, raise to let caller decide (tests expect RuntimeError in some cases)
    raise RuntimeError("Adzuna API call failed or returned no results")

def search_jobs(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Search for jobs using the best available API for the location.
    For Bangladesh (bd), uses JSearch or falls back to Adzuna.
    """
    # Validate ADZUNA credentials early (tests expect ValueError when missing)
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        raise ValueError("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set")

    # Handle Bangladesh specially
    if location.lower() in ["bd", "bangladesh", "dhaka"]:
        return get_bangladesh_jobs(query, results)
    
    # For other countries, try Adzuna
    country = location.lower()[:2] if len(location) >= 2 else "gb"
    
    # Supported Adzuna countries
    supported = ["gb", "us", "au", "ca", "de", "fr", "it", "nl", "nz", "sg"]
    if country not in supported:
        country = "gb"
    
    # For other countries, require ADZUNA env vars and propagate errors
    try:
        jobs = search_adzuna(query, country, results)
        return jobs
    except ValueError:
        # Missing env vars
        raise
    except Exception as e:
        raise RuntimeError(f"Adzuna API call failed: {e}")

async def search_jobs_async(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Async search for jobs using the best available API for the location.
    """
    # Try JSearch (openwebninja) first if location is Bangladesh and API key is set
    if location.lower() in ["bd", "bangladesh", "dhaka"]:
        jsearch_key = os.getenv("JSEARCH_API_KEY", "")
        if jsearch_key and "your_" not in jsearch_key:
            try:
                import asyncio
                jobs = await asyncio.to_thread(search_jsearch, query, "Bangladesh", results)
                if jobs:
                    logger.info("Async found %s jobs via JSearch (Bangladesh)", len(jobs))
                    return jobs
            except Exception as e:
                logger.warning("Async JSearch call failed: %s", e)

    # For other countries, or if JSearch failed / was not used, fall back to Adzuna flow
    country = location.lower()[:2] if len(location) >= 2 else "gb"
    supported = ["gb", "us", "au", "ca", "de", "fr", "it", "nl", "nz", "sg", "bd"]
    if country not in supported:
        country = "gb"

    import httpx

    async def call_adzuna(cn: str):
        app_id = os.getenv("ADZUNA_APP_ID")
        app_key = os.getenv("ADZUNA_APP_KEY")
        if not app_id or not app_key or "your_" in app_id or "your_" in app_key:
            raise ValueError("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set")
        url = f"https://api.adzuna.com/v1/api/jobs/{cn}/search/1"
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "what": query,
            "results_per_page": results,
            "content-type": "application/json"
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json().get("results", [])

    # If bd, try bd then gb fallback when bd returns empty or fails
    if location.lower() in ["bd", "bangladesh", "dhaka"]:
        try:
            results_bd = await call_adzuna("bd")
            if results_bd:
                return results_bd
        except Exception as e:
            logger.warning("Async Adzuna bd call failed: %s", e)

        # fallback to gb
        try:
            return await call_adzuna("gb")
        except Exception as e:
            logger.warning("Async Adzuna gb fallback call failed: %s", e)
            return []

    # Otherwise try requested country
    try:
        return await call_adzuna(country)
    except Exception as e:
        logger.warning("Async Adzuna API call failed: %s", e)
        return []

def parse_job(raw: dict) -> dict:
    """
    Transforms one raw job result into the canonical job card schema.
    """
    raw_id = raw.get("id")
    job_id = str(raw_id) if raw_id is not None else ""

    company = raw.get("company", {})
    company_name = company.get("display_name", company.get("name", "Unknown")) if isinstance(company, dict) else company or "Unknown"
    
    location = raw.get("location", {})
    location_name = location.get("display_name", location.get("name", "Remote")) if isinstance(location, dict) else location or "Remote"

    title = clean_html(raw.get("title", ""))
    description = clean_html(raw.get("description", raw.get("snippet", "")))

    # Normalize deadline to None when missing
    deadline = raw.get("created") or raw.get("updated") or None

    return {
        "id": job_id,
        "title": title,
        "company": company_name,
        "location": location_name,
        "salary_min": raw.get("salary_min"),
        "salary_max": raw.get("salary_max"),
        "deadline": deadline,
        "description": description,
        "url": raw.get("redirect_url", raw.get("link", "")),
    }

def get_structured_jobs(query: str, location: str = "bd") -> list[dict]:
    """
    Calls search_jobs, maps each raw result through parse_job, and returns the list.
    """
    raw_jobs = search_jobs(query, location)
    return [parse_job(job) for job in raw_jobs]

async def get_structured_jobs_async(query: str, location: str = "bd") -> list[dict]:
    """
    Calls search_jobs_async, maps each raw result through parse_job, and returns the list.
    """
    raw_jobs = await search_jobs_async(query, location)
    return [parse_job(job) for job in raw_jobs]

if __name__ == "__main__":
    import json
    print("Testing Job Hunter Agent...")
    
    # Test Bangladesh jobs
    print("\n=== Testing Bangladesh Jobs ===")
    bd_jobs = get_structured_jobs("software developer", "bd")
    print(f"Bangladesh: Retrieved {len(bd_jobs)} jobs")
    
    for i, job in enumerate(bd_jobs[:3]):
        print(f"\n--- Job Card {i+1} ---")
        print(json.dumps(job, indent=2))
