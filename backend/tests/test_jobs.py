import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
import unittest

# Ensure project root and backend are on sys.path
root_path = Path(__file__).resolve().parent.parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))
if str(root_path / "integrations") not in sys.path:
    sys.path.insert(0, str(root_path / "integrations"))

# Mock out external third-party dependencies that are heavy and not used by
# the test targets.  We deliberately do NOT mock `requests` here — the real
# library is installed and `pyiceberg` (a transitive dep of `supabase`) needs
# the genuine `requests.auth` module at import time.
mock_dotenv = MagicMock()
sys.modules['dotenv'] = mock_dotenv

mock_pinecone = MagicMock()
sys.modules['pinecone'] = mock_pinecone

# Import functions under test
from integrations.job_hunter import parse_job
from fastapi.testclient import TestClient
from backend.main import app

class TestJobs(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_parse_job_correct_mapping(self):
        """Test parse_job correctly maps raw Adzuna response to the canonical schema."""
        raw_job = {
            "id": "12345",
            "title": "Software Engineer",
            "company": {"display_name": "Test Company"},
            "location": {"display_name": "Test Location"},
            "salary_min": 50000,
            "salary_max": 70000,
            "created": "2026-05-26T00:00:00Z",
            "description": "A test job description.",
            "redirect_url": "https://example.com/job/12345"
        }
        parsed = parse_job(raw_job)
        self.assertEqual(parsed["id"], "12345")
        self.assertEqual(parsed["title"], "Software Engineer")
        self.assertEqual(parsed["company"], "Test Company")
        self.assertEqual(parsed["location"], "Test Location")
        self.assertEqual(parsed["salary_min"], 50000)
        self.assertEqual(parsed["salary_max"], 70000)
        self.assertEqual(parsed["deadline"], "2026-05-26T00:00:00Z")
        self.assertEqual(parsed["description"], "A test job description.")
        self.assertEqual(parsed["url"], "https://example.com/job/12345")

    def test_parse_job_defaults(self):
        """Test parse_job handles missing optional fields gracefully with defaults."""
        raw_job = {
            "id": "67890",
            "title": "Minimal Job"
        }
        parsed = parse_job(raw_job)
        self.assertEqual(parsed["id"], "67890")
        self.assertEqual(parsed["title"], "Minimal Job")
        self.assertEqual(parsed["company"], "Unknown")
        self.assertEqual(parsed["location"], "Remote")
        self.assertIsNone(parsed.get("salary_min"))
        self.assertIsNone(parsed.get("salary_max"))
        self.assertEqual(parsed["description"], "")
        self.assertEqual(parsed["url"], "")

    @patch("backend.routers.jobs.get_structured_jobs_async")
    @patch("backend.routers.jobs.compute_fit_score")
    def test_search_jobs_with_cv_id(self, mock_fit, mock_get_jobs):
        """Test search endpoint returns jobs with fit_score populated when cv_id is provided."""
        mock_get_jobs.return_value = [
            {
                "id": "1",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "location": "London",
                "description": "Python Developer",
                "url": "https://example.com/1"
            }
        ]
        mock_fit.return_value = {
            "score": 85,
            "fit_reasons": ["Good Python skills"],
            "gap_reasons": ["Missing Go"]
        }

        response = self.client.get("/api/jobs/search?q=python&cv_id=cv-123")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("jobs", data)
        self.assertEqual(len(data["jobs"]), 1)
        job = data["jobs"][0]
        self.assertEqual(job["fit_score"], 85)
        self.assertEqual(job["fit_reasons"], ["Good Python skills"])
        self.assertEqual(job["gap_reasons"], ["Missing Go"])

    @patch("backend.routers.jobs.get_structured_jobs_async")
    def test_search_jobs_without_cv_id(self, mock_get_jobs):
        """Test search endpoint returns jobs with fit_score null when cv_id is omitted."""
        mock_get_jobs.return_value = [
            {
                "id": "1",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "location": "London",
                "description": "Python Developer",
                "url": "https://example.com/1"
            }
        ]

        response = self.client.get("/api/jobs/search?q=python")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("jobs", data)
        self.assertEqual(len(data["jobs"]), 1)
        job = data["jobs"][0]
        self.assertIsNone(job["fit_score"])
        self.assertEqual(job["fit_reasons"], [])
        self.assertEqual(job["gap_reasons"], [])
