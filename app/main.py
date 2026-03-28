import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine, SessionLocal
from .routers import (
    delegates, 
    motions, 
    chits, 
    committee, 
    activity, 
    announcements, 
    verbatims, 
    auth, 
    resolutions 
)
from .ws import manager

# Models needed for the secret reset endpoint
from .models import Chit, Motion, ActivityEntry, Announcement, Verbatim, Resolution, CommitteeState, Delegate

# Create all database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DigiMUN API")

# Fetch the frontend URL from Render environment variables (fallback to localhost for local dev)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Configure CORS so the deployed React frontend can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL, 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API Routes
app.include_router(delegates.router)
app.include_router(motions.router)
app.include_router(chits.router)
app.include_router(committee.router)
app.include_router(activity.router)      
app.include_router(announcements.router) 
app.include_router(verbatims.router)     
app.include_router(auth.router)          
app.include_router(resolutions.router)   

# WebSocket Endpoint for Real-Time Updates
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Root Test Endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the DigiMUN API"}

# =====================================================================
# SECRET ENDPOINT TO RESET DB WITHOUT LOSING PASSWORDS
# =====================================================================
@app.get("/api/secret-reset-mun-data-999")
def secret_reset_database():
    db = SessionLocal()
    try:
        # 1. Delete all transactional data
        db.query(Chit).delete()
        db.query(Motion).delete()
        db.query(ActivityEntry).delete() 
        db.query(Announcement).delete()
        db.query(Verbatim).delete()
        db.query(Resolution).delete()
        db.commit() 

        # 2. Reset Committee State
        db.query(CommitteeState).delete()
        db.add(CommitteeState(name="UNGA DISEC"))
        db.commit() 

        # 3. Reset Delegate Scores & Stats
        delegates = db.query(Delegate).all()
        for d in delegates:
            d.speeches = 0
            d.votes_for = 0
            d.votes_against = 0
            d.votes_abstain = 0
            d.scores = {}
            d.present = False 
            db.commit() 
            
        return {"status": "success", "message": "Database completely wiped! Passwords and users saved."}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()