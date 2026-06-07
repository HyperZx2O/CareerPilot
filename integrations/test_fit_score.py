import sys
import os
from unittest.mock import MagicMock, patch

_fit_score = None
_pinecone_mock = MagicMock()

def _get_fit_score():
    global _fit_score
    if _fit_score is None:
        import fit_score as _fit_score
    return _fit_score


import unittest


class TestFitScore(unittest.TestCase):

    def setUp(self):
        _pinecone_mock.reset_mock()
        self.modules_patcher = patch.dict('sys.modules', {'pinecone': _pinecone_mock})
        self.modules_patcher.start()
        global _fit_score
        _fit_score = None

    def tearDown(self):
        self.modules_patcher.stop()
        global _fit_score
        _fit_score = None
        sys.modules.pop('fit_score', None)

    def test_cosine_similarity_identical(self):
        fs = _get_fit_score()
        self.assertAlmostEqual(fs.cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 1.0, places=5)

    def test_cosine_similarity_orthogonal(self):
        fs = _get_fit_score()
        self.assertAlmostEqual(fs.cosine_similarity([1.0, 0.0], [0.0, 1.0]), 0.0, places=5)

    def test_cosine_similarity_arbitrary(self):
        fs = _get_fit_score()
        v1, v2 = [3.0, 4.0], [4.0, 3.0]
        self.assertAlmostEqual(fs.cosine_similarity(v1, v2), 0.96, places=5)

    def test_cosine_similarity_zero_vector(self):
        fs = _get_fit_score()
        self.assertEqual(fs.cosine_similarity([0.0, 0.0], [1.0, 1.0]), 0.0)

    @patch.dict(os.environ, {}, clear=True)
    def test_embed_text_missing_keys(self):
        fs = _get_fit_score()
        vec = fs.embed_text("text")
        self.assertIsInstance(vec, list)
        self.assertGreater(len(vec), 0)
        self.assertTrue(all(isinstance(x, (float, int)) for x in vec))

    def test_call_llm_for_reasons_heuristics(self):
        fs = _get_fit_score()
        fit, gap = fs.call_llm_for_reasons("prompt")
        self.assertEqual(len(fit), 3)
        self.assertEqual(len(gap), 2)
        self.assertTrue(all(isinstance(r, str) for r in fit))
        self.assertTrue(all(isinstance(g, str) for g in gap))

    @patch.dict(os.environ, {"PINECONE_API_KEY": "mock_pc_key"})
    def test_compute_fit_score_complete_math(self):
        mock_index = MagicMock()
        mock_index.query.return_value = {
            "matches": [
                {"values": [1.0, 0.0], "metadata": {"section": "experience", "content": "Worked on NLP projects"}},
                {"values": [0.0, 1.0], "metadata": {"section": "skills", "content": "Experienced in React"}},
                {"values": [0.8, 0.6], "metadata": {"section": "projects", "content": "Built full stack web application"}},
                {"values": [0.6, 0.8], "metadata": {"section": "education", "content": "BSc in Computer Science"}},
            ]
        }
        mock_pc = MagicMock()
        mock_pc.Index.return_value = mock_index
        _pinecone_mock.Pinecone.return_value = mock_pc

        with patch.object(_get_fit_score(), 'embed_text', return_value=[1.0, 0.0]):
            result = _get_fit_score().compute_fit_score("cv_abc", "Python, NLP, web app, BSc")

        self.assertEqual(result["score"], 58)
        self.assertEqual(len(result["fit_reasons"]), 3)
        self.assertEqual(len(result["gap_reasons"]), 2)

    @patch.dict(os.environ, {"PINECONE_API_KEY": "mock_pc_key"})
    def test_compute_fit_score_partial_normalized(self):
        mock_index = MagicMock()
        mock_index.query.return_value = {
            "matches": [
                {"values": [1.0, 0.0], "metadata": {"section": "experience", "content": "3 years experience"}},
                {"values": [0.8, 0.6], "metadata": {"section": "skills", "content": "Skilled in Python"}},
            ]
        }
        mock_pc = MagicMock()
        mock_pc.Index.return_value = mock_index
        _pinecone_mock.Pinecone.return_value = mock_pc

        with patch.object(_get_fit_score(), 'embed_text', return_value=[1.0, 0.0]):
            result = _get_fit_score().compute_fit_score("cv_abc", "Python developer")

        self.assertEqual(result["score"], 91)


if __name__ == "__main__":
    unittest.main()
