from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class SessionState(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String, default="idle")
    chair_user_id = Column(String, nullable=True)
    current_speech_start = Column(DateTime, nullable=True)
    
    session_config = Column(JSON, default={"gslTime": 90, "modTime": 45})
    speakers_list = Column(JSON, default=[]) 
    vote_data = Column(JSON, default={"active": False, "topic": "", "type": ""})
    
    delegates = relationship("Delegate", back_populates="session")
    chats = relationship("ChatMessage", back_populates="session")
    chits = relationship("Chit", back_populates="session")

class Delegate(Base):
    __tablename__ = "delegates"

    user_id = Column(String, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    country = Column(String)
    role = Column(String)
    score = Column(Integer, default=0)
    
    session = relationship("SessionState", back_populates="delegates")

class ChatMessage(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    user_id = Column(String)
    country = Column(String)
    message = Column(String)
    type = Column(String, default="chat") 
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("SessionState", back_populates="chats")

class Chit(Base):
    __tablename__ = "chits"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    from_user_id = Column(String)
    to_user_id = Column(String)
    from_country = Column(String)
    to_country = Column(String)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    
    # --- NEW FIELDS FOR VIA EB & TAGS ---
    is_via_eb = Column(Boolean, default=False)
    tag = Column(String, default="General") # Question, Reply, General
    
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionState", back_populates="chits")