import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
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

@router.get("")
def get_settings():
    """
    Reads the current values from the .env file.
    """
    settings = {}
    
    # Pre-populate keys with empty strings
    keys_to_read = [
        "DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY",
        "PINECONE_API_KEY", "PINECONE_INDEX", "PINECONE_ENV",
        "GROQ_API_KEY", "NVIDIA_API_KEY",
        "ADZUNA_APP_ID", "ADZUNA_APP_KEY"
    ]
    
    for key in keys_to_read:
        settings[key] = os.getenv(key, "")
        
    return settings

@router.post("")
def update_settings(payload: SettingsModel):
    """
    Updates the .env file with the provided values, reloads environment variables.
    """
    try:
        new_values = payload.model_dump()
        
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
                env_dict[k.strip()] = line # preserve exact line including comments or formatting
                
        # Update or append new keys
        updated_lines = []
        keys_written = set()
        
        # We rewrite .env line by line to preserve structure, comments, and spacing
        for line in existing_lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                k, v = stripped.split("=", 1)
                k_clean = k.strip()
                if k_clean in new_values:
                    # Replace with the new value
                    val = new_values[k_clean].strip()
                    updated_lines.append(f"{k_clean}={val}\n")
                    keys_written.add(k_clean)
                    # Also dynamically update the active environment process immediately
                    os.environ[k_clean] = val
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
                
        # Add keys that weren't in the .env originally
        for k_clean, val in new_values.items():
            if k_clean not in keys_written:
                val_str = val.strip()
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
