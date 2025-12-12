from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class SessionState(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String, default="idle")  # idle, voting, debating
    chair_user_id = Column(String, nullable=True)
    
    # Storing complex lists as JSON for easy frontend sync
    session_config = Column(JSON, default={"gslTime": 90, "modTime": 45})
    speakers_list = Column(JSON, default=[]) 
    vote_data = Column(JSON, default={"active": False, "topic": "", "type": ""})
    
    # Relationships
    delegates = relationship("Delegate", back_populates="session")
    chats = relationship("ChatMessage", back_populates="session")

class Delegate(Base):
    __tablename__ = "delegates"

    user_id = Column(String, primary_key=True, index=True) # Custom UID from frontend
    session_id = Column(Integer, ForeignKey("sessions.id"))
    country = Column(String)
    role = Column(String) # 'delegate' or 'chair'
    score = Column(Integer, default=0)
    
    session = relationship("SessionState", back_populates="delegates")

class ChatMessage(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    user_id = Column(String)
    country = Column(String)
    message = Column(String)
    is_motion = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("SessionState", back_populates="chats")