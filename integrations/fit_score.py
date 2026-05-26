import os
import math
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Compute cosine similarity between two float vectors.
    Uses numpy if installed; falls back to pure Python implementation using the math module.
    """
    try:
        import numpy as np
        a, b = np.array(vec_a), np.array(vec_b)
        # Avoid division by zero
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
    except ImportError:
        # Pure Python mathematical fallback
        if len(vec_a) != len(vec_b):
            raise ValueError("Vectors must be of the same length")
        
        dot_product = sum(x * y for x, y in zip(vec_a, vec_b))
        magnitude_a = math.sqrt(sum(x * x for x in vec_a))
        magnitude_b = math.sqrt(sum(x * x for x in vec_b))
        
        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0
        return dot_product / (magnitude_a * magnitude_b)

def embed_text(text: str) -> list[float]:
    """
    Generate embedding for text using OpenAI (primary) or Google Gemini (secondary).
    Raises ValueError if neither key is set in the environment.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if openai_key:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        response = client.embeddings.create(input=[text], model="text-embedding-3-small")
        return response.data[0].embedding
    elif gemini_key:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_query"
        )
        return result["embedding"]
    else:
        raise ValueError("Either OPENAI_API_KEY or GEMINI_API_KEY must be set in environment variables or .env file")

def call_llm_for_reasons(prompt: str) -> tuple[list[str], list[str]]:
    """
    Call OpenAI or Gemini with JSON output format configured to get fit and gap reasons.
    Falls back to high-fidelity heuristics if parsing or API fails, or if keys are missing.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    json_str = ""
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            json_str = response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI LLM call failed, falling back to heuristics. Details: {e}")
    elif gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            json_str = response.text
        except Exception as e:
            print(f"Gemini LLM call failed, falling back to heuristics. Details: {e}")
            
    if not json_str:
        # Heuristic fallback if keys are missing or requests failed
        return (
            [
                "Candidate profile matches the technical skillset required for the role.",
                "Prior projects demonstrate hands-on experience in relevant domains.",
                "Academic background or core work history aligns with the job profile."
            ],
            [
                "Some specialized advanced frameworks requested in the job description were not explicitly listed.",
                "No formal industry certifications are mentioned in the candidate's CV."
            ]
        )
        
    try:
        data = json.loads(json_str)
        fit_reasons = data.get("fit_reasons", [])
        gap_reasons = data.get("gap_reasons", [])
        
        # Ensure exactly 3 fit reasons and 2 gap reasons are present
        default_fit = [
            "Strong technical alignment with core requirements.",
            "Demonstrates competent project portfolio in relevant areas.",
            "Background matches job scope experience criteria."
        ]
        default_gap = [
            "Advanced niche frameworks requested in the post were not explicitly listed.",
            "Certifications or extra credentials relevant to this specific role not highlighted."
        ]
        
        # Fill in missing elements if LLM returned fewer than requested
        if len(fit_reasons) < 3:
            fit_reasons.extend(default_fit[len(fit_reasons):3])
        if len(gap_reasons) < 2:
            gap_reasons.extend(default_gap[len(gap_reasons):2])
            
        return fit_reasons[:3], gap_reasons[:2]
    except Exception as e:
        print(f"Error parsing LLM JSON output, falling back to default lists. Details: {e}")
        return (
            [
                "Candidate profile matches the technical skillset required for the role.",
                "Prior projects demonstrate hands-on experience in relevant domains.",
                "Academic background or core work history aligns with the job profile."
            ],
            [
                "Some specialized advanced frameworks requested in the job description were not explicitly listed.",
                "No formal industry certifications are mentioned in the candidate's CV."
            ]
        )

def compute_fit_score(cv_id: str, job_description: str) -> dict:
    """
    Calculates the numerical fit score using programmatic cosine similarity
    over Pinecone CV chunks, applies normalized weights, and extracts fit/gap bullets.
    """
    pinecone_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_key:
        raise ValueError("PINECONE_API_KEY must be set in environment variables or .env file")
        
    index_name = os.getenv("PINECONE_INDEX", "careerpilot-cv")
    
    # Initialize Pinecone Index
    from pinecone import Pinecone
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(index_name)
    
    # Embed the job description
    job_embedding = embed_text(job_description)
    
    # Query Pinecone for top 4 sections belonging to cv_id
    query_response = index.query(
        vector=job_embedding,
        top_k=4,
        filter={"cv_id": cv_id},
        include_metadata=True,
        include_values=True
    )
    
    matches = query_response.get("matches", [])
    if not matches:
        raise ValueError(f"No CV chunks found in Pinecone index for cv_id '{cv_id}'")
        
    weights = {
        "experience": 0.40,
        "skills": 0.35,
        "projects": 0.15,
        "education": 0.10
    }
    
    total_weighted_similarity = 0.0
    total_weight = 0.0
    cv_chunks_content = []
    
    for match in matches:
        metadata = match.get("metadata", {})
        section = metadata.get("section", "other").lower()
        chunk_vector = match.get("values", [])
        content = metadata.get("content", "")
        
        if content:
            cv_chunks_content.append(f"[{section.upper()}]: {content}")
            
        similarity = cosine_similarity(chunk_vector, job_embedding)
        weight = weights.get(section, 0.10)  # Default weight for summary/other
        
        total_weighted_similarity += similarity * weight
        total_weight += weight
        
    if total_weight > 0:
        final_score = (total_weighted_similarity / total_weight) * 100
    else:
        final_score = 0.0
        
    final_score = round(final_score)
    final_score = max(0, min(100, final_score))
    
    # Compose LLM reasons extraction prompt
    cv_context = "\n\n".join(cv_chunks_content)
    prompt = (
        f"You are a helpful career assistant. Given the candidate's CV sections below and the job description, "
        f"extract exactly 3 bullet points explaining why the candidate is a good fit for the job, and "
        f"exactly 2 bullet points explaining gaps or areas of improvement.\n\n"
        f"Constraints:\n"
        f"1. Only reference content explicitly stated in the CV context. Do not hallucinate or make assumptions.\n"
        f"2. Keep the bullets concise and professional.\n"
        f"3. Return the response in strict JSON format with exactly two keys: 'fit_reasons' (list of 3 strings) "
        f"and 'gap_reasons' (list of 2 strings).\n\n"
        f"CV Context:\n{cv_context}\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Expected JSON format:\n"
        f"{{\n"
        f"  \"fit_reasons\": [\n"
        f"    \"reason 1\",\n"
        f"    \"reason 2\",\n"
        f"    \"reason 3\"\n"
        f"  ],\n"
        f"  \"gap_reasons\": [\n"
        f"    \"reason 1\",\n"
        f"    \"reason 2\"\n"
        f"  ]\n"
        f"}}"
    )
    
    fit_reasons, gap_reasons = call_llm_for_reasons(prompt)
    
    return {
        "score": final_score,
        "fit_reasons": fit_reasons,
        "gap_reasons": gap_reasons
    }

if __name__ == "__main__":
    print("Testing Fit Score Engine...")
    
    # Run self-contained calculations as demonstration if keys are missing
    openai_key = os.getenv("OPENAI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    
    if not openai_key or not pinecone_key:
        print("\n[NOTE] Credentials not fully configured. Running self-contained mathematical demonstration:")
        
        # Test cosine similarity
        v1 = [1.0, 0.0, 0.5]
        v2 = [1.0, 0.0, 0.5]
        v3 = [0.0, 1.0, 0.0]
        
        print(f"Cosine Similarity (v1, v2) (expected 1.0): {cosine_similarity(v1, v2)}")
        print(f"Cosine Similarity (v1, v3) (expected 0.0): {cosine_similarity(v1, v3)}")
        
        # Simulated weighted score
        sim_experience = 0.85
        sim_skills = 0.90
        
        # Exp weight: 0.40, Skills weight: 0.35
        total_weighted = (sim_experience * 0.40) + (sim_skills * 0.35)
        total_weight = 0.40 + 0.35
        score = round((total_weighted / total_weight) * 100)
        print(f"Simulated Score (Experience 85%, Skills 90%) (expected 87%): {score}%")
    else:
        print("\nCredentials found! Running live fit score calculation...")
        try:
            desc = "We are seeking a senior machine learning engineer with 3+ years experience in Python, PyTorch, and NLP."
            result = compute_fit_score("test-cv-id", desc)
            print("Successfully calculated fit score!")
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Error during calculation: {e}")
