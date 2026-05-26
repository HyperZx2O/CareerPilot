"""
Fit score service — cosine similarity between job description and CV chunks.
"""

from __future__ import annotations

import math
import os
from typing import List, Dict

from backend.db.pinecone_client import get_pinecone_vectors, query_vectors


def _embed_text(text: str) -> List[float]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if api_key:
        try:
            import openai
            openai.api_key = api_key
            resp = openai.embeddings.create(input=text, model="text-embedding-3-small")
            return resp.data[0].embedding
        except Exception:
            pass
    return [0.0] * 1536


def compute_fit_score(cv_id: str, job_description: str) -> Dict:
    """
    Compute a 0-100 fit score between a job description and a CV.

    Returns::

        {
            "fit_score": int,
            "fit_reasons": list[str],
            "gap_reasons": list[str],
        }
    """
    if not job_description.strip():
        return {"fit_score": 0, "fit_reasons": [], "gap_reasons": []}

    # Retrieve top matching CV chunks
    query_vec = _embed_text(job_description)
    chunks = query_vectors(query_vec, cv_id, top_k=6)

    if not chunks:
        return {"fit_score": 0, "fit_reasons": [], "gap_reasons": ["No CV data found"]}

    # Average cosine similarity → scale to 0-100
    scores = [c.get("score", 0.0) for c in chunks]
    avg_score = sum(scores) / len(scores) if scores else 0.0
    fit_score = min(100, max(0, int(avg_score * 100)))

    # Build human-readable reasons from top chunks
    fit_reasons = []
    for chunk in chunks[:3]:
        section = (chunk.get("section") or "").upper()
        text_snippet = (chunk.get("text") or "")[:120].replace("\n", " ")
        if chunk.get("score", 0) > 0.5:
            fit_reasons.append(f"Strong match in {section}: {text_snippet}…")

    gap_reasons: List[str] = []
    if fit_score < 50:
        gap_reasons.append("CV sections have low similarity to the job description")
    if fit_score < 30:
        gap_reasons.append("Consider adding more relevant skills or experience to your CV")

    return {
        "fit_score": fit_score,
        "fit_reasons": fit_reasons,
        "gap_reasons": gap_reasons,
    }
