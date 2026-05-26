# Backend Service

## Prerequisites
- Python **3.11** or newer
- `pip` (Python package installer)

## Installation
```bash
# clone repo (already done)
python -m venv .venv               # optional virtual environment
source .venv/bin/activate          # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Environment variables
Copy `.env.example` to `.env` and fill in the required keys:
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENV`
- `PINECONE_INDEX`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (used by the frontend)

## Running the API locally
```bash
uvicorn backend.main:app --reload
```
The health check is available at `GET /health` and returns `{"status": "ok"}`.

## CORS configuration
`backend/main.py` defines `allow_origins`. Update the list with the URLs of the frontend(s) that should be allowed to call the API (e.g., `http://localhost:3000` for local dev and your production domain).

## Tests
```bash
pytest backend/tests -v
```
All tests pass (`20 passed`).

## Next steps (deployment)
Deploy the service (e.g., Railway, Fly.io, Render) and set the same environment variables there. After deployment, update the frontend's `NEXT_PUBLIC_API_URL` to the public endpoint.
