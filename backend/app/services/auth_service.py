import hashlib
import hmac
import secrets
import json
import base64
import time
import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db, SessionLocal
from app.models import User, Video, Clip

logger = logging.getLogger(__name__)

SECRET_KEY = "clipmaster_secret_director_token_key_v2_9f83b27c1e5a_secure_rotated"
DEFAULT_DIRECTOR_USERNAME = "Etherus"
DEFAULT_DIRECTOR_EMAIL = "adeyemialex944@gmail.com"
DEFAULT_DIRECTOR_PASSWORD = "Etherus2026!"

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"{salt}${pw_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if not hashed_password or "$" not in hashed_password:
            return False
        salt, pw_hash = hashed_password.split("$", 1)
        calculated = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return hmac.compare_digest(calculated, pw_hash)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def create_access_token(data: Dict[str, Any], expires_days: int = 30) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + (expires_days * 86400)
    payload_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception as e:
        logger.debug(f"Token decode error: {e}")
        return None

def get_current_user_optional(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    user_id = payload["sub"]
    return db.query(User).filter(User.id == user_id).first()

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or not logged in. Please sign in to access Prune Master AI."
        )
    if user.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently PENDING approval by Director Etherus."
        )
    return user

def require_director(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Director privileges required."
        )
    return current_user

def seed_director_and_migrate():
    """
    Ensures users table has Director account 'Etherus' (adeyemialex944@gmail.com).
    Also performs safe lightweight migrations on existing sqlite tables.
    """
    db = SessionLocal()
    try:
        # 1. Safely add user_id column to videos and clips if missing
        try:
            db.execute(text("ALTER TABLE videos ADD COLUMN user_id INTEGER;"))
            db.commit()
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE clips ADD COLUMN user_id INTEGER;"))
            db.commit()
        except Exception:
            db.rollback()

        # 2. Check if Director account exists
        director = db.query(User).filter(
            (User.email == DEFAULT_DIRECTOR_EMAIL) | (User.username == DEFAULT_DIRECTOR_USERNAME)
        ).first()

        if not director:
            logger.info("Seeding Director account: Etherus (adeyemialex944@gmail.com)...")
            director = User(
                username=DEFAULT_DIRECTOR_USERNAME,
                email=DEFAULT_DIRECTOR_EMAIL,
                full_name="Director Etherus",
                hashed_password=hash_password(DEFAULT_DIRECTOR_PASSWORD),
                role="director",
                status="approved"
            )
            db.add(director)
            db.commit()
            db.refresh(director)
        else:
            # Ensure proper director role and approved status
            if director.role != "director" or director.status != "approved":
                director.role = "director"
                director.status = "approved"
                db.commit()

        # 3. Associate any existing unassigned videos and clips to Director
        db.execute(text(f"UPDATE videos SET user_id = {director.id} WHERE user_id IS NULL;"))
        db.execute(text(f"UPDATE clips SET user_id = {director.id} WHERE user_id IS NULL;"))
        db.commit()
        logger.info(f"Director account ready. ID: {director.id}, username: {director.username}")
    except Exception as e:
        logger.error(f"Error in seed_director_and_migrate: {e}", exc_info=True)
    finally:
        db.close()
