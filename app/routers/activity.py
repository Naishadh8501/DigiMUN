from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/activity", tags=["activity"])

@router.get("/", response_model=List[schemas.ActivityEntryResponse])
def read_activity(db: Session = Depends(get_db)):
    return crud.get_activity_logs(db)

@router.post("/", response_model=schemas.ActivityEntryResponse)
def create_activity(entry: schemas.ActivityEntryCreate, db: Session = Depends(get_db)):
    return crud.create_activity_log(db=db, entry=entry)