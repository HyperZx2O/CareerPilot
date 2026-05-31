import os
import sys
import requests
from dotenv import load_dotenv

sys.path.insert(0, 'integrations')
load_dotenv()

JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")
print(f"JSEARCH_API_KEY = '{JSEARCH_API_KEY}'")

# Test openwebninja endpoint directly (GET with x-api-key header)
print("\n=== Testing openwebninja.com jsearch/search-v2 endpoint ===")
url = "https://api.openwebninja.com/jsearch/search-v2"
params = {"query": "software developer in Bangladesh"}
headers = {"x-api-key": JSEARCH_API_KEY}
try:
    r = requests.get(url, headers=headers, params=params, timeout=15)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

from job_hunter import get_bangladesh_jobs
print("\n=== Testing get_bangladesh_jobs() ===")
jobs = get_bangladesh_jobs('software developer', 3)
print(f'Found {len(jobs)} jobs')
for i, job in enumerate(jobs):
    print(f'\n--- Job {i+1} ---')
    print(f'Title: {job.get("title", "N/A")}')
    print(f'Company: {job.get("company", "N/A")}')
    print(f'Location: {job.get("location", "N/A")}')
