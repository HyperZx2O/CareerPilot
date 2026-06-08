import os
import re
from urllib.parse import urlparse
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import requests
from backend.logger import get_logger
from backend.db.supabase_client import get_supabase_user_client

logger = get_logger("auth")

JWKS_URL = os.getenv("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")

_allowed_jwks_domains = {"api.clerk.dev", "clerk.com"}

def _validate_jwks_url(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("Invalid JWKS URL")
    hostname = parsed.hostname or ""
    if not any(hostname == domain or hostname.endswith("." + domain) for domain in _allowed_jwks_domains):
        raise ValueError(f"JWKS URL domain '{hostname}' not allowed")
    if parsed.scheme not in ("https",):
        raise ValueError("JWKS URL must use HTTPS")
    return url

def get_jwks():
    url = _validate_jwks_url(JWKS_URL)
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()

def verify_jwt(token: str):
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token")
        expected_issuer = os.getenv("CLERK_ISSUER", "https://api.clerk.dev")
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=os.getenv("CLERK_AUDIENCE"),
            issuer=expected_issuer,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("JWT decoding failed or JWKS not reachable: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")

http_bearer = HTTPBearer(auto_error=False)

class AuthUser:
    def __init__(self, id: str, email: str, jwt: str | None = None):
        self.id = id
        self.email = email
        self.jwt = jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(http_bearer)):
    env = os.getenv("ENV", "development").lower()

    dev_demo_enabled = os.getenv("DEV_DEMO_USER_ENABLED", "").lower() in ("1", "true", "yes")

    # Dev bypass: explicit "Bearer dev:<user_id>" marker from the frontend when
    # the user is not signed in. Must be enabled by DEV_DEMO_USER_ENABLED=1.
    if (
        credentials
        and dev_demo_enabled
        and env != "production"
        and isinstance(credentials.credentials, str)
        and credentials.credentials.startswith("dev:")
    ):
        dev_user_id = credentials.credentials[4:] or "demo_user_123"
        logger.info(f"Dev demo token provided — using '{dev_user_id}' (dev only)")
        return AuthUser(id=dev_user_id, email=f"{dev_user_id}@careerpilot.ai", jwt=None)

    if not credentials:
        if env != "production" and dev_demo_enabled:
            logger.info("No token provided — using default demo user (dev only)")
            return AuthUser(id="demo_user_123", email="demo@careerpilot.ai", jwt=None)
        raise HTTPException(status_code=401, detail="Authentication required")

    token = credentials.credentials
    payload = verify_jwt(token)
    return AuthUser(id=payload.get("sub", ""), email=payload.get("email", ""), jwt=token)


async def get_user_supabase_client(user: AuthUser = Depends(get_current_user)):
    """FastAPI dependency that provides a Supabase client scoped to the authenticated user."""
    return get_supabase_user_client(user.jwt)


def scoped_client(user: AuthUser):
    """Helper to get a user-scoped Supabase client outside of FastAPI dependencies."""
    return get_supabase_user_client(user.jwt)

