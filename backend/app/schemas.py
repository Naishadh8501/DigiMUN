from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Incoming Data Models ---

class JoinSessionRequest(BaseModel):
    userId: str
    country: str
    role: str

class UpdateSessionRequest(BaseModel):
    state: Optional[str] = None
    chairUserId: Optional[str] = None
    sessionConfig: Optional[Dict[str, Any]] = None

class SpeakersListUpdate(BaseModel):
    list: List[Dict[str, Any]]

class ChatMessageCreate(BaseModel):
    userId: str
    country: str
    message: str
    isMotion: bool = False

class VoteStartRequest(BaseModel):
    topic: str
    type: str # 'procedural' or 'substantive'
    options: List[str]

class CastVoteRequest(BaseModel):
    userId: str
    vote: str

# --- Outgoing Response Models ---

class DelegateResponse(BaseModel):
    # Fix: Map 'user_id' from DB to 'userId' for Frontend
    userId: str = Field(validation_alias="user_id")
    country: str
    role: str
    score: int

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    # Fix: Map 'user_id' from DB to 'userId'
    userId: str = Field(validation_alias="user_id")
    country: str
    message: str
    # Fix: Map 'is_motion' from DB to 'isMotion'
    isMotion: bool = Field(validation_alias="is_motion")
    timestamp: datetime

    class Config:
        from_attributes = True

# The Big Object the Frontend polls
class SessionFullResponse(BaseModel):
    state: str
    chairUserId: Optional[str]
    sessionConfig: Dict[str, Any]
    speakersList: List[Dict[str, Any]]
    voteData: Dict[str, Any]
    delegates: Dict[str, DelegateResponse] # Map userId -> Delegate Data
    chatLog: List[ChatResponse]

    class Config:
        from_attributes = True