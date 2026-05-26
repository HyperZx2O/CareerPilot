"""
Cover letter generation service.
"""

from __future__ import annotations

import os
from typing import Dict, List

from backend.services.rag import retrieve_cv_context, build_cv_context_string, _call_llm, _GROUNDING_INSTRUCTION


def generate_cover_letter(cv_id: str, job_description: str, tone: str = "formal") -> Dict:
    """
    Generate a personalised cover letter grounded in the candidate's CV.

    Args:
        cv_id: CV identifier in the vector store.
        job_description: Target job description text.
        tone: One of "formal", "friendly", or "enthusiastic".

    Returns:
        {"cover_letter": str, "sections_used": list[str]}
    """
    chunks = retrieve_cv_context(job_description, cv_id, top_k=6)
    context_str = build_cv_context_string(chunks)

    system_prompt = (
        f"You are a professional writer. Draft a personalised cover letter for the job "
        f"described below. Write in a {tone} tone. Structure the letter as: "
        f"opening paragraph, experience paragraph, skills paragraph, closing paragraph. "
        f"Use ONLY the experience, skills, and projects from the CV context. "
        f"Do not invent any job title, company, or dates not present in the CV."
        f"\n\n{_GROUNDING_INSTRUCTION}"
        f"\n\n[CV CONTEXT]\n{context_str}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Job description:\n{job_description}"},
    ]

    answer = _call_llm(messages, max_tokens=1500, temperature=0.5)
    sections_used = [c.get("section") for c in chunks if c.get("section")]
    return {"cover_letter": answer, "sections_used": sections_used}
