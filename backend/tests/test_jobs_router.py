import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock

# Add monorepo root to sys.path to find backend and integrations
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))
sys.path.append(str(root_path / "integrations"))

# Mock out external third-party dependencies before importing FastAPI
# application.  We deliberately do NOT mock `requests` here — the real
# library is installed and `pyiceberg` (a transitive dep of `supabase`)
# needs the genuine `requests.auth` module at import time.
mock_dotenv = MagicMock()
sys.modules['dotenv'] = mock_dotenv
mock_pinecone = MagicMock()
sys.modules['pinecone'] = mock_pinecone

# Import testing tools and the application under test
import unittest
from fastapi.testclient import TestClient
from backend.main import app

# Create mock implementations for the integrations imported by the router
mock_get_structured_jobs_async = AsyncMock()
mock_compute_fit_score = MagicMock()

# Inject mocks directly into backend.routers.jobs namespace
import backend.routers.jobs
backend.routers.jobs.get_structured_jobs_async = mock_get_structured_jobs_async
backend.routers.jobs.compute_fit_score = mock_compute_fit_score

class TestJobsRouter(unittest.TestCase):

    def setUp(self):
        # Reset mocks before each test case
        mock_get_structured_jobs_async.reset_mock()
        mock_compute_fit_score.reset_mock()
        mock_get_structured_jobs_async.side_effect = None
        mock_compute_fit_score.side_effect = None
        self.client = TestClient(app)

    def test_health_check(self):
        """Test the system health check endpoint."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("environment", data)
        self.assertIn("checks", data)
        self.assertIn("supabase", data["checks"])
        self.assertIn("pinecone", data["checks"])
        self.assertIn("groq", data["checks"])

    def test_search_jobs_without_cv_id(self):
        """Test search endpoint returns jobs with fit_score null when cv_id is omitted."""
        mock_get_structured_jobs_async.return_value = [
            {
                "id": "1",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "location": "London",
                "description": "Python Developer",
                "url": "https://example.com/1"
            },
            {
                "id": "2",
                "title": "Data Analyst",
                "company": "Data Inc",
                "location": "Remote",
                "description": "SQL and Tableau",
                "url": "https://example.com/2"
            }
        ]

        response = self.client.get("/api/jobs/search?q=developer")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("jobs", data)
        self.assertEqual(len(data["jobs"]), 2)
        
        # Verify that both jobs have null fit_score
        for job in data["jobs"]:
            self.assertIsNone(job["fit_score"])
            self.assertEqual(job["fit_reasons"], [])
            self.assertEqual(job["gap_reasons"], [])

        mock_get_structured_jobs_async.assert_called_once_with("developer", "bd")
        mock_compute_fit_score.assert_not_called()

    def test_search_jobs_with_cv_id_and_sorting(self):
        """Test search endpoint computes fit scores concurrently and sorts them descending."""
        mock_get_structured_jobs_async.return_value = [
            {
                "id": "job_low",
                "title": "React Engineer",
                "description": "Frontend React Javascript developer",
            },
            {
                "id": "job_high",
                "title": "Python Engineer",
                "description": "Backend Python FastAPI NLP developer",
            }
        ]

        # First score returned is 60, second is 95
        mock_compute_fit_score.side_effect = [
            {"score": 60, "fit_reasons": ["React skill"], "gap_reasons": ["No python"]},
            {"score": 95, "fit_reasons": ["Strong Python", "NLP background"], "gap_reasons": ["No React"]}
        ]

        response = self.client.get("/api/jobs/search?q=python&cv_id=cv_uuid_123")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("jobs", data)
        self.assertEqual(len(data["jobs"]), 2)
        
        # Verify sorting: job_high (95) must come first, then job_low (60)
        first_job = data["jobs"][0]
        second_job = data["jobs"][1]
        
        self.assertEqual(first_job["id"], "job_high")
        self.assertEqual(first_job["fit_score"], 95)
        self.assertEqual(second_job["id"], "job_low")
        self.assertEqual(second_job["fit_score"], 60)

        self.assertEqual(mock_compute_fit_score.call_count, 2)

    def test_search_jobs_graceful_error_handling(self):
        """Test search endpoint returns null fit score if fit score calculation fails."""
        mock_get_structured_jobs_async.return_value = [
            {
                "id": "job_error",
                "title": "C++ Developer",
                "description": "Embedded C++ programmer",
            }
        ]
        
        # Simulate compute_fit_score raising an exception (e.g. Pinecone database connection error)
        mock_compute_fit_score.side_effect = Exception("Database failure")

        response = self.client.get("/api/jobs/search?q=cpp&cv_id=cv_uuid_123")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["jobs"]), 1)
        
        # Verify it falls back to null instead of failing the request
        job = data["jobs"][0]
        self.assertIsNone(job["fit_score"])
        self.assertEqual(job["fit_reasons"], [])

    def test_single_job_fit_endpoint(self):
        """Test the individual job fit calculation endpoint."""
        mock_compute_fit_score.return_value = {
            "score": 85,
            "fit_reasons": ["Exp 1", "Exp 2"],
            "gap_reasons": ["Gap 1"]
        }

        response = self.client.get("/api/jobs/job_123/fit?cv_id=cv_uuid_123&description=Looking+for+Python")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["fit_score"], 85)
        self.assertEqual(data["fit_reasons"], ["Exp 1", "Exp 2"])
        self.assertEqual(data["gap_reasons"], ["Gap 1"])

if __name__ == "__main__":
    unittest.main()
