import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
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

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DigiMUN API")

# Fetch the frontend URL from Render environment variables (fallback to localhost for local dev)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL, # This will allow your deployed React app to connect
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