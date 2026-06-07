from backend.prompts.cover_letter import COVER_LETTER_PROMPT
from backend.services.goals import _call_llm
from backend.logger import get_logger

logger = get_logger("cover_letter")


def generate_cover_letter(job_title: str, company: str, job_description: str, skills_text: str) -> str:
    prompt = COVER_LETTER_PROMPT.format(
        job_title=job_title,
        company=company,
        job_description=job_description,
        skills_text=skills_text,
    )

    try:
        raw = _call_llm(prompt)
        return raw.strip()
    except Exception as e:
        logger.warning("LLM call failed, using template fallback: %s", e)
        return (
            f"Dear {company},\n\n"
            f"I am excited to apply for the {job_title} position. "
            f"My experience in {skills_text} aligns well with the requirements outlined in the job description. "
            f"I am confident that my skills and enthusiasm make me a strong candidate for this role.\n\n"
            f"I look forward to the opportunity to discuss how I can contribute to {company}.\n\n"
            f"Sincerely,\n[Your Name]"
        )
