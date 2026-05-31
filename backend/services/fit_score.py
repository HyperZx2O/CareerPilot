import numpy as np
from typing import List
from backend.models.additional_models import CVChunk, Job

def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    if a.size == 0 or b.size == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def fit_score_for_job(cv_chunks: List[CVChunk], job: Job) -> int:
    # placeholder: average similarity across all chunks
    # Assume each chunk has 'embedding' attribute (list of floats) – mock
    similarities = []
    for chunk in cv_chunks:
        # In real code retrieve embedding from ChromaDB; here dummy zero vector
        embed = []
        job_embed = []
        sim = compute_cosine_similarity(embed, job_embed)
        similarities.append(sim)
    if not similarities:
        return 0
    avg = sum(similarities) / len(similarities)
    return int(avg * 100)
