# System Design Document

## Data flow
- User uploads CV via `POST /api/cv/upload`.
- Backend saves file temporarily, extracts raw text (PDF/DOCX).
- Extracted text is chunked by CV sections (Experience, Education, Skills, Projects, Summary).
- Each chunk is embedded using OpenAI `text-embedding-3-small`.
- Embeddings are upserted into a Pinecone index keyed by `<cv_id>-<section>`.
- For a chat query, the query string is embedded.
- Pinecone returns the most relevant CV chunks (filter by `cv_id`).
- Retrieved chunks are formatted into a CV‑context string.
- Context string and the user query are sent to OpenAI `gpt-4o-mini` (or appropriate model) with a strict system prompt.
- LLM generates a response grounded in the CV context and returns it to the client.

## Architecture diagram
```
+----------------+      +-----------------+      +-----------------+
| Frontend (UI) | ---> | FastAPI backend | ---> | OpenAI LLM API |
+----------------+      +-----------------+      +-----------------+
                            |   ^
                            |   |
                            v   |
               +-----------------------+---------------------+
               |   Services (embeddings, rag, cover_letter,   |
               |   roadmap, fit_score)                        |
               +-----------------------+---------------------+
                            |   ^
                            |   |
            +---------------+   +-------------------+
            |                                   |
            v                                   v
   +----------------+                  +-----------------+
   | Pinecone Index |                  | Supabase DB    |
   +----------------+                  +-----------------+
```

## Scaling to 10,000 users
- **Pinecone**: Use a `pod` tier with sufficient replicas (e.g., 3‑pod S1). Capacity scales to millions of vectors; 10k CVs ≈ 50 k vectors (5 sections per CV) well within limits.
- **OpenAI rate limits**: Assume 1,000 requests/minute for embeddings and completions. Batch embedding calls for multiple sections; implement exponential back‑off on 429 responses.
- **Supabase**: Deploy PgBouncer connection pooler; configure max connections ~200 to handle concurrent API calls.
- **FastAPI horizontal scaling**: Run multiple uvicorn workers behind a load balancer (e.g., Nginx or Kubernetes Ingress). Each worker handles I/O‑bound tasks; autoscale based on CPU/RAM.
- **Estimated traffic**: 10k users × 20 chat queries/month ≈ 200 k queries/month ≈ 2.8 k queries/day → well within 1,000/minute limits.

## Estimated cost per user/month
| Item                              | Assumptions                               | Cost per unit                | Units per user | Monthly cost per user |
|-----------------------------------|-------------------------------------------|------------------------------|----------------|----------------------|
| CV embedding (initial upload)    | 3,000 tokens per CV                       | $0.00002 per 1k tokens       | 1              | $0.00006             |
| Query embedding (chat)            | 500 tokens per query                      | $0.00002 per 1k tokens       | 20             | $0.00020             |
| Pinecone index (S1 pod)           | Fixed pod cost                            | $0.069 per hour (approx)      | 730 hrs        | $50.37 (shared)      |
| Supabase storage & DB            | 5 GB data, small traffic                 | $5 per month                 | 1               | $5.00 (shared)       |
| OpenAI completion (GPT‑4o‑mini)   | 500 tokens per response (≈250 input/250 output) | $0.00015 per 1k tokens | 20 * 0.5 = 10k tokens | $0.0015              |
| **Total per user (approx.)**     | —                                         | —                            | —              | **$5.26** (most cost is shared infrastructure) |

## Key bottlenecks
- **Pinecone query latency (~100 ms)** – mitigated by caching recent query results and pre‑warming the index.
- **OpenAI embedding on every chat query** – mitigate with embedding‑cache: store query embeddings for identical queries; batch multiple sections per request.
- **Cold‑start on free‑tier deployment** – keep at least one FastAPI worker alive (e.g., ping endpoint) to avoid first‑request latency.
- **Supabase connection pool saturation** – monitor pool usage; increase max connections or add read replicas during peak load.
