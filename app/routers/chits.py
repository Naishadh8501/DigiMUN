from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/chits", tags=["chits"])

@router.get("/", response_model=List[schemas.ChitResponse])
def read_chits(db: Session = Depends(get_db)):
    return crud.get_chits(db)

@router.post("/", response_model=schemas.ChitResponse)
def create_chit(chit: schemas.ChitCreate, db: Session = Depends(get_db)):
    db_chit = crud.get_chit(db, chit_id=chit.id)
    if db_chit:
        raise HTTPException(status_code=400, detail="Chit already exists")
    return crud.create_chit(db=db, chit=chit)

@router.put("/{chit_id}", response_model=schemas.ChitResponse)
def update_chit_status(chit_id: str, chit_update: schemas.ChitUpdate, db: Session = Depends(get_db)):
    db_chit = crud.update_chit(db, chit_id, chit_update)
    if not db_chit:
        raise HTTPException(status_code=404, detail="Chit not found")
    return db_chit