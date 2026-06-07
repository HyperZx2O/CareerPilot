import json
import os
from backend.prompts.goals import GOAL_GENERATION_PROMPT, GOAL_TITLE_MAX, GOAL_DESC_MAX
from backend.logger import get_logger
from backend.utils import is_placeholder

logger = get_logger("goals")


def _call_llm(prompt: str) -> str:
    groq_key = os.getenv("GROQ_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")

    if groq_key and not is_placeholder(groq_key):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                timeout=20,
            )
            return res.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("Groq call failed: %s", e)

    if nvidia_key and not is_placeholder(nvidia_key):
        import urllib.request
        req = urllib.request.Request(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            data=json.dumps({
                "model": "nvidia/nemotron-70b",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 600,
            }).encode(),
            headers={"Authorization": f"Bearer {nvidia_key}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"].strip()

    raise ValueError("No LLM provider available (set GROQ_API_KEY or NVIDIA_API_KEY)")


def _truncate(text: str, max_len: int) -> str:
    return text[:max_len] if len(text) > max_len else text


def generate_career_goals(skill_summary: str) -> list[dict]:
    """
    Generates career goal recommendations from a CV skills summary.
    Returns a list of goal dicts ready to be inserted into the goals table.
    """
    prompt = GOAL_GENERATION_PROMPT.format(skill_summary=skill_summary)

    try:
        raw = _call_llm(prompt)
    except Exception as e:
        logger.warning("LLM call failed: %s", e)
        # Return a sensible default so the feature doesn't hard-fail
        return [
            {
                "title": _truncate("Master core skills and build portfolio", GOAL_TITLE_MAX),
                "description": _truncate("Strengthen your existing skillset and create showcase projects", GOAL_DESC_MAX),
                "target_role": "Software Engineer",
                "priority": "high",
            },
            {
                "title": _truncate("Prepare for senior-level interviews", GOAL_TITLE_MAX),
                "description": _truncate("Build system design knowledge and advanced technical skills", GOAL_DESC_MAX),
                "target_role": "Senior Software Engineer",
                "priority": "medium",
            },
            {
                "title": _truncate("Expand into adjacent technologies", GOAL_TITLE_MAX),
                "description": _truncate("Learn complementary tools and broaden your technical range", GOAL_DESC_MAX),
                "target_role": "Full Stack Developer",
                "priority": "low",
            },
        ]

    # Try to parse JSON from LLM output
    try:
        # Strip markdown code fences if present
        raw_clean = raw.strip()
        if raw_clean.startswith("```"):
            lines = raw_clean.split("\n")
            raw_clean = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        parsed = json.loads(raw_clean)
        goals = parsed.get("goals", [])
    except json.JSONDecodeError:
        logger.warning("Could not parse LLM output as JSON: %s", raw[:100])
        goals = []

    if not goals:
        return [
            {
                "title": _truncate("Build expertise in your core stack", GOAL_TITLE_MAX),
                "description": _truncate("Deepen knowledge of primary technologies and tools", GOAL_DESC_MAX),
                "target_role": "Software Engineer",
                "priority": "high",
            },
            {
                "title": _truncate("Prepare for technical interviews", GOAL_TITLE_MAX),
                "description": _truncate("Practice algorithms, system design, and behavioral questions", GOAL_DESC_MAX),
                "target_role": "Senior Software Engineer",
                "priority": "medium",
            },
            {
                "title": _truncate("Expand your professional network", GOAL_TITLE_MAX),
                "description": _truncate("Connect with peers, attend meetups, and engage in open source", GOAL_DESC_MAX),
                "target_role": "Software Engineer",
                "priority": "low",
            },
        ]

    # Enforce length limits
    sanitized = []
    for g in goals[:3]:
        sanitized.append({
            "title": _truncate(g.get("title", "Untitled Goal"), GOAL_TITLE_MAX),
            "description": _truncate(g.get("description", ""), GOAL_DESC_MAX),
            "target_role": g.get("target_role", "Software Engineer"),
            "priority": g.get("priority", "medium"),
        })
    return sanitized
