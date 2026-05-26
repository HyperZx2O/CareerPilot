import os
import re
import requests
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def clean_html(text: str) -> str:
    """Strip HTML tags from a string to clean up titles and descriptions."""
    if not text:
        return ""
    # Replace common HTML tags with empty string
    clean = re.sub(r'<[^>]+>', '', text)
    return clean.strip()

def search_jobs(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Search for jobs using the Adzuna API with fallback logic (synchronous).
    If the search in Bangladesh (bd) fails or returns no results, it falls back to the UK (gb).
    """
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        raise ValueError("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in environment variables or .env file")

    country = "bd"
    if location and len(location) == 2:
        country = location.lower()
    else:
        country = "gb"

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": results,
        "content-type": "application/json"
    }

    if location and len(location) > 2:
        params["where"] = location

    jobs = []
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        jobs = data.get("results", [])
    except Exception as e:
        if country != "gb":
            print(f"Error querying {country} jobs, falling back to 'gb'. Details: {e}")
            url_fallback = "https://api.adzuna.com/v1/api/jobs/gb/search/1"
            params_fallback = params.copy()
            params_fallback.pop("where", None)
            try:
                response = requests.get(url_fallback, params=params_fallback, timeout=10)
                response.raise_for_status()
                data = response.json()
                jobs = data.get("results", [])
            except Exception as fe:
                raise RuntimeError(f"Adzuna API call failed: {fe}") from fe
        else:
            raise RuntimeError(f"Adzuna API call failed: {e}") from e

    if not jobs and country != "gb":
        print(f"No results found for country '{country}', falling back to 'gb'...")
        url_fallback = "https://api.adzuna.com/v1/api/jobs/gb/search/1"
        params_fallback = params.copy()
        params_fallback.pop("where", None)
        try:
            response = requests.get(url_fallback, params=params_fallback, timeout=10)
            response.raise_for_status()
            data = response.json()
            jobs = data.get("results", [])
        except Exception as fe:
            raise RuntimeError(f"Adzuna API fallback call failed: {fe}") from fe

    return jobs

async def search_jobs_async(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Search for jobs using the Adzuna API with fallback logic (asynchronous).
    Has a 30-second timeout on requests as required by Phase 4.
    """
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        raise ValueError("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in environment variables or .env file")

    country = "bd"
    if location and len(location) == 2:
        country = location.lower()
    else:
        country = "gb"

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": results,
        "content-type": "application/json"
    }

    if location and len(location) > 2:
        params["where"] = location

    jobs = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            jobs = data.get("results", [])
        except Exception as e:
            if country != "gb":
                print(f"Error querying {country} jobs, falling back to 'gb'. Details: {e}")
                url_fallback = "https://api.adzuna.com/v1/api/jobs/gb/search/1"
                params_fallback = params.copy()
                params_fallback.pop("where", None)
                try:
                    response = await client.get(url_fallback, params=params_fallback)
                    response.raise_for_status()
                    data = response.json()
                    jobs = data.get("results", [])
                except Exception as fe:
                    raise RuntimeError(f"Adzuna API call failed: {fe}") from fe
            else:
                raise RuntimeError(f"Adzuna API call failed: {e}") from e

        if not jobs and country != "gb":
            print(f"No results found for country '{country}', falling back to 'gb'...")
            url_fallback = "https://api.adzuna.com/v1/api/jobs/gb/search/1"
            params_fallback = params.copy()
            params_fallback.pop("where", None)
            try:
                response = await client.get(url_fallback, params=params_fallback)
                response.raise_for_status()
                data = response.json()
                jobs = data.get("results", [])
            except Exception as fe:
                raise RuntimeError(f"Adzuna API fallback call failed: {fe}") from fe

    return jobs

def parse_job(raw: dict) -> dict:
    """
    Transforms one raw Adzuna result into the canonical job card schema.
    """
    raw_id = raw.get("id")
    job_id = str(raw_id) if raw_id is not None else ""

    company = raw.get("company", {}).get("display_name", "Unknown")
    location = raw.get("location", {}).get("display_name", "Remote")

    title = clean_html(raw.get("title", ""))
    description = clean_html(raw.get("description", ""))

    return {
        "id": job_id,
        "title": title,
        "company": company,
        "location": location,
        "salary_min": raw.get("salary_min"),
        "salary_max": raw.get("salary_max"),
        "deadline": raw.get("created"),
        "description": description,
        "url": raw.get("redirect_url", ""),
    }

def get_structured_jobs(query: str, location: str = "bd") -> list[dict]:
    """
    Calls search_jobs, maps each raw result through parse_job, and returns the list (synchronous).
    """
    raw_jobs = search_jobs(query, location)
    return [parse_job(job) for job in raw_jobs]

async def get_structured_jobs_async(query: str, location: str = "bd") -> list[dict]:
    """
    Calls search_jobs_async, maps each raw result through parse_job, and returns the list (asynchronous).
    """
    raw_jobs = await search_jobs_async(query, location)
    return [parse_job(job) for job in raw_jobs]

if __name__ == "__main__":
    import json
    import asyncio
    print("Testing Adzuna Job Hunter Agent...")
    try:
        results = get_structured_jobs("machine learning engineer", "london")
        print(f"Sync Success! Retrieved {len(results)} jobs.")
        
        # Test async search
        async def run_async_test():
            return await get_structured_jobs_async("machine learning engineer", "london")
        
        async_results = asyncio.run(run_async_test())
        print(f"Async Success! Retrieved {len(async_results)} jobs.")
        
        for i, job in enumerate(async_results[:3]):
            print(f"\n--- Job Card {i+1} ---")
            print(json.dumps(job, indent=2))
    except Exception as e:
        print(f"Error during job search: {e}")
