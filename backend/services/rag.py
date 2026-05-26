"""
RAG retrieval and LLM call orchestration.

Retrieves CV chunks from Pinecone (or in-memory fallback), composes a
grounded prompt, and calls the LLM.  Conversational memory is stored
in-process (dict) for MVP; the spec calls for Redis TTL storage which
can be swapped in without changing the interface.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List, Dict, Optional

from backend.db.pinecone_client import query_vectors

# ---------------------------------------------------------------------------
# In-process session memory  (key: session_id → list of message dicts)
# TTL / Redis swap-in point: replace this dict with Redis JSON calls.
# ---------------------------------------------------------------------------
SESSION_HISTORY: Dict[str, List[Dict[str, str]]] = {}

# ---------------------------------------------------------------------------
# Query-type detection (spec §4, Phase 4)
# ---------------------------------------------------------------------------

_QUERY_KEYWORDS: Dict[str, List[str]] = {
    "readiness":    ["ready", "fit for", "qualified", "am i ready"],
    "gap":          ["missing", "gap", "need to learn", "don't have", "do not have", "lacking"],
    "roadmap":      ["roadmap", "plan", "how to become", "3 month", "3-month", "3 months",
                     "6 month", "learning path"],
    "cover_letter": ["cover letter", "write a letter", "application letter", "draft a letter"],
}


def detect_query_type(message: str) -> str:
    """Return the query type based on keyword matching."""
    lower = message.lower()
    for qtype, keywords in _QUERY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return qtype
    return "general"


# ---------------------------------------------------------------------------
# System prompts (spec §4, Phase 4 — stored inline; move to prompts/ later)
# ---------------------------------------------------------------------------

_GROUNDING_INSTRUCTION = (
    "MANDATORY GROUNDING INSTRUCTION: You must answer ONLY using the CV context below. "
    "Do not invent, assume, or extrapolate any experience, skill, qualification, or "
    "personal detail not explicitly stated in the CV context. If the information needed "
    "is not present in the CV, say so clearly rather than inventing an answer."
)

_SYSTEM_PROMPTS: Dict[str, str] = {
    "readiness": (
        "You are a career coach. Given the candidate's CV and the job description in "
        "the message, provide: (1) a clear READY / NOT READY / PARTIALLY READY verdict, "
        "(2) a bullet list of matching strengths, (3) a bullet list of gaps. Ground every "
        "point in the CV context. Do not invent qualifications."
    ),
    "gap": (
        "You are a career advisor. Compare the candidate's CV against the benchmark or "
        "job mentioned in the message. List only skills and qualifications that are "
        "explicitly absent from the CV. Do not suggest skills the CV already shows."
    ),
    "roadmap": (
        "You are a learning planner. Based on the candidate's current skills in the CV "
        "and the target role in the message, generate a structured week-by-week roadmap "
        "for the requested duration. Include specific free learning resources (course names, "
        "platforms). Do not repeat skills already in the CV as things to learn."
    ),
    "cover_letter": (
        "You are a professional writer. Draft a personalised cover letter for the job "
        "described in the message. Use ONLY the experience, skills, and projects from the "
        "CV context. Do not fabricate any achievements or qualifications."
    ),
    "general": (
        "You are an AI career assistant. Answer the user's question based solely on the "
        "CV context provided. Be concise and helpful."
    ),
}


def get_system_prompt(qtype: str) -> str:
    """Return the system prompt string for a given query type."""
    return _SYSTEM_PROMPTS.get(qtype, _SYSTEM_PROMPTS["general"])


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

def _embed_query(text: str) -> List[float]:
    """Embed a query string.  Falls back to zero-vector when no API key."""
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


def retrieve_cv_context(
    query: str,
    cv_id: str,
    top_k: int = 4,
    user_id: Optional[str] = None,
) -> List[Dict]:
    """
    Embed *query* and return the top-k most relevant CV chunks for *cv_id*.

    Returns ``[]`` when the cv_id is unknown.  Never raises.
    """
    query_vec = _embed_query(query)
    return query_vectors(query_vec, cv_id, top_k=top_k)


def build_cv_context_string(chunks: List[Dict]) -> str:
    """
    Format retrieved chunks into a prompt-ready string.

    Example output::

        [EXPERIENCE]
        Worked at X as a software engineer...

        [SKILLS]
        Python, FastAPI, SQL
    """
    parts = []
    for chunk in chunks:
        section = chunk.get("section", "")
        text = chunk.get("text", "")
        if section and text:
            parts.append(f"[{section.upper()}]\n{text}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# LLM call with Gemini primary / OpenAI fallback
# ---------------------------------------------------------------------------

def _call_llm(messages: List[Dict], max_tokens: int = 1000, temperature: float = 0.3) -> str:
    """
    Call the LLM with *messages*.

    Strategy (spec §2, Model Fallback):
    1. Try Gemini 1.5 Flash via ``google-generativeai`` if GEMINI_API_KEY set.
    2. Fall back to OpenAI gpt-4o-mini if OPENAI_API_KEY set.
    3. Return empty string if neither is available.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")

    # --- Gemini attempt ---
    if gemini_key:
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            # Convert OpenAI-style messages to a single prompt string
            combined = "\n\n".join(
                f"[{m['role'].upper()}]\n{m['content']}" for m in messages
            )
            response = model.generate_content(
                combined,
                generation_config={"max_output_tokens": max_tokens, "temperature": temperature},
            )
            return response.text or ""
        except Exception:
            pass  # fall through to OpenAI

    # --- OpenAI fallback ---
    if openai_key:
        try:
            import openai
            openai.api_key = openai_key
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return getattr(response.choices[0].message, "content", "") or ""
        except Exception:
            pass

    return ""


# ---------------------------------------------------------------------------
# Core RAG function
# ---------------------------------------------------------------------------

def rag_query(
    query: str,
    cv_id: str,
    system_prompt: str,
    session_id: Optional[str] = None,
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> Dict:
    """
    Full RAG pipeline: retrieve → compose prompt → call LLM → return reply.

    Returns ``{"answer": str, "sources": list[str], "query_type": str}``.
    """
    chunks = retrieve_cv_context(query, cv_id)
    context_str = build_cv_context_string(chunks)

    # Build grounded system prompt
    full_system = f"{system_prompt}\n\n{_GROUNDING_INSTRUCTION}\n\n[CV CONTEXT]\n{context_str}"

    # Build message list including session history
    messages: List[Dict] = [{"role": "system", "content": full_system}]
    if session_id:
        messages.extend(SESSION_HISTORY.get(session_id, []))
    messages.append({"role": "user", "content": query})

    answer = _call_llm(messages, max_tokens=max_tokens, temperature=temperature)
    sources = [c.get("section") for c in chunks if c.get("section")]
    return {"answer": answer, "sources": sources}
