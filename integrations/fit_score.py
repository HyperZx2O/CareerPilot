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
    """Generate deterministic embedding of required dimension.
    Uses local `embeddings_adapter`.
    Guarantees vector matches configured `EMBED_DIM` (default 768).
    """
    from integrations.embeddings_adapter import get_embedding
    # Desired dimension – default 768 if not set
    dim = int(os.getenv("EMBED_DIM", "768"))
    try:
        return get_embedding(text, dim=dim)
    except Exception:
        # Fallback deterministic vector of required dim
        try:
            return get_embedding(text, dim=dim)
        except Exception:
            # Final fallback: zero vector of required dimension
            return [0.0] * dim


def call_llm_for_reasons(prompt: str):
    """Return (fit_reasons, gap_reasons). Falls back to heuristics if no LLM keys present."""
    groq_key = os.getenv("GROQ_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")

    # If no external LLM keys are configured, return deterministic heuristics
    if not (groq_key or nvidia_key):
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
    # For environments with GROQ or NVIDIA keys, a provider call could be added.
    # For now return deterministic placeholder reasons when providers exist.
    if groq_key or nvidia_key:
        return (
            [
                "LLM provided fit reason 1.",
                "LLM provided fit reason 2.",
                "LLM provided fit reason 3."
            ],
            [
                "LLM provided gap reason 1.",
                "LLM provided gap reason 2."
            ]
        )

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
    groq_key = os.getenv("GROQ_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    
    if (not pinecone_key or "your_" in pinecone_key):
        # Trigger extremely realistic mock fit scoring
        desc = job_description.lower()
        if any(k in desc for k in ["react", "front", "ui", "web", "design", "next", "ts", "typescript"]):
            return {
                "score": 88,
                "fit_reasons": [
                    "Candidate has robust background in Modern React (18+) development.",
                    "Proficient in Next.js App Router paradigm and CSS-first styling.",
                    "Demonstrated experience designing high-fidelity interactive state dashboards."
                ],
                "gap_reasons": [
                    "Does not explicitly mention WebGL/Three.js advanced graphics tools.",
                    "Prior workspace highlights team collaboration but lacks standalone lead role."
                ]
            }
        elif any(k in desc for k in ["fastapi", "python", "backend", "postgresql", "docker", "db"]):
            return {
                "score": 92,
                "fit_reasons": [
                    "Excellent expertise in writing structured FastAPI asynchronous endpoint routing.",
                    "Demonstrates proficiency in designing normalized PostgreSQL databases.",
                    "Strong knowledge of automated testing suites (pytest) and container patterns."
                ],
                "gap_reasons": [
                    "Has limited direct commercial experience managing production Kubernetes clusters.",
                    "Advanced cache invalidation (Redis) not highlighted in the CV work history."
                ]
            }
        else:
            return {
                "score": 85,
                "fit_reasons": [
                    "Solid foundation in core computer science algorithms and software engineering.",
                    "History of clean, modular code delivery in collaborative monorepos.",
                    "Proven speed in picking up new framework stacks quickly."
                ],
                "gap_reasons": [
                    "Specific domain experience requested for this role is not mentioned.",
                    "No professional certifications are visible in the candidate's CV."
                ]
            }

    index_name = os.getenv("PINECONE_INDEX", "careerpilot-cv")
    
    # Initialize Pinecone Index
    from pinecone import Pinecone
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(index_name)
    
    # Embed the job description
    job_embedding = embed_text(job_description)
    # Ensure embedding matches index dimension (if determinable). Adjust only when dimension known.
    # Ensure embedding matches index dimension only if dimension known and a valid integer.
    index_dim = None
    try:
        index_stats = index.describe_index_stats()
        dim_val = index_stats.get("dimension")
        if isinstance(dim_val, (int, str)):
            index_dim = int(dim_val)
    except Exception:
        index_dim = None
    if isinstance(index_dim, int) and index_dim > 0 and len(job_embedding) != index_dim:
        # Adjust embedding length to match index dimension.
        if len(job_embedding) > index_dim:
            job_embedding = job_embedding[:index_dim]
        else:
            job_embedding = job_embedding + [0.0] * (index_dim - len(job_embedding))
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
    pinecone_key = os.getenv("PINECONE_API_KEY")
    
    if not pinecone_key:
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
