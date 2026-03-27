from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/verbatims", tags=["verbatims"])

@router.get("/")
def read_verbatims(db: Session = Depends(get_db)):
    return crud.get_verbatims(db)

@router.post("/")
def create_verbatim(verbatim: schemas.VerbatimCreate, db: Session = Depends(get_db)):
    return crud.create_verbatim(db, verbatim)