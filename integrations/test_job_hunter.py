import sys
from unittest.mock import MagicMock, patch

# Mock modules to allow running without third-party installations
mock_requests = MagicMock()
sys.modules['requests'] = mock_requests

mock_dotenv = MagicMock()
sys.modules['dotenv'] = mock_dotenv

mock_httpx = MagicMock()
sys.modules['httpx'] = mock_httpx

mock_exceptions = MagicMock()
mock_exceptions.RequestException = Exception
sys.modules['requests.exceptions'] = mock_exceptions

import unittest
from job_hunter import (
    clean_html, 
    parse_job, 
    search_jobs, 
    get_structured_jobs,
    search_jobs_async,
    get_structured_jobs_async
)

class TestJobHunter(unittest.TestCase):

    def setUp(self):
        # Reset mocks
        mock_requests.reset_mock()
        mock_requests.get.side_effect = None
        mock_requests.get.return_value = MagicMock()
        
        mock_httpx.reset_mock()
        # Mock httpx.AsyncClient as a context manager returning an async client
        self.mock_client = MagicMock()
        # Mock async get
        async_get = MagicMock()
        self.mock_client.get = async_get
        
        # Async context manager mock
        async_context = MagicMock()
        async_context.__aenter__.return_value = self.mock_client
        mock_httpx.AsyncClient.return_value = async_context

    def test_clean_html(self):
        """Test HTML stripping utility."""
        self.assertEqual(clean_html("<p>Hello World</p>"), "Hello World")
        self.assertEqual(clean_html("<strong>Software Engineer</strong>"), "Software Engineer")
        self.assertEqual(clean_html("No HTML tags"), "No HTML tags")
        self.assertEqual(clean_html(""), "")
        self.assertEqual(clean_html(None), "")

    def test_parse_job_complete_data(self):
        """Test parse_job maps complete raw data to canonical schema."""
        raw_job = {
            "id": 12345,
            "title": "<strong>Python Developer</strong>",
            "company": {"display_name": "Tech Corp"},
            "location": {"display_name": "London, UK"},
            "salary_min": 50000,
            "salary_max": 70000,
            "created": "2026-05-25T12:00:00Z",
            "description": "Looking for a <p>Python Developer</p>.",
            "redirect_url": "https://example.com/apply"
        }
        
        parsed = parse_job(raw_job)
        
        self.assertEqual(parsed["id"], "12345")
        self.assertEqual(parsed["title"], "Python Developer")
        self.assertEqual(parsed["company"], "Tech Corp")
        self.assertEqual(parsed["location"], "London, UK")
        self.assertEqual(parsed["salary_min"], 50000)
        self.assertEqual(parsed["salary_max"], 70000)
        self.assertEqual(parsed["deadline"], "2026-05-25T12:00:00Z")
        self.assertEqual(parsed["description"], "Looking for a Python Developer.")
        self.assertEqual(parsed["url"], "https://example.com/apply")

    def test_parse_job_missing_data(self):
        """Test parse_job handles missing optional fields gracefully."""
        raw_job = {
            "title": "Junior Developer",
        }
        
        parsed = parse_job(raw_job)
        
        self.assertEqual(parsed["id"], "")
        self.assertEqual(parsed["title"], "Junior Developer")
        self.assertEqual(parsed["company"], "Unknown")
        self.assertEqual(parsed["location"], "Remote")
        self.assertIsNone(parsed["salary_min"])
        self.assertIsNone(parsed["salary_max"])
        self.assertIsNone(parsed["deadline"])
        self.assertEqual(parsed["description"], "")
        self.assertEqual(parsed["url"], "")

    @patch('os.getenv')
    def test_search_jobs_missing_env_vars(self, mock_getenv):
        """Test search_jobs raises ValueError if credentials are not in environment."""
        mock_getenv.return_value = None
        with self.assertRaises(ValueError) as context:
            search_jobs("engineer")
        self.assertIn("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set", str(context.exception))

    @patch('os.getenv')
    def test_search_jobs_success_bd(self, mock_getenv):
        """Test search_jobs successful path for location 'bd' (no fallback needed)."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {"id": 1, "title": "Developer 1"},
                {"id": 2, "title": "Developer 2"}
            ]
        }
        mock_requests.get.return_value = mock_response

        jobs = search_jobs("developer", "bd")
        
        mock_requests.get.assert_called_once_with(
            "https://api.adzuna.com/v1/api/jobs/bd/search/1",
            params={
                "app_id": "test_val",
                "app_key": "test_val",
                "what": "developer",
                "results_per_page": 10,
                "content-type": "application/json"
            },
            timeout=10
        )
        self.assertEqual(len(jobs), 2)
        self.assertEqual(jobs[0]["title"], "Developer 1")

    @patch('os.getenv')
    def test_search_jobs_fallback_on_empty_bd(self, mock_getenv):
        """Test search_jobs falls back to 'gb' if 'bd' search returns 0 results."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response_bd = MagicMock()
        mock_response_bd.json.return_value = {"results": []}
        
        mock_response_gb = MagicMock()
        mock_response_gb.json.return_value = {
            "results": [{"id": 100, "title": "GB Developer"}]
        }
        
        mock_requests.get.side_effect = [mock_response_bd, mock_response_gb]

        jobs = search_jobs("developer", "bd")
        
        self.assertEqual(mock_requests.get.call_count, 2)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["title"], "GB Developer")

    @patch('os.getenv')
    def test_search_jobs_fallback_on_error_bd(self, mock_getenv):
        """Test search_jobs falls back to 'gb' if 'bd' request raises an HTTP error."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response_gb = MagicMock()
        mock_response_gb.json.return_value = {
            "results": [{"id": 100, "title": "GB Developer"}]
        }
        
        mock_requests.get.side_effect = [Exception("API Error"), mock_response_gb]

        jobs = search_jobs("developer", "bd")
        
        self.assertEqual(mock_requests.get.call_count, 2)
        self.assertEqual(jobs[0]["title"], "GB Developer")

    @patch('os.getenv')
    def test_search_jobs_raise_error_finally(self, mock_getenv):
        """Test search_jobs raises RuntimeError if both initial search and fallback fail."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        mock_requests.get.side_effect = [
            Exception("API Error 1"),
            Exception("API Error 2")
        ]

        with self.assertRaises(RuntimeError) as context:
            search_jobs("developer", "bd")
            
        self.assertIn("Adzuna API call failed", str(context.exception))

    @patch('os.getenv')
    def test_get_structured_jobs(self, mock_getenv):
        """Test get_structured_jobs calls search and maps through parse_job."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "id": 999,
                    "title": "<b>Cloud Architect</b>",
                    "company": {"display_name": "Cloud Ltd"},
                    "location": {"display_name": "London"}
                }
            ]
        }
        mock_requests.get.return_value = mock_response

        structured = get_structured_jobs("architect", "london")
        
        self.assertEqual(len(structured), 1)
        self.assertEqual(structured[0]["title"], "Cloud Architect")

# Testing Async Search functions using IsolatedAsyncioTestCase
class TestJobHunterAsync(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        mock_httpx.reset_mock()
        self.mock_client = MagicMock()
        
        # Async get helper to mock httpx get calls
        self.async_get = MagicMock()
        self.mock_client.get = self.async_get
        
        async_context = MagicMock()
        async_context.__aenter__.return_value = self.mock_client
        mock_httpx.AsyncClient.return_value = async_context

    @patch('os.getenv')
    async def test_search_jobs_async_success_bd(self, mock_getenv):
        """Test search_jobs_async successful path for location 'bd' (no fallback)."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {"id": 1, "title": "Developer 1"}
            ]
        }
        
        # Set up async mock return value
        async def mock_get_call(*args, **kwargs):
            return mock_response
        self.async_get.side_effect = mock_get_call

        jobs = await search_jobs_async("developer", "bd")
        
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["title"], "Developer 1")
        mock_httpx.AsyncClient.assert_called_once_with(timeout=30.0)

    @patch('os.getenv')
    async def test_search_jobs_async_fallback(self, mock_getenv):
        """Test search_jobs_async fallback to 'gb' on empty bd results."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response_bd = MagicMock()
        mock_response_bd.json.return_value = {"results": []}
        
        mock_response_gb = MagicMock()
        mock_response_gb.json.return_value = {
            "results": [{"id": 100, "title": "GB Developer"}]
        }
        
        async def mock_get_calls(*args, **kwargs):
            if "bd" in args[0]:
                return mock_response_bd
            return mock_response_gb
        self.async_get.side_effect = mock_get_calls

        jobs = await search_jobs_async("developer", "bd")
        
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["title"], "GB Developer")

    @patch('os.getenv')
    async def test_get_structured_jobs_async(self, mock_getenv):
        """Test get_structured_jobs_async calls search_jobs_async and parses cards."""
        mock_getenv.side_effect = lambda key, default=None: "test_val" if "ADZUNA" in key else None
        
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "id": 555,
                    "title": "Data Engineer",
                    "company": {"display_name": "Data Co"}
                }
            ]
        }
        async def mock_get_call(*args, **kwargs):
            return mock_response
        self.async_get.side_effect = mock_get_call

        structured = await get_structured_jobs_async("data engineer", "london")
        
        self.assertEqual(len(structured), 1)
        self.assertEqual(structured[0]["title"], "Data Engineer")
        self.assertEqual(structured[0]["company"], "Data Co")

if __name__ == "__main__":
    unittest.main()
