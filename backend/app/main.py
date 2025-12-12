from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime

from . import models, schemas
from .database import engine, get_db, SessionLocal

# --- CONFIGURATION ---
ADMIN_CONFIG = {
    "userId": "Naishadh Bhavsar",
    "country": "Naishadh Bhavsar",
    "role": "chair"
}

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_or_create_session_model(db: Session):
    session_model = db.query(models.SessionState).first()
    if not session_model:
        session_model = models.SessionState()
        db.add(session_model)
        db.commit()
        db.refresh(session_model)
    return session_model

def seed_admin_user():
    db = SessionLocal()
    try:
        session_model = get_or_create_session_model(db)
        admin = db.query(models.Delegate).filter(models.Delegate.user_id == ADMIN_CONFIG["userId"]).first()
        
        if not admin:
            print(f"⚡ Seeding Admin: {ADMIN_CONFIG['userId']}")
            admin = models.Delegate(
                user_id=ADMIN_CONFIG["userId"],
                session_id=session_model.id,
                country=ADMIN_CONFIG["country"],
                role=ADMIN_CONFIG["role"]
            )
            db.add(admin)
            session_model.chair_user_id = ADMIN_CONFIG["userId"]
            db.commit()
        else:
            # Ensure admin keeps chair role if server restarts
            if session_model.chair_user_id != ADMIN_CONFIG["userId"]:
                session_model.chair_user_id = ADMIN_CONFIG["userId"]
                db.commit()
    except Exception as e:
        print(f"❌ Error seeding admin: {e}")
    finally:
        db.close()

seed_admin_user()

# --- ROUTES ---

@app.get("/session/current", response_model=schemas.SessionFullResponse)
def get_session(db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    
    # --- FIX: Convert List to Dict for Frontend ---
    delegates_dict = {d.user_id: d for d in db_session.delegates}
    
    return {
        "state": db_session.state,
        "chair_user_id": db_session.chair_user_id,
        "current_speech_start": db_session.current_speech_start,
        "session_config": db_session.session_config,
        "speakers_list": db_session.speakers_list,
        "vote_data": db_session.vote_data,
        "delegates": delegates_dict, # Now passing a Dict
        "chats": db_session.chats,
        "chits": db_session.chits
    }

@app.post("/session/join")
def join_session(data: schemas.JoinSessionRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    existing = db.query(models.Delegate).filter(models.Delegate.user_id == data.userId).first()
    
    if existing:
        existing.country = data.country
        existing.role = data.role
    else:
        new_del = models.Delegate(
            user_id=data.userId,
            session_id=db_session.id,
            country=data.country,
            role=data.role
        )
        db.add(new_del)
        
    if data.role == 'chair':
        db_session.chair_user_id = data.userId
        
    db.commit()
    return {"status": "joined"}

@app.patch("/session/current")
def update_session(data: schemas.UpdateSessionRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    if data.state: db_session.state = data.state
    if data.sessionConfig: db_session.session_config = data.sessionConfig
    db.commit()
    return {"status": "updated"}

@app.patch("/session/speakers")
def update_speakers(data: schemas.SpeakersListUpdate, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    db_session.speakers_list = data.list
    
    if data.action == 'start':
        db_session.current_speech_start = datetime.utcnow()
    elif data.action == 'end' or data.action == 'pause':
        db_session.current_speech_start = None
        
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
        type=data.type
    )
    db.add(new_chat)
    db.commit()
    return {"status": "sent"}

@app.post("/session/chits")
def send_chit(data: schemas.ChitCreate, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    new_chit = models.Chit(
        session_id=db_session.id,
        from_user_id=data.fromUserId,
        to_user_id=data.toUserId,
        from_country=data.fromCountry,
        to_country=data.toCountry,
        message=data.message,
        is_via_eb=data.isViaEb,
        tag=data.tag
    )
    db.add(new_chit)
    db.commit()
    return {"status": "chit sent"}

@app.post("/session/mark")
def mark_delegate(data: schemas.MarkDelegateRequest, db: Session = Depends(get_db)):
    delegate = db.query(models.Delegate).filter(models.Delegate.user_id == data.userId).first()
    if delegate:
        delegate.score += data.score
        db.commit()
        return {"status": "marked", "new_score": delegate.score}
    raise HTTPException(status_code=404, detail="Delegate not found")

@app.post("/session/vote/start")
def start_vote(data: schemas.VoteStartRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    db_session.vote_data = {
        "active": True,
        "topic": data.topic,
        "type": data.type,
        "options": data.options,
        "results": {opt: 0 for opt in data.options},
        "totalVotes": 0,
        "voters": []
    }
    db_session.state = "voting"
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_session, "vote_data")
    db.commit()
    return {"status": "vote started"}

@app.post("/session/vote/cast")
def cast_vote(data: schemas.CastVoteRequest, db: Session = Depends(get_db)):
    db_session = get_or_create_session_model(db)
    current_vote = dict(db_session.vote_data)
    if not current_vote.get("active"):
        raise HTTPException(status_code=400, detail="No active vote")
    if data.userId in current_vote.get("voters", []):
         raise HTTPException(status_code=400, detail="Already voted")

    current_vote["voters"].append(data.userId)
    current_vote["results"][data.vote] = current_vote["results"].get(data.vote, 0) + 1
    current_vote["totalVotes"] += 1
    
    db_session.vote_data = current_vote
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
    db_session.state = "idle"
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_session, "vote_data")
    db.commit()
    return {"status": "vote ended"}