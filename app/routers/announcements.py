from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

@router.get("/", response_model=List[schemas.AnnouncementResponse])
def read_announcements(db: Session = Depends(get_db)):
    return crud.get_announcements(db)

@router.post("/", response_model=schemas.AnnouncementResponse)
def create_announcement(announcement: schemas.AnnouncementCreate, db: Session = Depends(get_db)):
    return crud.create_announcement(db=db, announcement=announcement)