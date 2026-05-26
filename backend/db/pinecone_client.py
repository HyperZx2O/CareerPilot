"""
Pinecone data-access client.

Provides a lazy-initialised Pinecone index object that is reused across
requests.  When ``PINECONE_API_KEY`` is not set (e.g. during unit tests)
the module falls back to the in-memory mock dictionary so all existing
tests continue to pass unchanged.
"""

from __future__ import annotations

import os
from typing import Dict, Any

# ---------------------------------------------------------------------------
# In-memory fallback stores (used when env vars are absent, e.g. in tests)
# ---------------------------------------------------------------------------
_pinecone_store: Dict[str, dict] = {}   # vector_id -> {id, values, metadata}
_supabase_cvs: Dict[str, dict] = {}     # cv_id -> {sections, user_id, …}


def get_pinecone_vectors() -> Dict[str, dict]:
    """Return the in-memory fallback vector store (for tests)."""
    return _pinecone_store


def get_supabase_cvs() -> Dict[str, dict]:
    """Return the in-memory fallback CV store (for tests)."""
    return _supabase_cvs


# ---------------------------------------------------------------------------
# Real Pinecone index (lazily initialised)
# ---------------------------------------------------------------------------
_pinecone_index = None


def get_pinecone_index():
    """
    Return a live Pinecone index object.

    Reads from environment variables:
      - PINECONE_API_KEY   (required for live mode)
      - PINECONE_INDEX     (index name, default: "careerpilot")
      - PINECONE_ENV       (environment/region, e.g. "us-east-1")

    Returns ``None`` when credentials are missing so callers can fall back
    to the in-memory store without crashing.
    """
    global _pinecone_index
    if _pinecone_index is not None:
        return _pinecone_index

    api_key = os.getenv("PINECONE_API_KEY", "")
    if not api_key:
        return None  # test / local mode — use in-memory fallback

    try:
        from pinecone import Pinecone  # pinecone-client >= 3
        pc = Pinecone(api_key=api_key)
        index_name = os.getenv("PINECONE_INDEX", "careerpilot")
        _pinecone_index = pc.Index(index_name)
        return _pinecone_index
    except Exception:
        return None


def upsert_vectors(vectors: list[dict]) -> None:
    """
    Upsert a list of vector dicts into Pinecone (or the in-memory fallback).

    Each dict must have keys: ``id``, ``values``, ``metadata``.
    """
    index = get_pinecone_index()
    if index is not None:
        # Pinecone SDK expects list of (id, values, metadata) tuples or dicts
        index.upsert(vectors=vectors)
    else:
        for vec in vectors:
            _pinecone_store[vec["id"]] = vec


def query_vectors(query_embedding: list[float], cv_id: str, top_k: int = 4) -> list[dict]:
    """
    Query Pinecone for the top-k closest vectors filtered to ``cv_id``.

    Returns a list of dicts: ``{section, text, score}``.
    Falls back to cosine-similarity over the in-memory store when Pinecone
    is not configured.
    """
    index = get_pinecone_index()
    if index is not None:
        try:
            result = index.query(
                vector=query_embedding,
                top_k=top_k,
                filter={"cv_id": {"$eq": cv_id}},
                include_metadata=True,
            )
            return [
                {
                    "section": m.metadata.get("section", ""),
                    "text": m.metadata.get("text", ""),
                    "score": m.score,
                }
                for m in result.matches
            ]
        except Exception:
            pass  # fall through to in-memory fallback

    # --- in-memory fallback (cosine similarity) ---------------------------
    import math

    def _cosine(v1: list[float], v2: list[float]) -> float:
        if not v1 or not v2:
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = math.sqrt(sum(a * a for a in v1))
        n2 = math.sqrt(sum(b * b for b in v2))
        return dot / (n1 * n2) if n1 and n2 else 0.0

    candidates = []
    for vec in _pinecone_store.values():
        meta = vec.get("metadata", {})
        if meta.get("cv_id") != cv_id:
            continue
        sim = _cosine(query_embedding, vec.get("values", []))
        candidates.append({
            "section": meta.get("section", ""),
            "text": meta.get("text", ""),
            "score": sim,
        })
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:top_k]


def cv_exists(cv_id: str) -> bool:
    """Return True if at least one vector for ``cv_id`` exists."""
    index = get_pinecone_index()
    if index is not None:
        try:
            result = index.query(
                vector=[0.0] * 1536,
                top_k=1,
                filter={"cv_id": {"$eq": cv_id}},
                include_metadata=False,
            )
            return len(result.matches) > 0
        except Exception:
            pass
    # fallback
    return any(
        v.get("metadata", {}).get("cv_id") == cv_id
        for v in _pinecone_store.values()
    )
