COVER_LETTER_PROMPT = """Write a professional cover letter for the following job application. Keep it under 300 words. Output only the plain text letter — no markdown, no signatures.

Job title: {job_title}
Company: {company}
Job description: {job_description}
Applicant's skills: {skills_text}

Write a compelling cover letter that connects the applicant's skills to the job requirements.
"""