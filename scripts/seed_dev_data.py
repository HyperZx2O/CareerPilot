"""Seed dev user and CV in Supabase via REST API (service key)."""
import os, sys, json
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from dotenv import load_dotenv
load_dotenv(_root / ".env")
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

DEV_USER_ID = "2c9fb7be-d653-45e5-ad96-b0045493f0b2"
DEV_CLERK_ID = "demo_user_123"

if __name__ == "__main__":
    # 1. Upsert dev user
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/users",
        headers=H,
        params={"clerk_id": f"eq.{DEV_CLERK_ID}", "select": "id"},
    )
    if r.status_code == 200 and r.json():
        uid = r.json()[0]["id"]
        print(f"Dev user exists: {uid}")
    else:
        r = httpx.post(
            f"{SUPABASE_URL}/rest/v1/users",
            headers=H,
            json={"id": DEV_USER_ID, "clerk_id": DEV_CLERK_ID, "email": "demo@careerpilot.ai"},
        )
        if r.status_code == 201:
            print(f"Created dev user: {DEV_USER_ID}")
        else:
            print(f"Failed to create user: {r.status_code} {r.text[:200]}")
            uid = None
    uid = uid or DEV_USER_ID

    # 2. Check if a CV already exists
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/cvs",
        headers=H,
        params={"user_id": f"eq.{uid}", "select": "id,filename"},
    )
    cvs = r.json() if r.status_code == 200 else []
    if cvs:
        cv_id = cvs[0]["id"]
        print(f"CV exists: {cv_id} ({cvs[0].get('filename')})")
    else:
        # Create a sample CV
        cv_payload = {
            "user_id": uid,
            "filename": "demo_cv.pdf",
            "original_content": "Experienced software engineer with skills in Python, JavaScript, React, Node.js, TypeScript, SQL, and cloud services.",
            "processing_status": "completed",
            "sections": {"summary": "Software Engineer", "skills": ["Python", "JavaScript", "React", "Node.js", "TypeScript", "SQL"], "experience": [], "education": []},
        }
        r = httpx.post(f"{SUPABASE_URL}/rest/v1/cvs", headers=H, json=cv_payload)
        if r.status_code == 201:
            cv_id = r.json().get("id", "") if isinstance(r.json(), dict) else r.json()[0].get("id", "")
            print(f"Created CV: {cv_id}")
        else:
            print(f"Failed to create CV: {r.status_code} {r.text[:200]}")
            cv_id = ""

    # 3. Delete any existing "TEST-" rows from previous smoke tests
    for table in ["todos", "goals", "applications"]:
        r = httpx.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=H,
            params={"user_id": f"eq.{uid}", "select": "id,title,job_title"},
        )
        if r.status_code == 200:
            for row in r.json():
                title = row.get("title") or row.get("job_title") or ""
                if str(title).startswith("TEST-"):
                    hid = row["id"]
                    dr = httpx.delete(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{hid}", headers=H)
                    print(f"Cleaned TEST row {table}/{hid}: HTTP {dr.status_code}")

    print(f"\nSeed complete. Dev UUID: {uid}")
