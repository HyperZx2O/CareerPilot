import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import unittest

# Ensure project root and backend are on sys.path
root_path = Path(__file__).resolve().parent.parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))
if str(root_path / "integrations") not in sys.path:
    sys.path.insert(0, str(root_path / "integrations"))

# Mock out external third-party dependencies before importing fit_score
mock_dotenv = MagicMock()
sys.modules['dotenv'] = mock_dotenv

mock_openai = MagicMock()
sys.modules['openai'] = mock_openai

mock_pinecone = MagicMock()
sys.modules['pinecone'] = mock_pinecone

mock_google = MagicMock()
sys.modules['google'] = mock_google
mock_genai = mock_google.generativeai
sys.modules['google.generativeai'] = mock_genai

# Import functions under test
from integrations.fit_score import cosine_similarity, compute_fit_score

class TestFitScore(unittest.TestCase):

    def test_cosine_similarity_identical_vectors(self):
        """Test that cosine_similarity of two identical vectors returns 1.0."""
        vec_a = [1.0, 0.0, 0.5]
        vec_b = [1.0, 0.0, 0.5]
        similarity = cosine_similarity(vec_a, vec_b)
        self.assertAlmostEqual(similarity, 1.0, places=5)

    def test_cosine_similarity_orthogonal_vectors(self):
        """Test that cosine_similarity of two orthogonal vectors returns 0.0."""
        vec_a = [1.0, 0.0, 0.0]
        vec_b = [0.0, 1.0, 0.0]
        similarity = cosine_similarity(vec_a, vec_b)
        self.assertAlmostEqual(similarity, 0.0, places=5)

    def test_cosine_similarity_zero_vector(self):
        """Test that cosine_similarity handles a zero vector gracefully returning 0.0."""
        vec_a = [0.0, 0.0, 0.0]
        vec_b = [1.0, 2.0, 3.0]
        similarity = cosine_similarity(vec_a, vec_b)
        self.assertEqual(similarity, 0.0)

    @patch("integrations.fit_score.embed_text")
    @patch("integrations.fit_score.call_llm_for_reasons")
    @patch("pinecone.Pinecone")
    def test_compute_fit_score_schema_and_value(self, mock_pc_class, mock_reasons, mock_embed):
        """Test compute_fit_score returns the expected schema and scores."""
        # Setup mocks
        os.environ["PINECONE_API_KEY"] = "fake-key"
        os.environ["PINECONE_INDEX"] = "fake-index"

        mock_pc_inst = MagicMock()
        mock_pc_class.return_value = mock_pc_inst
        mock_index = MagicMock()
        mock_pc_inst.Index.return_value = mock_index

        # Mock Pinecone query response
        mock_index.query.return_value = {
            "matches": [
                {
                    "values": [1.0, 0.0, 0.0],
                    "metadata": {"section": "experience", "content": "Worked on python backend"}
                },
                {
                    "values": [0.0, 1.0, 0.0],
                    "metadata": {"section": "skills", "content": "FastAPI, PostgreSQL"}
                }
            ]
        }

        # Mock embedding and LLM calls
        mock_embed.return_value = [1.0, 0.0, 0.0]
        mock_reasons.return_value = (
            ["Fit reason 1", "Fit reason 2", "Fit reason 3"],
            ["Gap reason 1", "Gap reason 2"]
        )

        # Call function under test
        result = compute_fit_score("cv-123", "Python Software Developer")

        # Assertions
        self.assertIsInstance(result, dict)
        self.assertIn("score", result)
        self.assertIn("fit_reasons", result)
        self.assertIn("gap_reasons", result)

        self.assertIsInstance(result["score"], int)
        self.assertTrue(0 <= result["score"] <= 100)
        self.assertEqual(len(result["fit_reasons"]), 3)
        self.assertEqual(len(result["gap_reasons"]), 2)
