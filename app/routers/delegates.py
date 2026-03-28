from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Union
from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/api/delegates", tags=["delegates"])

@router.get("/", response_model=List[Union[schemas.DelegateScoreResponse, schemas.DelegatePublicResponse]])
def read_delegates(
    x_role: str = Header(None), 
    db: Session = Depends(get_db)
):
    delegates = crud.get_delegates(db)
    
    # Secure Filter: Strip scores if the user is not an Admin
    if x_role not in ['chair', 'vice-chair']:
        return [schemas.DelegatePublicResponse.model_validate(d) for d in delegates]
    
    # Send full data to Admins
    return [schemas.DelegateScoreResponse.model_validate(d) for d in delegates]

@router.post("/", response_model=schemas.DelegateScoreResponse)
def create_delegate(delegate: schemas.DelegateCreate, db: Session = Depends(get_db)):
    db_delegate = crud.get_delegate(db, delegate_id=delegate.id)
    if db_delegate:
        raise HTTPException(status_code=400, detail="Delegate already exists")
    return crud.create_delegate(db=db, delegate=delegate)

@router.put("/{delegate_id}/scores", response_model=schemas.DelegateScoreResponse)
def update_score(delegate_id: str, category: str, score: int, db: Session = Depends(get_db)):
    db_delegate = crud.update_delegate_score(db, delegate_id, category, score)
    if not db_delegate:
        raise HTTPException(status_code=404, detail="Delegate not found")
    return db_delegate

# ==========================================
# NEW ROUTE: Delete Delegate
# ==========================================
@router.delete("/{delegate_id}", status_code=status.HTTP_200_OK)
def delete_delegate(delegate_id: str, db: Session = Depends(get_db)):
    """Permanently delete a delegate from the database."""
    # Find the delegate
    delegate = db.query(models.Delegate).filter(models.Delegate.id == delegate_id).first()
    
    if not delegate:
        raise HTTPException(status_code=404, detail="Delegate not found")
        
    # Delete and save
    db.delete(delegate)
    db.commit()
    
    return {"message": f"Delegate {delegate.country} removed successfully"}