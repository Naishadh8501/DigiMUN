from sqlalchemy import Column, String, Integer, Boolean, JSON, BigInteger
from .database import Base

class Admin(Base):
    __tablename__ = "admins"
    id = Column(String, primary_key=True, index=True)
    role = Column(String, index=True) # 'chair' or 'vice-chair'
    name = Column(String)
    password = Column(String)

class Delegate(Base):
    __tablename__ = "delegates"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    country = Column(String, unique=True, index=True)
    present = Column(Boolean, default=True)
    speeches = Column(Integer, default=0)
    votes_for = Column(Integer, default=0)
    votes_against = Column(Integer, default=0)
    votes_abstain = Column(Integer, default=0)
    scores = Column(JSON, default={})
    password = Column(String) # NEW: Password field for delegates

    @property
    def votes(self):
        return {"for_votes": self.votes_for, "against": self.votes_against, "abstain": self.votes_abstain}

class Motion(Base):
    __tablename__ = "motions"
    id = Column(String, primary_key=True, index=True)
    type = Column(String)
    proposed_by = Column(String)
    description = Column(String)
    status = Column(String, default="pending") 
    timestamp = Column(String)
    votes_for = Column(Integer, default=0)
    votes_against = Column(Integer, default=0)
    votes_abstain = Column(Integer, default=0)
    total_time = Column(Integer, nullable=True)
    speaker_time = Column(Integer, nullable=True)

    @property
    def votes(self):
        return {"for_votes": self.votes_for, "against": self.votes_against, "abstain": self.votes_abstain}

class Chit(Base):
    __tablename__ = "chits"
    id = Column(String, primary_key=True, index=True)
    from_delegate = Column(String) 
    to_delegate = Column(String)
    message = Column(String)
    timestamp = Column(String)
    read = Column(Boolean, default=False)
    type = Column(String, default="general")
    via_eb = Column(Boolean, default=False)
    eb_status = Column(String, default="pending") 
    marks = Column(Integer, nullable=True, default=0)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(String, primary_key=True, index=True)
    message = Column(String)
    urgent = Column(Boolean, default=False)
    timestamp = Column(String)

class ActivityEntry(Base):
    __tablename__ = "activity_logs"
    id = Column(String, primary_key=True, index=True)
    type = Column(String) 
    description = Column(String)
    actor = Column(String)
    timestamp = Column(String)

class CommitteeState(Base):
    __tablename__ = "committee_state"
    id = Column(Integer, primary_key=True, index=True, default=1)
    name = Column(String, default="United Nations Human Rights Council")
    agenda = Column(String, default="Addressing Climate-Induced Displacement and Migration")
    phase = Column(String, default="debate")
    timer_seconds = Column(Integer, default=90)
    timer_running = Column(Boolean, default=False)
    timer_total = Column(Integer, default=90)
    last_started_at = Column(BigInteger, nullable=True)
    speakers_list = Column(JSON, default=[]) 
    current_speaker = Column(String, nullable=True)
    floor_open = Column(Boolean, default=False)
    motions_floor_open = Column(Boolean, default=False)
    active_voting_motion_id = Column(String, nullable=True)
    delegate_votes = Column(JSON, default={})
    active_caucus_id = Column(String, nullable=True)
    caucus_speakers_list = Column(JSON, default=[])
    caucus_current_speaker = Column(String, nullable=True)
    caucus_floor_open = Column(Boolean, default=False)
    current_yield_type = Column(String, nullable=True)
    yield_target = Column(String, nullable=True)
    question_queue = Column(JSON, default=[])
    verbatim_permissions = Column(JSON, default=[])
    
class Verbatim(Base):
    __tablename__ = "verbatims"
    id = Column(String, primary_key=True, index=True)
    delegate_id = Column(String)
    type = Column(String) 
    topic = Column(String)
    text = Column(String)
    timestamp = Column(String)
    
class Resolution(Base):
    __tablename__ = "resolutions"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    file_path = Column(String) # Path where the PDF is saved
    uploaded_by = Column(String)
    authors = Column(JSON, default=[])
    signatories = Column(JSON, default=[])
    status = Column(String, default="pending") # 'pending', 'approved', 'rejected'
    marks = Column(Integer, nullable=True, default=0)
    timestamp = Column(String)