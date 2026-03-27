import os
import json
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/resolutions", tags=["resolutions"])

# Create a folder to store the uploaded PDFs locally
UPLOAD_DIR = "uploads/resolutions"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=schemas.ResolutionResponse)
def upload_resolution(
    title: str = Form(...),
    uploaded_by: str = Form(...),
    authors: str = Form(...),      # Received as JSON string from frontend
    signatories: str = Form(...),  # Received as JSON string from frontend
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # Generate a unique ID and file path
    res_id = f"res_{int(datetime.now().timestamp())}"
    file_path = os.path.join(UPLOAD_DIR, f"{res_id}.pdf")
    
    # Save the file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Prepare data for DB
    res_data = schemas.ResolutionCreate(
        id=res_id,
        title=title,
        uploaded_by=uploaded_by,
        authors=json.loads(authors),
        signatories=json.loads(signatories),
        file_path=file_path,
        status="pending",
        marks=0,
        timestamp=datetime.now().strftime("%I:%M %p")
    )
    return crud.create_resolution(db, res_data)

@router.get("/", response_model=list[schemas.ResolutionResponse])
def read_resolutions(db: Session = Depends(get_db)):
    return crud.get_resolutions(db)

@router.put("/{res_id}", response_model=schemas.ResolutionResponse)
def review_resolution(res_id: str, update_data: schemas.ResolutionUpdate, db: Session = Depends(get_db)):
    res = crud.update_resolution(db, res_id, update_data.status, update_data.marks)
    if not res:
        raise HTTPException(status_code=404, detail="Resolution not found")
    return res

@router.get("/download/{res_id}")
def download_resolution(res_id: str, db: Session = Depends(get_db)):
    res = crud.get_resolution(db, res_id)
    if not res or not os.path.exists(res.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Serve the PDF file back to the browser
    return FileResponse(res.file_path, media_type="application/pdf", filename=f"{res.title}.pdf")