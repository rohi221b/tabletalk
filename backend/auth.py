from __future__ import annotations
import logging
from typing import Optional
from fastapi import Header, HTTPException, status
import config

logger = logging.getLogger("auth")

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extracts the authenticated user ID from Authorization header.
    In production with Firebase: verifies Firebase ID token.
    In dev/demo mode: accepts bearer token as user ID directly.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
        )

    token = parts[1]

    # If Firebase Admin is initialized, try to verify token
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        # If dev mode or fallback is allowed:
        if config.DEV_MODE:
            # Token itself can act as UID (e.g. mock-user-1, anonymous-uid)
            return token
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
