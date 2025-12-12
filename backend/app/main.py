from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import engine, get_db

# Create DB Tables automatically on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your Render Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper to get the single active session ---
def get_or_create_session_model(db: Session):
    # We assume 1 global session for this app.
    session_model = db.query(models.SessionState).first()
    if not session_model:
        session_model = models.SessionState()
        db.add(session_model)
        db.commit()
        db.refresh(session_model)
    return session_model

# --- ROUTES ---

@app.get("/session/current", response_model=schemas.SessionFullResponse)
def get_session(db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    # Transform Delegates List -> Dict for Frontend
    delegates_dict = {}
    for d in db_session.delegates:
        delegates_dict[d.user_id] = schemas.DelegateResponse.model_validate(d)
        
    return {
        "state": db_session.state,
        "chairUserId": db_session.chair_user_id,
        "sessionConfig": db_session.session_config,
        "speakersList": db_session.speakers_list,
        "voteData": db_session.vote_data,
        "delegates": delegates_dict,
        "chatLog": db_session.chats
    }

@app.post("/session/join")
def join_session(data: schemas.JoinSessionRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    # Check if user exists
    existing_delegate = db.query(models.Delegate).filter(models.Delegate.user_id == data.userId).first()
    
    if existing_delegate:
        existing_delegate.country = data.country
        existing_delegate.role = data.role
    else:
        new_delegate = models.Delegate(
            user_id=data.userId,
            session_id=db_session.id,
            country=data.country,
            role=data.role
        )
        db.add(new_delegate)
        
    # If joining as chair, update session
    if data.role == 'chair':
        db_session.chair_user_id = data.userId
        
    db.commit()
    return {"status": "joined"}

@app.patch("/session/current")
def update_session(data: schemas.UpdateSessionRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    if data.state:
        db_session.state = data.state
    if data.sessionConfig:
        db_session.session_config = data.sessionConfig
        
    db.commit()
    return {"status": "updated"}

@app.patch("/session/speakers")
def update_speakers(data: schemas.SpeakersListUpdate, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    # Direct replacement of JSON list
    db_session.speakers_list = data.list
    db.commit()
    return {"status": "speakers updated"}

@app.post("/session/chat")
def send_message(data: schemas.ChatMessageCreate, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    new_chat = models.ChatMessage(
        session_id=db_session.id,
        user_id=data.userId,
        country=data.country,
        message=data.message,
        is_motion=data.isMotion
    )
    db.add(new_chat)
    db.commit()
    return {"status": "sent"}

# --- Voting Logic ---

@app.post("/session/vote/start")
def start_vote(data: schemas.VoteStartRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    vote_data = {
        "active": True,
        "topic": data.topic,
        "type": data.type,
        "options": data.options,
        "results": {opt: 0 for opt in data.options},
        "totalVotes": 0,
        "voters": [] # Track who voted to prevent doubles
    }
    
    db_session.vote_data = vote_data
    db_session.state = "voting"
    db.commit()
    return {"status": "vote started"}

@app.post("/session/vote/cast")
def cast_vote(data: schemas.CastVoteRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    current_vote = dict(db_session.vote_data) # Copy to mutate
    
    if not current_vote.get("active"):
        raise HTTPException(status_code=400, detail="No active vote")
    
    if data.userId in current_vote.get("voters", []):
         raise HTTPException(status_code=400, detail="Already voted")

    # Update logic
    current_vote["voters"].append(data.userId)
    current_vote["results"][data.vote] = current_vote["results"].get(data.vote, 0) + 1
    current_vote["totalVotes"] += 1
    
    # Save back to DB
    db_session.vote_data = current_vote
    # Force SQLAlchemy to detect change in JSON
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_session, "vote_data")
    
    db.commit()
    return {"status": "vote cast"}

@app.post("/session/vote/end")
def end_vote(db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    current_vote = dict(db_session.vote_data)
    current_vote["active"] = False
    
    db_session.vote_data = current_vote
    db_session.state = "idle" # Return to idle or debating
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_session, "vote_data")
    
    db.commit()
    return {"status": "vote ended"}