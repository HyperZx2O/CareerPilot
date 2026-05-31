import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the project root .env BEFORE any other imports
# that depend on os.getenv (e.g., supabase_client.py reads DATABASE_URL at import time)
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Setup system paths to resolve submodules
root_path = _project_root
sys.path.append(str(root_path))
sys.path.append(str(root_path / "integrations"))


# Import Routers
from backend.routers.tracker import router as tracker_router
from backend.routers.cv import router as cv_router
from backend.routers.chat import router as chat_router

try:
    from backend.routers.jobs import router as jobs_router
except ImportError:
    jobs_router = None  # integrations deps (openai, pinecone…) not installed

app = FastAPI(
    title="CareerPilot Backend API",
    description="FastAPI Backend for CareerPilot Job Hunting and RAG Platform",
    version="1.0.0"
)

# CORS configuration to allow local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all origins for easy hackathon demo connectivity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def health_check():
    """Simple API health check endpoint."""
    return {"status": "ok", "environment": "development"}

from backend.routers.settings import router as settings_router

# Include Routers
if jobs_router is not None:
    app.include_router(jobs_router)
app.include_router(tracker_router)
app.include_router(cv_router)
app.include_router(chat_router)
app.include_router(settings_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
