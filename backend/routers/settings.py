import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"]
)

# Project root path where the .env is located
_project_root = Path(__file__).resolve().parent.parent.parent
ENV_PATH = _project_root / ".env"

class SettingsModel(BaseModel):
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = ""
    PINECONE_ENV: str = ""
    GROQ_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

# Keys safe to expose via GET (non-secret configuration)
NONSENSITIVE_KEYS = {"SUPABASE_URL", "PINECONE_INDEX", "PINECONE_ENV", "ADZUNA_APP_ID"}

@router.get("")
def get_settings():
    """
    Returns non-sensitive configuration values.
    Secrets and API keys are never exposed via this endpoint.
    """
    settings = {}
    for key in NONSENSITIVE_KEYS:
        val = os.getenv(key, "")
        settings[key] = val
    return settings

@router.post("")
def update_settings(payload: SettingsModel, x_admin_key: str | None = Header(None)):
    """
    Updates the .env file with the provided values, reloads environment variables.
    """
    try:
        # Require admin key to update settings
        env = os.getenv("ENV", "development").lower()
        if env == "production":
            # Disallow updating .env via HTTP in production
            raise HTTPException(status_code=403, detail="Updating settings via HTTP is disabled in production")

        admin_key = os.getenv("SETTINGS_ADMIN_KEY")
        if not admin_key:
            raise HTTPException(status_code=500, detail="Server not configured to accept settings updates")
        if x_admin_key != admin_key:
            raise HTTPException(status_code=403, detail="Forbidden: invalid admin key")
        # Whitelisted keys allowed to be updated via this endpoint
        ALLOWED_KEYS = {"DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY", "PINECONE_API_KEY", "PINECONE_INDEX", "PINECONE_ENV", "GROQ_API_KEY", "NVIDIA_API_KEY", "ADZUNA_APP_ID", "ADZUNA_APP_KEY"}
        # Filter payload to allowed keys only
        new_values = {k: v for k, v in payload.model_dump().items() if k in ALLOWED_KEYS}
        if not new_values:
            raise HTTPException(status_code=400, detail="No allowed settings provided.")

        # Read existing .env lines
        existing_lines = []
        if ENV_PATH.exists():
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                existing_lines = f.readlines()

        # Parse existing key-value pairs
        env_dict = {}
        for line in existing_lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                k, v = stripped.split("=", 1)
                env_dict[k.strip()] = line  # preserve exact line including comments or formatting

        # Update or append new keys
        updated_lines = []
        keys_written = set()

        # Rewrite .env preserving structure, comments, and spacing
        for line in existing_lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                k, v = stripped.split("=", 1)
                k_clean = k.strip()
                if k_clean in new_values:
                    # Replace with the new value
                    val = str(new_values[k_clean]).strip()
                    updated_lines.append(f"{k_clean}={val}\n")
                    keys_written.add(k_clean)
                    os.environ[k_clean] = val
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)

        # Append any new keys not originally present
        for k_clean, val in new_values.items():
            if k_clean not in keys_written:
                val_str = str(val).strip()
                updated_lines.append(f"{k_clean}={val_str}\n")
                os.environ[k_clean] = val_str

        # Write back to .env
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.writelines(updated_lines)

        # Re-initialize/reload dotenv
        load_dotenv(ENV_PATH, override=True)

        return {"status": "success", "message": "Settings updated and reloaded successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
