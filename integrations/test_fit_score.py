import sys
import os
from unittest.mock import MagicMock, patch

# Mock modules to allow running without third-party installations
mock_openai = MagicMock()
sys.modules['openai'] = mock_openai

mock_pinecone = MagicMock()
sys.modules['pinecone'] = mock_pinecone

# Correctly mock the google.generativeai submodule namespace
mock_google = MagicMock()
sys.modules['google'] = mock_google
mock_genai = mock_google.generativeai
sys.modules['google.generativeai'] = mock_genai

mock_dotenv = MagicMock()
sys.modules['dotenv'] = mock_dotenv

mock_httpx = MagicMock()
sys.modules['httpx'] = mock_httpx

import unittest
from fit_score import cosine_similarity, embed_text, call_llm_for_reasons, compute_fit_score

class TestFitScore(unittest.TestCase):

    def setUp(self):
        # Reset the mock generators
        mock_openai.reset_mock()
        mock_google.reset_mock()
        mock_genai.reset_mock()
        mock_pinecone.reset_mock()

    def test_cosine_similarity_identical(self):
        """Test cosine similarity of identical vectors returns 1.0."""
        v1 = [1.0, 2.0, 3.0]
        v2 = [1.0, 2.0, 3.0]
        self.assertAlmostEqual(cosine_similarity(v1, v2), 1.0, places=5)

    def test_cosine_similarity_orthogonal(self):
        """Test cosine similarity of orthogonal vectors returns 0.0."""
        v1 = [1.0, 0.0]
        v2 = [0.0, 1.0]
        self.assertAlmostEqual(cosine_similarity(v1, v2), 0.0, places=5)

    def test_cosine_similarity_arbitrary(self):
        """Test cosine similarity of arbitrary vectors."""
        v1 = [3.0, 4.0]
        v2 = [4.0, 3.0]
        # dot_product = 12 + 12 = 24
        # norm_a = sqrt(9 + 16) = 5
        # norm_b = sqrt(16 + 9) = 5
        # expected = 24 / 25 = 0.96
        self.assertAlmostEqual(cosine_similarity(v1, v2), 0.96, places=5)

    def test_cosine_similarity_zero_vector(self):
        """Test cosine similarity handling of zero magnitude vectors (returns 0.0)."""
        v1 = [0.0, 0.0]
        v2 = [1.0, 1.0]
        self.assertEqual(cosine_similarity(v1, v2), 0.0)

    @patch.dict(os.environ, {"OPENAI_API_KEY": "mock_openai_key"})
    def test_embed_text_openai(self):
        """Test embed_text calls OpenAI correctly when key is present."""
        mock_client = MagicMock()
        mock_openai.OpenAI.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]
        mock_client.embeddings.create.return_value = mock_response

        embedding = embed_text("mock job description")
        
        mock_client.embeddings.create.assert_called_once_with(
            input=["mock job description"],
            model="text-embedding-3-small"
        )
        self.assertEqual(embedding, [0.1, 0.2, 0.3])

    @patch.dict(os.environ, {"GEMINI_API_KEY": "mock_gemini_key"}, clear=True)
    def test_embed_text_gemini(self):
        """Test embed_text calls Gemini as secondary fallback when OpenAI key is missing."""
        mock_genai.embed_content.return_value = {"embedding": [0.4, 0.5, 0.6]}

        embedding = embed_text("mock job description")
        
        mock_genai.embed_content.assert_called_once_with(
            model="models/embedding-001",
            content="mock job description",
            task_type="retrieval_query"
        )
        self.assertEqual(embedding, [0.4, 0.5, 0.6])

    @patch.dict(os.environ, {}, clear=True)
    def test_embed_text_missing_keys(self):
        """Test embed_text raises ValueError when all keys are missing."""
        with self.assertRaises(ValueError):
            embed_text("text")

    def test_call_llm_for_reasons_heuristics(self):
        """Test call_llm_for_reasons fallback when no keys are present."""
        fit, gap = call_llm_for_reasons("prompt")
        self.assertEqual(len(fit), 3)
        self.assertEqual(len(gap), 2)
        self.assertTrue(all(isinstance(r, str) for r in fit))
        self.assertTrue(all(isinstance(g, str) for g in gap))

    @patch.dict(os.environ, {
        "PINECONE_API_KEY": "mock_pc_key",
        "OPENAI_API_KEY": "mock_openai_key"
    })
    @patch("fit_score.embed_text")
    def test_compute_fit_score_complete_math(self, mock_embed):
        """Test compute_fit_score mathematical weighting calculations with mock Pinecone query."""
        # Query embedding stub
        mock_embed.return_value = [1.0, 0.0]
        
        # Mock Pinecone Client
        mock_pc = MagicMock()
        mock_pinecone.Pinecone.return_value = mock_pc
        mock_index = MagicMock()
        mock_pc.Index.return_value = mock_index
        
        # Simulating Pinecone Query returns:
        # Match 1: Experience (chunk val = [1.0, 0.0] -> sim 1.0)
        # Match 2: Skills (chunk val = [0.0, 1.0] -> sim 0.0)
        # Match 3: Projects (chunk val = [0.8, 0.6] -> sim 0.8)
        # Match 4: Education (chunk val = [0.6, 0.8] -> sim 0.6)
        mock_index.query.return_value = {
            "matches": [
                {
                    "values": [1.0, 0.0],
                    "metadata": {"section": "experience", "content": "Worked on NLP projects"},
                },
                {
                    "values": [0.0, 1.0],
                    "metadata": {"section": "skills", "content": "Experienced in React"},
                },
                {
                    "values": [0.8, 0.6],
                    "metadata": {"section": "projects", "content": "Built full stack web application"},
                },
                {
                    "values": [0.6, 0.8],
                    "metadata": {"section": "education", "content": "BSc in Computer Science"},
                }
            ]
        }
        
        result = compute_fit_score("cv_abc", "Python, NLP, web app, BSc")
        
        self.assertEqual(result["score"], 58)
        self.assertEqual(len(result["fit_reasons"]), 3)
        self.assertEqual(len(result["gap_reasons"]), 2)

    @patch.dict(os.environ, {
        "PINECONE_API_KEY": "mock_pc_key",
        "OPENAI_API_KEY": "mock_openai_key"
    })
    @patch("fit_score.embed_text")
    def test_compute_fit_score_partial_normalized(self, mock_embed):
        """Test compute_fit_score performs correct normalization for missing sections."""
        # Query embedding stub
        mock_embed.return_value = [1.0, 0.0]
        
        mock_pc = MagicMock()
        mock_pinecone.Pinecone.return_value = mock_pc
        mock_index = MagicMock()
        mock_pc.Index.return_value = mock_index
        
        # Simulating Pinecone Query returns only 2 matches (Experience, Skills):
        # Match 1: Experience (chunk val = [1.0, 0.0] -> sim 1.0)
        # Match 2: Skills (chunk val = [0.8, 0.6] -> sim 0.8)
        mock_index.query.return_value = {
            "matches": [
                {
                    "values": [1.0, 0.0],
                    "metadata": {"section": "experience", "content": "3 years experience"},
                },
                {
                    "values": [0.8, 0.6],
                    "metadata": {"section": "skills", "content": "Skilled in Python"},
                }
            ]
        }
        
        result = compute_fit_score("cv_abc", "Python developer")
        
        self.assertEqual(result["score"], 91)

if __name__ == "__main__":
    unittest.main()
