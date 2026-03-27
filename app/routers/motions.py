from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/motions", tags=["motions"])

@router.get("/", response_model=List[schemas.MotionResponse])
def read_motions(db: Session = Depends(get_db)):
    return crud.get_motions(db)

@router.post("/", response_model=schemas.MotionResponse)
def create_motion(motion: schemas.MotionCreate, db: Session = Depends(get_db)):
    db_motion = crud.get_motion(db, motion_id=motion.id)
    if db_motion:
        raise HTTPException(status_code=400, detail="Motion already exists")
    return crud.create_motion(db=db, motion=motion)

@router.put("/{motion_id}", response_model=schemas.MotionResponse)
def update_motion(motion_id: str, update_data: schemas.MotionUpdate, db: Session = Depends(get_db)):
    db_motion = crud.update_motion(db, motion_id, update_data)
    if not db_motion:
        raise HTTPException(status_code=404, detail="Motion not found")
    return db_motion