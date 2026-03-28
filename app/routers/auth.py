from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db
from ..ws import manager  # <-- Added WebSocket manager import

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Note: We changed this to 'async def' so we can await the WebSocket broadcast
@router.post("/login")
async def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    if request.role in ['chair', 'vice-chair']:
        # Authenticate Admin
        admin = crud.authenticate_admin(db, request.username, request.password)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or role",
            )
        # Verify they selected the correct role
        if admin.role != request.role:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Selected role does not match account role",
            )
        return {"message": "Login successful", "user": {"id": admin.id, "name": admin.name, "role": admin.role}}
        
    elif request.role == 'delegate':
        # Authenticate Delegate (username is the Country)
        delegate = crud.authenticate_delegate(db, request.username, request.password)
        if not delegate:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid country or password",
            )
        
        # ==========================================
        # NEW CODE: Mark as Present & Notify EB
        # ==========================================
        delegate.present = True
        db.commit()
        
        await manager.broadcast({
            "type": "DELEGATES_REFRESH"
        })
        # ==========================================

        return {
            "message": "Login successful", 
            "user": {
                "id": delegate.id, 
                "name": delegate.name, 
                "country": delegate.country, 
                "role": "delegate",
                "scores": delegate.scores,
                "speeches": delegate.speeches
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

@router.put("/delegate/{delegate_id}/password")
def update_password(delegate_id: str, payload: schemas.PasswordUpdate, db: Session = Depends(get_db)):
    success = crud.update_delegate_password(db, delegate_id, payload.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="Delegate not found")
    return {"message": "Password updated successfully"}