"""Simple embeddings adapter with safe deterministic fallback.

Provides `get_embedding(text: str, dim: int = 128) -> list[float]` which attempts
to use a local sentence-transformers model if available, otherwise returns a
deterministic float vector derived from a SHA256 hash. This avoids crashes
when cloud embedding providers (OpenAI/Gemini) are not present.
"""
from __future__ import annotations
import hashlib
import struct
from typing import List


def _deterministic_vector(text: str, dim: int) -> List[float]:
    # Use SHA256 digest bytes to create a repeatable pseudo-random vector
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    # Expand digest as needed by rehashing
    out = bytearray(digest)
    while len(out) < dim * 4:
        digest = hashlib.sha256(digest).digest()
        out.extend(digest)

    vec = []
    for i in range(dim):
        start = i * 4
        chunk = out[start : start + 4]
        # Interpret 4 bytes as unsigned int and normalize to [-1, 1]
        val = struct.unpack("I", bytes(chunk))[0]
        vec.append((val / 0xFFFFFFFF) * 2.0 - 1.0)

    # Normalize to unit length
    norm = sum(x * x for x in vec) ** 0.5
    if norm == 0:
        return [0.0] * dim
    return [x / norm for x in vec]


def get_embedding(text: str, dim: int = 128) -> List[float]:
    """Return an embedding vector for `text`.

    Tries to use `sentence_transformers` if installed (best effort). If not
    available, returns a deterministic fallback vector. This function never
    raises for missing provider libraries.
    """
    try:
        # Try lightweight sentence-transformers if installed in environment
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("all-MiniLM-L6-v2")
        emb = model.encode([text], show_progress_bar=False)[0]
        # If model returns a different dimension, optionally truncate/pad
        if len(emb) >= dim:
            out = emb[:dim]
        else:
            out = list(emb) + _deterministic_vector(text + "__pad", dim - len(emb))
        # Normalize
        norm = sum(float(x) * float(x) for x in out) ** 0.5
        if norm == 0:
            return [0.0] * dim
        return [float(x) / norm for x in out]
    except Exception:
        # Deterministic pure-Python fallback
        return _deterministic_vector(text, dim)
