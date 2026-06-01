GOAL_GENERATION_PROMPT = """You are an expert career advisor. Based on the candidate's CV information below, generate exactly 3 career goal recommendations.

Return a JSON object with this structure (no extra text, pure JSON):
{{
  "goals": [
    {{
      "title": "Goal title (max 60 chars)",
      "description": "Brief description (max 120 chars)",
      "target_role": "Target job role for roadmap generation",
      "priority": "high"
    }}
  ]
}}

Rules:
- Generate exactly 3 goals covering different career paths (e.g., seniority, specialization, transition)
- Each goal should be realistic and based on the actual skills/experience in the CV
- titles must be max 60 characters
- descriptions must be max 120 characters
- priority: high for most impactful, medium for secondary, low for stretch goals
- Do NOT return anything except the JSON object

CV Info:
{skill_summary}"""

GOAL_TITLE_MAX = 60
GOAL_DESC_MAX = 120