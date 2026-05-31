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

def get_mock_jobs_list(query: str) -> list[dict]:
    """Generates highly realistic and relevant mock jobs based on search keywords."""
    q = query.lower()
    if any(k in q for k in ["react", "front", "ui", "web", "design", "next"]):
        return [
            {
                "id": "mock-react-001",
                "title": "Senior React / Next.js Developer",
                "company": {"display_name": "Vercel"},
                "location": {"display_name": "San Francisco, CA (Remote)"},
                "salary_min": 130000,
                "salary_max": 170000,
                "created": "2026-05-25T12:00:00Z",
                "description": "We are seeking a Senior React Developer to join our frontend architecture team. Experience building glassmorphic/neomorphic UI shells, custom state managers (Zustand/Redux), and Next.js is essential.",
                "redirect_url": "https://vercel.com/careers"
            },
            {
                "id": "mock-react-002",
                "title": "Frontend Platform Engineer",
                "company": {"display_name": "Supabase"},
                "location": {"display_name": "Singapore (Remote)"},
                "salary_min": 115000,
                "salary_max": 155000,
                "created": "2026-05-26T10:00:00Z",
                "description": "Join us to shape the UI/UX experience of open-source developers. You will design, build, and support the web dashboard interfaces using React 18+, TanStack Query, and TailwindCSS.",
                "redirect_url": "https://supabase.com/careers"
            },
            {
                "id": "mock-react-003",
                "title": "Senior Product & UI Engineer",
                "company": {"display_name": "Linear"},
                "location": {"display_name": "Berlin, DE (Hybrid)"},
                "salary_min": 125000,
                "salary_max": 160000,
                "created": "2026-05-27T08:00:00Z",
                "description": "Build high-performance, micro-interactive, beautifully animated React user interfaces. Deep knowledge of web optimization, layouts, and custom design tokens required.",
                "redirect_url": "https://linear.app/careers"
            }
        ]
    elif any(k in q for k in ["python", "back", "fastapi", "django", "api", "backend", "ml", "ai"]):
        return [
            {
                "id": "mock-python-001",
                "title": "FastAPI Backend Architect",
                "company": {"display_name": "Railway"},
                "location": {"display_name": "New York, NY (Remote)"},
                "salary_min": 140000,
                "salary_max": 185000,
                "created": "2026-05-25T11:00:00Z",
                "description": "Build high-speed, concurrent Python microservices using FastAPI, SQLAlchemy, and Celery. You will design PostgreSQL relational schemas and orchestrate Docker deployment templates.",
                "redirect_url": "https://railway.app/careers"
            },
            {
                "id": "mock-python-002",
                "title": "AI & Vector Search Engineer",
                "company": {"display_name": "Pinecone"},
                "location": {"display_name": "San Francisco, CA"},
                "salary_min": 160000,
                "salary_max": 215000,
                "created": "2026-05-26T09:00:00Z",
                "description": "Orchestrate RAG vector indices and semantic cosine similarity scoring logic. Integrate large language models (OpenAI/Gemini) to perform automated text-parsing pipelines.",
                "redirect_url": "https://pinecone.io/careers"
            },
            {
                "id": "mock-python-003",
                "title": "Backend Python Developer",
                "company": {"display_name": "GitHub"},
                "location": {"display_name": "Remote (Worldwide)"},
                "salary_min": 130000,
                "salary_max": 170000,
                "created": "2026-05-27T06:00:00Z",
                "description": "Scale background worker tasks, automate API routers, and handle secure user authentication (OAuth/JWT) in our core platform services.",
                "redirect_url": "https://github.com/careers"
            }
        ]
    else:
        return [
            {
                "id": "mock-gen-001",
                "title": "Full Stack Software Engineer",
                "company": {"display_name": "Stripe"},
                "location": {"display_name": "San Francisco, CA"},
                "salary_min": 145000,
                "salary_max": 195000,
                "created": "2026-05-25T10:00:00Z",
                "description": "Design secure, robust, and highly reliable payment APIs. Work with React on the frontend and Python/FastAPI/Ruby on the backend logic.",
                "redirect_url": "https://stripe.com/careers"
            },
            {
                "id": "mock-gen-002",
                "title": "AI Application Developer",
                "company": {"display_name": "OpenAI"},
                "location": {"display_name": "San Francisco, CA (Hybrid)"},
                "salary_min": 180000,
                "salary_max": 260000,
                "created": "2026-05-26T08:00:00Z",
                "description": "Build next-generation interactive AI assistants. Implement low-latency streaming endpoints, custom LLM agents, and semantic retrieval systems.",
                "redirect_url": "https://openai.com/careers"
            }
        ]

# ── JSearch API (openwebninja - Supports Bangladesh) ─────────────────────────
JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")

def search_jsearch(query: str, location: str = "Bangladesh", results: int = 10) -> list[dict]:
    """
    Search for jobs using JSearch API (openwebninja).
    Supports Bangladesh and worldwide job search.
    Sign up at: https://www.openwebninja.com/api/jsearch
    """
    if not JSEARCH_API_KEY or "your_" in JSEARCH_API_KEY:
        print("[JSEARCH] API key not configured")
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
        
        print(f"[JSEARCH] Requesting: {query} in {location}")
        response = requests.get(url, headers=headers, params=params, timeout=15)
        print(f"[JSEARCH] Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"[JSEARCH] API error: {response.text[:200]}")
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
        print(f"[JSEARCH] API call failed: {e}")
        return []

# ── Adzuna API (Limited countries) ────────────────────────────────────────────
def search_adzuna(query: str, country: str = "gb", results: int = 10) -> list[dict]:
    """Search using Adzuna API. Only supports: gb, us, au, ca, de, fr, it, nl, nz, sg, za"""
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key or "your_" in app_id or "your_" in app_key:
        print("[ADZUNA] API keys not configured")
        return []

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": results,
        "content-type": "application/json"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as e:
        print(f"[ADZUNA] API call failed: {e}")
        return []

def get_bangladesh_jobs(query: str, results: int = 10) -> list[dict]:
    """
    Get jobs specifically for Bangladesh using available APIs.
    Priority: JSearch (openwebninja, supports BD) > Adzuna Singapore > Mock data
    """
    # First try JSearch (openwebninja - supports Bangladesh)
    if JSEARCH_API_KEY and "your_" not in JSEARCH_API_KEY:
        jobs = search_jsearch(query, "Bangladesh", results)
        if jobs:
            print(f"[JOB SEARCH] Found {len(jobs)} jobs via JSearch (Bangladesh)")
            return jobs
    
    # Try JSearch without Bangladesh specifically
    if JSEARCH_API_KEY and "your_" not in JSEARCH_API_KEY:
        jobs = search_jsearch(query, "Dhaka Bangladesh", results)
        if jobs:
            print(f"[JOB SEARCH] Found {len(jobs)} jobs via JSearch (Dhaka)")
            return jobs
    
    # Try Adzuna with sg (Singapore) - common proxy for Asia tech jobs
    jobs = search_adzuna(query, "sg", results)
    if jobs:
        print(f"[JOB SEARCH] Found {len(jobs)} jobs via Adzuna (Singapore proxy)")
        return jobs
    
    # Fallback to mock data
    print("[JOB SEARCH] Using mock job data")
    return get_mock_jobs_list(query)

def search_jobs(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Search for jobs using the best available API for the location.
    For Bangladesh (bd), uses JSearch or falls back to Adzuna/mock data.
    """
    # Handle Bangladesh specially
    if location.lower() in ["bd", "bangladesh", "dhaka"]:
        return get_bangladesh_jobs(query, results)
    
    # For other countries, try Adzuna
    country = location.lower()[:2] if len(location) >= 2 else "gb"
    
    # Supported Adzuna countries
    supported = ["gb", "us", "au", "ca", "de", "fr", "it", "nl", "nz", "sg"]
    if country not in supported:
        country = "gb"
    
    jobs = search_adzuna(query, country, results)
    if not jobs:
        return get_mock_jobs_list(query)
    
    return jobs

async def search_jobs_async(query: str, location: str = "bd", results: int = 10) -> list[dict]:
    """
    Async search for jobs using the best available API for the location.
    """
    # For Bangladesh, use the sync version (JSearch)
    if location.lower() in ["bd", "bangladesh", "dhaka"]:
        return get_bangladesh_jobs(query, results)
    
    # For other countries, use async Adzuna
    country = location.lower()[:2] if len(location) >= 2 else "gb"
    supported = ["gb", "us", "au", "ca", "de", "fr", "it", "nl", "nz", "sg"]
    if country not in supported:
        country = "gb"
    
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key or "your_" in app_id or "your_" in app_key:
        return get_mock_jobs_list(query)

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": results,
        "content-type": "application/json"
    }

    jobs = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            jobs = data.get("results", [])
        except Exception as e:
            print(f"[JOB HUNTER WARNING] Adzuna async API failed: {e}")

    if not jobs:
        return get_mock_jobs_list(query)

    return jobs

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

    return {
        "id": job_id,
        "title": title,
        "company": company_name,
        "location": location_name,
        "salary_min": raw.get("salary_min"),
        "salary_max": raw.get("salary_max"),
        "deadline": raw.get("created", raw.get("updated", "")),
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
    import asyncio
    print("Testing Job Hunter Agent...")
    
    # Test Bangladesh jobs
    print("\n=== Testing Bangladesh Jobs ===")
    bd_jobs = get_structured_jobs("software developer", "bd")
    print(f"Bangladesh: Retrieved {len(bd_jobs)} jobs")
    
    # Test mock fallback
    print("\n=== Testing Mock Jobs ===")
    mock_jobs = get_mock_jobs_list("react developer")
    print(f"Mock: Retrieved {len(mock_jobs)} jobs")
    
    for i, job in enumerate(bd_jobs[:3]):
        print(f"\n--- Job Card {i+1} ---")
        print(json.dumps(job, indent=2))
