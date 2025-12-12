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
    action: Optional[str] = None 

class ChatMessageCreate(BaseModel):
    userId: str
    country: str
    message: str
    type: str = "chat" 

class ChitCreate(BaseModel):
    fromUserId: str
    toUserId: str
    fromCountry: str
    toCountry: str
    message: str
    # --- NEW FIELDS ---
    isViaEb: bool = False
    tag: str = "General"

class MarkDelegateRequest(BaseModel):
    userId: str
    score: int

class VoteStartRequest(BaseModel):
    topic: str
    type: str 
    options: List[str]

class CastVoteRequest(BaseModel):
    userId: str
    vote: str

# --- Outgoing Response Models ---

class DelegateResponse(BaseModel):
    userId: str = Field(validation_alias="user_id")
    country: str
    role: str
    score: int

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    userId: str = Field(validation_alias="user_id")
    country: str
    message: str
    type: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ChitResponse(BaseModel):
    id: int
    fromUserId: str = Field(validation_alias="from_user_id")
    toUserId: str = Field(validation_alias="to_user_id")
    fromCountry: str = Field(validation_alias="from_country")
    toCountry: str = Field(validation_alias="to_country")
    message: str
    # --- NEW FIELDS ---
    isViaEb: bool = Field(validation_alias="is_via_eb")
    tag: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SessionFullResponse(BaseModel):
    state: str
    chairUserId: Optional[str] = Field(validation_alias="chair_user_id")
    currentSpeechStart: Optional[datetime] = Field(validation_alias="current_speech_start")
    sessionConfig: Dict[str, Any] = Field(validation_alias="session_config")
    speakersList: List[Dict[str, Any]] = Field(validation_alias="speakers_list")
    voteData: Dict[str, Any] = Field(validation_alias="vote_data")
    delegates: Dict[str, DelegateResponse]
    chatLog: List[ChatResponse] = Field(validation_alias="chats")
    chits: List[ChitResponse]

    class Config:
        from_attributes = True