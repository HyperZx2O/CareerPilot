import json
from typing import List
from backend.prompts.roadmap import ROADMAP_PROMPT
from backend.services.goals import _call_llm
from backend.logger import get_logger

logger = get_logger("roadmap")

STATIC_STEPS: List[dict] = [
    {"week": 1, "title": "Assess current skills", "description": "Evaluate your current skill level against the target role requirements to identify gaps."},
    {"week": 2, "title": "Identify gaps", "description": "List the technologies and concepts you need to learn for the target role."},
    {"week": 3, "title": "Select learning resources", "description": "Find courses, tutorials, and documentation for each skill gap."},
    {"week": 4, "title": "Create weekly schedule", "description": "Allocate time blocks each day for focused learning and practice."},
    {"week": 5, "title": "Build projects", "description": "Apply what you have learned by building portfolio projects relevant to the role."},
    {"week": 6, "title": "Practice interviews", "description": "Prepare for technical and behavioral interview questions."},
    {"week": 7, "title": "Refine your CV", "description": "Update your CV and portfolio to highlight new skills and projects."},
    {"week": 8, "title": "Apply and track", "description": "Start applying for roles and track your applications and progress."},
]


def generate_roadmap(target_role: str, skills_text: str) -> List[dict]:
    prompt = ROADMAP_PROMPT.format(target_role=target_role, skills_text=skills_text)

    try:
        raw = _call_llm(prompt)
    except Exception as e:
        logger.warning("LLM call failed, using static roadmap: %s", e)
        return list(STATIC_STEPS)

    try:
        raw_clean = raw.strip()
        if raw_clean.startswith("```"):
            lines = raw_clean.split("\n")
            raw_clean = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        parsed = json.loads(raw_clean)
        if isinstance(parsed, list):
            steps = parsed
        elif isinstance(parsed, dict):
            steps = parsed.get("steps", parsed.get("roadmap", []))
        else:
            steps = []
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("Could not parse LLM output as JSON: %s", e)
        steps = []

    if not steps or not isinstance(steps, list):
        return list(STATIC_STEPS)

    result = []
    for s in steps:
        if isinstance(s, dict) and "title" in s:
            result.append({
                "week": s.get("week", len(result) + 1),
                "title": s.get("title", "Untitled step"),
                "description": s.get("description", ""),
            })

    return result[:8] if result else list(STATIC_STEPS)
