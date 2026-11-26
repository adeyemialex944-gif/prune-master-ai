import datetime
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session

from app.config import TEMP_DIR, UPLOADS_DIR
from app.database import get_db
from app.models import User, Video, Clip, IPTrialRecord, SystemSetting
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    UserProfileUpdateRequest,
    AuthResponse,
    UserStatusUpdateRequest,
    DirectorGrantRequest,
    ToggleMonetizationRequest,
    ForgotPasswordRequest,
    DirectorResetPasswordRequest
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_director,
    DEFAULT_DIRECTOR_EMAIL,
    DEFAULT_DIRECTOR_USERNAME
)

router = APIRouter(tags=["Authentication & Director Console"])

def get_client_ip(request: Request) -> str:
    """
    Extracts the user's real client IP address, supporting Cloudflare tunnel and proxy headers.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()
    x_forwarded = request.headers.get("x-forwarded-for")
    if x_forwarded and x_forwarded.strip():
        return x_forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

@router.post("/api/auth/register")
def register_user(payload: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    User registration endpoint with IP tracking and default 10 free trial credits.
    If the email or username matches the Director (Etherus / adeyemialex944@gmail.com),
    the account is created as approved Director with unlimited credits.
    Otherwise, account is created with status='pending' requiring Director approval.
    """
    client_ip = get_client_ip(request)
    clean_username = payload.username.strip()
    clean_email = payload.email.strip().lower()
    clean_name = payload.full_name.strip()

    if not clean_username or not clean_email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email, and password are required."
        )

    # Check for existing email or username
    existing = db.query(User).filter(
        (User.email == clean_email) | (User.username.ilike(clean_username))
    ).first()

    if existing:
        if existing.email == clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{clean_username}' is already taken. Please choose another."
            )

    is_director = (
        clean_email == DEFAULT_DIRECTOR_EMAIL.lower() or
        clean_username.lower() == DEFAULT_DIRECTOR_USERNAME.lower()
    )

    user_role = "director" if is_director else "user"
    user_status = "approved" if is_director else "pending"
    initial_credits = 9999 if is_director else 10

    new_user = User(
        username=clean_username,
        email=clean_email,
        full_name=clean_name or clean_username,
        hashed_password=hash_password(payload.password),
        role=user_role,
        status=user_status,
        trial_credits=initial_credits,
        trial_credits_used=0,
        is_pro=is_director,
        registration_ip=client_ip,
        last_ip=client_ip
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user_status == "approved":
        token = create_access_token({"sub": new_user.id, "role": new_user.role})
        return {
            "status": "approved",
            "message": "Director account created successfully!",
            "token": token,
            "user": UserResponse.model_validate(new_user)
        }
    else:
        return {
            "status": "pending",
            "message": f"Your account has been created with 10 free trial credits and is waiting for approval by Director Etherus ({DEFAULT_DIRECTOR_EMAIL}).",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "status": "pending",
                "trial_credits": 10
            }
        }

@router.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    User login endpoint with IP tracking. Checks credentials and verifies account is 'approved'.
    """
    clean_login = payload.login.strip().lower()
    user = db.query(User).filter(
        (User.email == clean_login) | (User.username.ilike(clean_login))
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password. Please try again."
        )

    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account '{user.username}' is currently PENDING approval by Director Etherus. Please wait for access to be granted from the Director dashboard."
        )

    if user.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account access has been declined by the Director."
        )

    user.last_login = datetime.datetime.utcnow()
    user.last_ip = get_client_ip(request)
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return AuthResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )

@router.post("/api/auth/forgot-password")
def forgot_password_recovery(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Account password recovery endpoint.
    Verifies user identity matching email/username with their registered full name,
    then updates their password and returns an auth token if approved.
    """
    clean_login = payload.login.strip().lower()
    clean_full_name = payload.full_name.strip().lower()
    new_password = payload.new_password.strip()

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    user = db.query(User).filter(
        (User.email == clean_login) | (User.username.ilike(clean_login))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found matching that email or username. Please check your spelling or sign up."
        )

    if user.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended or declined by Director Etherus."
        )

    # Security check: verify registered full name matches
    user_stored_name = (user.full_name or "").strip().lower()
    if user_stored_name != clean_full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Identity verification failed. The Full Name does not match our registration records for @{user.username}. If you cannot recall your name as registered, please request Director Etherus to reset it from the Director Console."
        )

    # Update password
    user.hashed_password = hash_password(new_password)
    user.last_ip = get_client_ip(request)
    db.commit()
    db.refresh(user)

    if user.status == "pending":
        return {
            "status": "pending_approval",
            "message": f"Password reset successfully for @{user.username}! However, your account is still pending Director Etherus approval before you can sign in.",
            "token": None,
            "user": None
        }

    # User is approved: issue token for seamless instant access
    user.last_login = datetime.datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "status": "success",
        "message": f"Password successfully reset! Welcome back, {user.full_name}.",
        "token": token,
        "user": UserResponse.model_validate(user)
    }

@router.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    """
    return current_user

@router.put("/api/auth/profile", response_model=UserResponse)
def update_user_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates user profile details (full name, avatar, Gemini Pro key, Gemini model selection).
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip()
    if payload.gemini_api_key is not None:
        current_user.gemini_api_key = payload.gemini_api_key.strip()
    if payload.gemini_model is not None:
        current_user.gemini_model = payload.gemini_model.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/api/auth/avatar")
def upload_user_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a custom profile picture image for the user profile.
    """
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    avatar_name = f"avatar_{current_user.id}_{uuid.uuid4().hex[:6]}{ext}"
    avatar_path = TEMP_DIR / avatar_name
    with open(avatar_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    current_user.avatar_url = f"/media/temp/{avatar_name}"
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": current_user.avatar_url, "user": UserResponse.model_validate(current_user)}

def is_monetization_enabled(db: Session) -> bool:
    """
    Checks if global monetization & paywalls are active.
    Defaults to False (100% Free Launch Mode) if not set or set to 'false'.
    """
    setting = db.query(SystemSetting).filter(SystemSetting.key == "monetization_enabled").first()
    if not setting:
        return False
    return setting.value.strip().lower() == "true"

@router.get("/api/auth/trial-status")
def get_user_trial_status(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns the current user/IP trial usage (10 free trials, remaining credits, IP tracking, VIP status, global monetization switch status).
    """
    client_ip = get_client_ip(request)
    monetization_active = is_monetization_enabled(db)

    # When monetization is disabled, everyone gets free unlimited renders to build user trust
    if not monetization_active:
        if current_user:
            return {
                "is_logged_in": True,
                "username": current_user.username,
                "role": current_user.role,
                "is_pro": True,
                "is_unlimited": True,
                "monetization_enabled": False,
                "trial_credits": 9999,
                "trials_remaining": 9999,
                "trial_credits_used": current_user.trial_credits_used or 0,
                "max_trials": 9999,
                "client_ip": client_ip,
                "avatar_url": current_user.avatar_url,
                "gemini_model": current_user.gemini_model or "gemini-flash-lite-latest"
            }
        return {
            "is_logged_in": False,
            "username": "Creator (Free Launch Mode)",
            "role": "guest",
            "is_pro": True,
            "is_unlimited": True,
            "monetization_enabled": False,
            "trial_credits": 9999,
            "trials_remaining": 9999,
            "trial_credits_used": 0,
            "max_trials": 9999,
            "client_ip": client_ip,
            "avatar_url": None,
            "gemini_model": "gemini-flash-lite-latest"
        }

    # Monetization IS active -> enforce trial limits
    if current_user:
        is_unlimited = current_user.role == "director" or bool(current_user.is_pro)
        return {
            "is_logged_in": True,
            "username": current_user.username,
            "role": current_user.role,
            "is_pro": current_user.is_pro,
            "is_unlimited": is_unlimited,
            "monetization_enabled": True,
            "trial_credits": current_user.trial_credits if not is_unlimited else 9999,
            "trials_remaining": current_user.trial_credits if not is_unlimited else 9999,
            "trial_credits_used": current_user.trial_credits_used or 0,
            "max_trials": 10,
            "client_ip": client_ip,
            "avatar_url": current_user.avatar_url,
            "gemini_model": current_user.gemini_model or "gemini-flash-lite-latest"
        }
    # Guest / IP-based
    record = db.query(IPTrialRecord).filter(IPTrialRecord.ip_address == client_ip).first()
    if record and record.is_unlimited:
        return {
            "is_logged_in": False,
            "username": "VIP Unlimited Guest",
            "role": "guest",
            "is_pro": True,
            "is_unlimited": True,
            "monetization_enabled": True,
            "trial_credits": 9999,
            "trials_remaining": 9999,
            "trial_credits_used": record.trials_used,
            "max_trials": 9999,
            "client_ip": client_ip,
            "avatar_url": None,
            "gemini_model": "gemini-flash-lite-latest"
        }
    trials_used = record.trials_used if record else 0
    max_trials = 10
    remaining = max(0, max_trials - trials_used)
    return {
        "is_logged_in": False,
        "username": "Guest",
        "role": "guest",
        "is_pro": False,
        "is_unlimited": False,
        "monetization_enabled": True,
        "trial_credits": remaining,
        "trials_remaining": remaining,
        "trial_credits_used": trials_used,
        "max_trials": max_trials,
        "client_ip": client_ip,
        "avatar_url": None,
        "gemini_model": "gemini-flash-lite-latest"
    }

# =============================================================================
# DIRECTOR CONSOLE ENDPOINTS (Restricted to Director)
# =============================================================================

@router.get("/api/director/users")
def list_users_for_director(
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Returns all registered users with their video and clip counts for Director review.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    user_list = []
    pending_count = 0

    for u in users:
        v_count = db.query(Video).filter(Video.user_id == u.id).count()
        c_count = db.query(Clip).filter(Clip.user_id == u.id).count()
        if u.status == "pending":
            pending_count += 1

        user_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "status": u.status,
            "is_pro": bool(u.is_pro),
            "trial_credits": u.trial_credits,
            "trial_credits_used": u.trial_credits_used or 0,
            "registration_ip": u.registration_ip,
            "last_ip": u.last_ip,
            "gemini_model": u.gemini_model or "gemini-flash-lite-latest",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "video_count": v_count,
            "clip_count": c_count,
            "is_director": u.role == "director"
        })

    total_global_clips = db.query(Clip).count()
    return {
        "pending_count": pending_count,
        "total_count": len(user_list),
        "total_global_clips": total_global_clips,
        "users": user_list
    }

@router.post("/api/director/users/{user_id}/grant-unlimited")
def grant_user_unlimited_vip(
    user_id: int,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Grants unlimited VIP access (is_pro = True, trial_credits = 999999, status = 'approved') to a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_pro = True
    user.trial_credits = 999999
    user.status = "approved"
    db.commit()
    return {"status": "ok", "message": f"👑 Unlimited VIP access granted to {user.username} ({user.email})."}

@router.post("/api/director/users/{user_id}/revoke-unlimited")
def revoke_user_unlimited_vip(
    user_id: int,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Revokes unlimited access from a user, setting them back to standard 10 free trials.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot downgrade your own Director account.")

    user.is_pro = False
    user.trial_credits = 10
    db.commit()
    return {"status": "ok", "message": f"Unlimited VIP access revoked for {user.username}. Reset to standard tier."}

@router.post("/api/director/grant-by-identifier")
def grant_unlimited_by_identifier(
    payload: DirectorGrantRequest,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Grants unlimited VIP access by username, email, or client IP address.
    """
    raw_ident = payload.identifier.strip()
    if not raw_ident:
        raise HTTPException(status_code=400, detail="Please provide a valid username, email, or IP address.")

    # 1. Search existing user by email or username
    user = db.query(User).filter(
        (User.email.ilike(raw_ident)) | (User.username.ilike(raw_ident))
    ).first()

    if user:
        user.is_pro = True
        user.trial_credits = 999999
        user.status = "approved"
        db.commit()
        return {
            "status": "ok",
            "type": "user",
            "target": user.username,
            "message": f"👑 Granted Unlimited VIP Access to User: '{user.username}' ({user.email})!"
        }

    # 2. Otherwise treat as IP address or IP pattern
    ip_rec = db.query(IPTrialRecord).filter(IPTrialRecord.ip_address == raw_ident).first()
    if not ip_rec:
        ip_rec = IPTrialRecord(
            ip_address=raw_ident,
            trials_used=0,
            max_trials=999999,
            is_unlimited=True
        )
        db.add(ip_rec)
    else:
        ip_rec.is_unlimited = True
        ip_rec.max_trials = 999999

    db.commit()
    return {
        "status": "ok",
        "type": "ip",
        "target": raw_ident,
        "message": f"👑 Granted Unlimited VIP Access to IP: '{raw_ident}'!"
    }

@router.post("/api/director/users/{user_id}/approve")
def approve_user_access(
    user_id: int,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Grants access to a pending user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "approved"
    db.commit()
    return {"status": "ok", "message": f"Access granted for {user.username} ({user.email})."}

@router.post("/api/director/users/{user_id}/reject")
def reject_user_access(
    user_id: int,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Declines or revokes access for a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot reject your own Director account.")

    user.status = "rejected"
    db.commit()
    return {"status": "ok", "message": f"Access rejected/suspended for {user.username}."}

@router.delete("/api/director/users/{user_id}")
def delete_user_by_director(
    user_id: int,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Deletes a user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own Director account.")

    db.delete(user)
    db.commit()
    return {"status": "ok", "message": f"User {user.username} deleted."}

@router.get("/api/director/monetization-status")
def get_monetization_status_for_director(
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Returns the current global monetization & subscription status for Director Etherus.
    """
    monetization_active = is_monetization_enabled(db)
    setting = db.query(SystemSetting).filter(SystemSetting.key == "monetization_enabled").first()
    return {
        "monetization_enabled": monetization_active,
        "description": "When disabled, all users enjoy 100% free unlimited exports to build community trust. When enabled, 10-trial limit and subscription paywall are enforced.",
        "updated_at": setting.updated_at.isoformat() if setting and setting.updated_at else None
    }

@router.post("/api/director/toggle-monetization")
def toggle_monetization_for_director(
    payload: ToggleMonetizationRequest,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Toggles global monetization on or off. Restricted exclusively to Director Etherus.
    """
    setting = db.query(SystemSetting).filter(SystemSetting.key == "monetization_enabled").first()
    if not setting:
        setting = SystemSetting(
            key="monetization_enabled",
            value=str(payload.enabled).lower(),
            description="Global monetization & paywall switch",
            updated_at=datetime.datetime.utcnow()
        )
        db.add(setting)
    else:
        setting.value = str(payload.enabled).lower()
        setting.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(setting)

    state_text = "ENABLED (10-trial limit & subscriptions active)" if payload.enabled else "DISABLED (100% Free Launch Mode • Unlimited access for everyone)"
    return {
        "message": f"Global monetization is now {state_text}.",
        "monetization_enabled": payload.enabled,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
    }

@router.post("/api/director/users/{user_id}/reset-password")
def reset_user_password_by_director(
    user_id: int,
    payload: DirectorResetPasswordRequest,
    current_user: User = Depends(require_director),
    db: Session = Depends(get_db)
):
    """
    Allows Director Etherus to reset the password for any creator directly from the Director Console.
    """
    new_password = payload.new_password.strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(new_password)
    db.commit()
    return {
        "status": "ok",
        "message": f"Password for @{user.username} ({user.email}) successfully updated to: '{new_password}'.",
        "user_id": user.id,
        "username": user.username
    }


