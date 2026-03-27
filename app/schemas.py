from pydantic import BaseModel
from typing import Dict, List, Optional

class Votes(BaseModel):
    for_votes: int = 0
    against: int = 0
    abstain: int = 0

class DelegateBase(BaseModel):
    name: str
    country: str
    present: bool = True
    speeches: int = 0

class DelegateCreate(DelegateBase):
    id: str
    scores: Dict[str, int] = {}
    password: Optional[str] = "mun2026"

class DelegatePublicResponse(DelegateBase):
    id: str
    class Config:
        from_attributes = True

class DelegateScoreResponse(DelegatePublicResponse):
    votes: Votes
    scores: Dict[str, int] = {}
    gsl_avg: Optional[float] = 0.0
    chits_score: Optional[float] = 0.0
    mod_avg: Optional[float] = 0.0
    total_score: Optional[float] = 0.0

# --- ADMIN & AUTH SCHEMAS ---
class AdminBase(BaseModel):
    name: str
    role: str

class AdminCreate(AdminBase):
    id: str
    password: str

class AdminResponse(AdminBase):
    id: str
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    role: str
    username: str 
    password: str

class PasswordUpdate(BaseModel):
    new_password: str
# --------------------------------

class MotionBase(BaseModel):
    type: str
    proposed_by: str
    description: str
    status: str = "pending"
    timestamp: str
    total_time: Optional[int] = None
    speaker_time: Optional[int] = None

class MotionCreate(MotionBase):
    id: str

class MotionUpdate(BaseModel):
    status: str
    votes_for: Optional[int] = 0
    votes_against: Optional[int] = 0
    votes_abstain: Optional[int] = 0

class MotionResponse(MotionBase):
    id: str
    votes: Optional[Votes] = None
    class Config:
        from_attributes = True

class ChitBase(BaseModel):
    from_delegate: str
    to_delegate: str
    message: str
    timestamp: str
    read: bool = False
    type: str = "general"
    via_eb: bool = False
    eb_status: str = "pending"
    marks: Optional[int] = 0

class ChitCreate(ChitBase):
    id: str

class ChitUpdate(BaseModel):
    eb_status: Optional[str] = None
    marks: Optional[int] = None
    read: Optional[bool] = None

class ChitResponse(ChitBase):
    id: str
    marks: Optional[int] = 0
    class Config:
        from_attributes = True

class ActivityEntryBase(BaseModel):
    type: str
    description: str
    actor: str
    timestamp: str

class ActivityEntryCreate(ActivityEntryBase):
    id: str

class ActivityEntryResponse(ActivityEntryBase):
    id: str
    class Config:
        from_attributes = True

class AnnouncementBase(BaseModel):
    message: str
    urgent: bool = False
    timestamp: str

class AnnouncementCreate(AnnouncementBase):
    id: str

class AnnouncementResponse(AnnouncementBase):
    id: str
    class Config:
        from_attributes = True

class CommitteeStateBase(BaseModel):
    name: str
    agenda: str
    phase: str
    timer_seconds: int
    timer_running: bool
    timer_total: int
    speakers_list: List[str]
    current_speaker: Optional[str] = None
    last_started_at: Optional[int] = None
    floor_open: bool = False
    motions_floor_open: bool = False
    active_voting_motion_id: Optional[str] = None
    delegate_votes: Dict[str, str] = {}
    active_caucus_id: Optional[str] = None
    caucus_speakers_list: List[str] = []
    caucus_current_speaker: Optional[str] = None
    caucus_floor_open: bool = False
    current_yield_type: Optional[str] = None
    yield_target: Optional[str] = None
    question_queue: List[str] = [] 
    verbatim_permissions: list = []

class CommitteeStateResponse(CommitteeStateBase):
    id: int
    class Config:
        from_attributes = True

class CommitteeSpeakersUpdate(BaseModel):
    speakers_list: List[str]
    current_speaker: Optional[str] = None

class CommitteeTimerUpdate(BaseModel):
    timer_seconds: int
    timer_running: bool
    timer_total: int
    last_started_at: Optional[int] = None

class CommitteeFloorUpdate(BaseModel):
    floor_open: bool

class CommitteeMotionsFloorUpdate(BaseModel):
    motions_floor_open: bool

class CommitteeVotingSessionUpdate(BaseModel):
    active_voting_motion_id: Optional[str] = None
    delegate_votes: Dict[str, str] = {}

class CommitteeDelegateVoteUpdate(BaseModel):
    delegate_id: str
    vote: Optional[str] = None

class CommitteeCaucusSessionUpdate(BaseModel):
    active_caucus_id: Optional[str] = None

class CommitteeCaucusSpeakersUpdate(BaseModel):
    caucus_speakers_list: List[str]
    caucus_current_speaker: Optional[str] = None

class CommitteeCaucusFloorUpdate(BaseModel):
    caucus_floor_open: bool
    
class CommitteeYieldUpdate(BaseModel):
    current_yield_type: Optional[str] = None
    yield_target: Optional[str] = None    

class CommitteeInfoUpdate(BaseModel):
    name: str
    agenda: str    

class CommitteeQuestionQueueUpdate(BaseModel):
    question_queue: List[str]    

class VerbatimBase(BaseModel):
    delegate_id: str
    type: str
    topic: str
    text: str
    timestamp: str

class VerbatimCreate(VerbatimBase):
    id: str

class CommitteeVerbatimPermUpdate(BaseModel):
    verbatim_permissions: list
    
# Add this at the end of app/schemas.py

class ResolutionBase(BaseModel):
    title: str
    uploaded_by: str
    authors: List[str]
    signatories: List[str]
    status: str = "pending"
    marks: Optional[int] = 0
    timestamp: str

class ResolutionCreate(ResolutionBase):
    id: str
    file_path: str

class ResolutionUpdate(BaseModel):
    status: Optional[str] = None
    marks: Optional[int] = None

class ResolutionResponse(ResolutionBase):
    id: str
    file_path: str
    
    class Config:
        from_attributes = True