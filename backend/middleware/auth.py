"""
Clerk JWT authentication middleware.

Verifies the ``Authorization: Bearer <token>`` header on every protected
request.  Extracts ``user_id`` (Clerk's ``sub`` claim) and attaches it to
``request.state.user_id``.

In test mode (no CLERK_JWT_PUBLIC_KEY or CLERK_JWKS_URL set) the header
is accepted as-is and ``user_id`` defaults to ``"test_user"``, preserving
backward compatibility with the existing test suite.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# JWT verification
# ---------------------------------------------------------------------------

def _verify_token(token: str) -> dict:
    """
    Decode and verify a Clerk-issued JWT.

    Tries three strategies in order:
    1. Verify with CLERK_JWT_PUBLIC_KEY (PEM string in env var).
    2. Fetch JWKS from CLERK_JWKS_URL and verify.
    3. Test mode fallback — accept any non-empty token, return dummy claims.
    """
    public_key_pem = os.getenv("CLERK_JWT_PUBLIC_KEY", "")
    jwks_url = os.getenv("CLERK_JWKS_URL", "")

    if public_key_pem:
        try:
            import jwt as pyjwt
            payload = pyjwt.decode(
                token,
                public_key_pem,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    if jwks_url:
        try:
            import jwt as pyjwt
            from jwt import PyJWKClient
            jwks_client = PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    # ── Test / local fallback ────────────────────────────────────────────────
    # When neither key nor JWKS URL is configured we trust any bearer token
    # and use its value as a dummy user_id (allows tests to pass without
    # a real Clerk account).
    if token:
        return {"sub": "test_user", "email": "test@example.com"}

    raise HTTPException(status_code=401, detail="Missing authentication credentials")


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that extracts and validates the Clerk JWT.

    Usage::

        @router.get("/protected")
        async def endpoint(user: dict = Depends(get_current_user)):
            user_id = user["sub"]
    """
    credentials: Optional[HTTPAuthorizationCredentials] = await _bearer_scheme(request)
    
    public_key_pem = os.getenv("CLERK_JWT_PUBLIC_KEY", "")
    jwks_url = os.getenv("CLERK_JWKS_URL", "")

    # If in test/development mode (no keys configured)
    if not public_key_pem and not jwks_url:
        token = credentials.credentials if (credentials and credentials.credentials) else "test-token"
        payload = _verify_token(token)
        request.state.user_id = payload.get("sub", "test_user")
        return payload

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    payload = _verify_token(credentials.credentials)
    # Attach to request state for middleware logging
    request.state.user_id = payload.get("sub", "unknown")
    return payload
