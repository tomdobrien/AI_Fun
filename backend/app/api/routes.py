from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.repositories.profile_repository import ProfileRepository
from app.schemas import ProfileResponse
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/api")

@router.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "healthy"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "unavailable"}) from exc

@router.get("/profile", response_model=ProfileResponse, response_model_by_alias=True, tags=["profile"])
def get_profile(db: Session = Depends(get_db)) -> ProfileResponse:
    return ProfileService(ProfileRepository(db)).get_profile()
