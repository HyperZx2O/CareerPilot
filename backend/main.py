import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Setup system paths to resolve submodules
root_path = Path(__file__).resolve().parent.parent
sys.path.append(str(root_path))
sys.path.append(str(root_path / "integrations"))

# Import database variables to initialize local schema on startup
from backend.db.supabase_client import Base, engine, DATABASE_URL

# Import Routers
from backend.routers.tracker import router as tracker_router

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

@app.on_event("startup")
async def startup_event():
    """
    FastAPI startup hook.
    If running in local development mode with SQLite, automatically creates the required tables.
    """
    if "sqlite" in DATABASE_URL:
        print(f"Initializing local SQLite schema at: {DATABASE_URL}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

@app.get("/health", tags=["System"])
def health_check():
    """Simple API health check endpoint."""
    return {"status": "ok", "environment": "development"}

# Include Routers
if jobs_router is not None:
    app.include_router(jobs_router)
app.include_router(tracker_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
