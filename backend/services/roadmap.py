"""
Learning roadmap generation service.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Set

from backend.db.pinecone_client import get_pinecone_vectors
from backend.services.rag import _call_llm


def _extract_skills(text: str) -> List[str]:
    """Split skill text on commas, semicolons, and newlines."""
    parts = re.split(r"[;,\n]+", text)
    return [p.strip() for p in parts if p.strip()]


def generate_roadmap(cv_id: str, target_role: str, duration_weeks: int) -> Dict:
    """
    Generate a week-by-week learning roadmap.

    Returns::

        {
            "roadmap": [{"week": int, "focus": str, "tasks": [...], "resources": [...]}],
            "existing_skills_detected": [str],
        }
    """
    # Gather skills from in-memory or Pinecone store
    store = get_pinecone_vectors()
    existing_skills: Set[str] = set()
    for vec in store.values():
        meta = vec.get("metadata", {})
        if meta.get("cv_id") != cv_id:
            continue
        if (meta.get("section") or "").lower() in ("skills", "technologies", "core competencies"):
            existing_skills.update(_extract_skills(meta.get("text", "")))

    skills_list = sorted(existing_skills)

    system_prompt = (
        "You are a learning planner. Generate a week-by-week learning roadmap for the target role. "
        "Include specific free resources (platform name + course name) each week. "
        "Do NOT suggest learning skills already present in 'Existing skills'. "
        "Return ONLY a valid JSON object with keys 'roadmap' (list of week objects with "
        "keys: week, focus, tasks, resources) and 'existing_skills_detected' (list of strings)."
    )
    user_prompt = (
        f"Existing skills: {', '.join(skills_list) or 'none listed'}\n"
        f"Target role: {target_role}\n"
        f"Duration: {duration_weeks} weeks\n"
        "Return JSON only."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    raw = _call_llm(messages, max_tokens=2000, temperature=0.4)

    # Try to parse LLM JSON response
    if raw:
        try:
            # Strip markdown fences if present
            clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
            result = json.loads(clean)
            if isinstance(result, dict) and "roadmap" in result and "existing_skills_detected" in result:
                return result
        except Exception:
            pass

    # Deterministic fallback
    roadmap = [
        {
            "week": w,
            "focus": f"Week {w} — {target_role} fundamentals",
            "tasks": [f"Study topic {w}a", f"Complete exercise {w}b"],
            "resources": [f"Free resource for week {w}"],
        }
        for w in range(1, duration_weeks + 1)
    ]
    return {"roadmap": roadmap, "existing_skills_detected": skills_list}
