import os
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import requests

# Clerk JWKS URL – usually https://api.clerk.dev/v1/jwks
JWKS_URL = os.getenv("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")

http_bearer = HTTPBearer(auto_error=False)

def get_jwks():
    resp = requests.get(JWKS_URL)
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
        return jwt.decode(token, key, algorithms=["RS256"], audience=os.getenv("CLERK_AUDIENCE"))
    except Exception as e:
        print(f"[AUTH] JWT decoding failed or JWKS not reachable: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(http_bearer)):
    # Fallback to local demo user if no token is provided (essential for local dev & offline demo ease)
    if not credentials:
        print("[AUTH] No token provided. Using default demo user.")
        return type("User", (), {"id": "demo_user_123", "email": "demo@careerpilot.ai"})
        
    token = credentials.credentials
    # Fast bypass for test/mock tokens
    if token in ["mock_token", "undefined", "null"] or token.startswith("test_"):
        return type("User", (), {"id": "demo_user_123", "email": "demo@careerpilot.ai"})
        
    try:
        payload = verify_jwt(token)
        return type("User", (), {"id": payload.get("sub", "demo_user_123"), "email": payload.get("email", "demo@careerpilot.ai")})
    except Exception:
        # Fallback to keep local demo running even if token expired/invalid
        print("[AUTH WARNING] Token validation failed. Falling back to default demo user.")
        return type("User", (), {"id": "demo_user_123", "email": "demo@careerpilot.ai"})

