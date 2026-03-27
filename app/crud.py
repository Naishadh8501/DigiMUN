from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas

# -- Auth & Admins --
def get_admin_by_name(db: Session, name: str):
    return db.query(models.Admin).filter(models.Admin.name == name).first()

def authenticate_admin(db: Session, name: str, password: str):
    admin = get_admin_by_name(db, name)
    if not admin:
        return False
    if admin.password == password:
        return admin
    return False

def authenticate_delegate(db: Session, country: str, password: str):
    delegate = db.query(models.Delegate).filter(models.Delegate.country == country).first()
    if not delegate:
        return False
    if delegate.password == password:
        # Attach calculated averages so the frontend gets the full marks data on login
        state = get_committee_state(db)
        avgs = calculate_delegate_averages(db, delegate, state)
        delegate.gsl_avg = avgs["gsl_avg"]
        delegate.chits_score = avgs["chits_score"]
        delegate.mod_avg = avgs["mod_avg"]
        delegate.total_score = avgs["total_score"]
        return delegate
    return False

def update_delegate_password(db: Session, delegate_id: str, new_password: str):
    delegate = db.query(models.Delegate).filter(models.Delegate.id == delegate_id).first()
    if delegate:
        delegate.password = new_password
        db.commit()
        db.refresh(delegate)
        return True
    return False

# -- Helper for Averages --
def calculate_delegate_averages(db: Session, delegate: models.Delegate, state: models.CommitteeState) -> dict:
    scores = delegate.scores or {}
    
    # 1. GSL Average
    gsl_data = scores.get("GSL", scores.get("gsl", 0))
    gsl_total = sum(gsl_data) if isinstance(gsl_data, list) else gsl_data
    speeches = delegate.speeches
    gsl_avg = (gsl_total / speeches) if speeches > 0 else 0.0

    # 2. Moderated Caucus Average
    mod_data = scores.get("Moderated Caucus", scores.get("mod_caucus", 0))
    mod_total = sum(mod_data) if isinstance(mod_data, list) else mod_data
    
    total_mods = db.query(models.Motion).filter(
        models.Motion.type.in_(['moderated_caucus', 'mod_caucus', 'Moderated Caucus']),
        models.Motion.status == 'passed'
    ).count()
    
    mod_avg = (mod_total / total_mods) if total_mods > 0 else 0.0

    # 3. Chits Average (Questions + Answers)
    chits = db.query(models.Chit).filter(
        or_(models.Chit.from_delegate == delegate.id, models.Chit.from_delegate == delegate.name)
    ).all()
    
    questions = [c for c in chits if c.type and c.type.lower() == 'question']
    answers = [c for c in chits if c.type and c.type.lower() == 'answer']
    
    q_marks = sum((c.marks or 0) for c in questions)
    a_marks = sum((c.marks or 0) for c in answers)
    
    q_avg = (q_marks / len(questions)) if questions else 0.0
    a_avg = (a_marks / len(answers)) if answers else 0.0
    
    chits_score = q_avg + a_avg
    
    if not questions and not answers and chits:
        chits_score = sum((c.marks or 0) for c in chits) / len(chits)

    total_score = gsl_avg + mod_avg + chits_score

    return {
        "gsl_avg": round(gsl_avg, 2),
        "chits_score": round(chits_score, 2),
        "mod_avg": round(mod_avg, 2),
        "total_score": round(total_score, 2)
    }

# -- Delegates --
def get_delegates(db: Session):
    delegates = db.query(models.Delegate).all()
    state = get_committee_state(db)
    
    for delegate in delegates:
        avgs = calculate_delegate_averages(db, delegate, state)
        delegate.gsl_avg = avgs["gsl_avg"]
        delegate.chits_score = avgs["chits_score"]
        delegate.mod_avg = avgs["mod_avg"]
        delegate.total_score = avgs["total_score"]
        
    return delegates

def get_delegate(db: Session, delegate_id: str):
    delegate = db.query(models.Delegate).filter(models.Delegate.id == delegate_id).first()
    if delegate:
        state = get_committee_state(db)
        avgs = calculate_delegate_averages(db, delegate, state)
        delegate.gsl_avg = avgs["gsl_avg"]
        delegate.chits_score = avgs["chits_score"]
        delegate.mod_avg = avgs["mod_avg"]
        delegate.total_score = avgs["total_score"]
    return delegate

def create_delegate(db: Session, delegate: schemas.DelegateCreate):
    db_delegate = models.Delegate(**delegate.model_dump())
    db.add(db_delegate)
    db.commit()
    db.refresh(db_delegate)
    return db_delegate

def update_delegate_score(db: Session, delegate_id: str, category: str, score: int):
    db_delegate = db.query(models.Delegate).filter(models.Delegate.id == delegate_id).first()
    if db_delegate:
        scores = db_delegate.scores.copy() if db_delegate.scores else {}
        scores[category] = score
        db_delegate.scores = scores
        db.commit()
        db.refresh(db_delegate)
    return get_delegate(db, delegate_id) 

# -- Motions --
def get_motions(db: Session):
    return db.query(models.Motion).order_by(models.Motion.timestamp.desc()).all()

def get_motion(db: Session, motion_id: str):
    return db.query(models.Motion).filter(models.Motion.id == motion_id).first()

def create_motion(db: Session, motion: schemas.MotionCreate):
    db_motion = models.Motion(**motion.model_dump())
    db.add(db_motion)
    db.commit()
    db.refresh(db_motion)
    return db_motion

def update_motion(db: Session, motion_id: str, update_data: schemas.MotionUpdate):
    db_motion = get_motion(db, motion_id)
    if db_motion:
        db_motion.status = update_data.status
        if update_data.status != 'pending':
            db_motion.votes_for = update_data.votes_for
            db_motion.votes_against = update_data.votes_against
            db_motion.votes_abstain = update_data.votes_abstain
        db.commit()
        db.refresh(db_motion)
    return db_motion

# -- Chits --
def get_chits(db: Session):
    return db.query(models.Chit).all()

def get_chit(db: Session, chit_id: str):
    return db.query(models.Chit).filter(models.Chit.id == chit_id).first()

def create_chit(db: Session, chit: schemas.ChitCreate):
    db_chit = models.Chit(**chit.model_dump())
    db.add(db_chit)
    db.commit()
    db.refresh(db_chit)
    return db_chit

def update_chit(db: Session, chit_id: str, chit_update: schemas.ChitUpdate):
    db_chit = get_chit(db, chit_id)
    if db_chit:
        update_data = chit_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_chit, key, value)
        db.commit()
        db.refresh(db_chit)
    return db_chit

# -- Activity Log & Announcements --
def get_activity_logs(db: Session):
    return db.query(models.ActivityEntry).order_by(models.ActivityEntry.timestamp.desc()).all()

def create_activity_log(db: Session, entry: schemas.ActivityEntryCreate):
    db_entry = models.ActivityEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def get_announcements(db: Session):
    return db.query(models.Announcement).order_by(models.Announcement.timestamp.desc()).all()

def create_announcement(db: Session, announcement: schemas.AnnouncementCreate):
    db_announcement = models.Announcement(**announcement.model_dump())
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement

# -- Committee State --
def get_committee_state(db: Session):
    state = db.query(models.CommitteeState).first()
    if not state:
        state = models.CommitteeState()
        db.add(state)
        db.commit()
        db.refresh(state)
    return state

def update_committee_phase(db: Session, phase: str):
    state = get_committee_state(db)
    state.phase = phase
    db.commit()
    db.refresh(state)
    return state

def update_committee_speakers(db: Session, speakers_list: list, current_speaker: str | None):
    state = get_committee_state(db)
    state.speakers_list = speakers_list
    state.current_speaker = current_speaker
    db.commit()
    db.refresh(state)
    return state

def update_committee_timer(db: Session, timer_seconds: int, timer_running: bool, timer_total: int, last_started_at: int | None):
    state = get_committee_state(db)
    state.timer_seconds = timer_seconds
    state.timer_running = timer_running
    state.timer_total = timer_total
    state.last_started_at = last_started_at
    db.commit()
    db.refresh(state)
    return state

def update_committee_floor(db: Session, floor_open: bool):
    state = get_committee_state(db)
    state.floor_open = floor_open
    db.commit()
    db.refresh(state)
    return state

def update_motions_floor(db: Session, motions_floor_open: bool):
    state = get_committee_state(db)
    state.motions_floor_open = motions_floor_open
    db.commit()
    db.refresh(state)
    return state

def update_voting_session(db: Session, motion_id: str | None, votes: dict):
    state = get_committee_state(db)
    state.active_voting_motion_id = motion_id
    state.delegate_votes = votes
    db.commit()
    db.refresh(state)
    return state

def cast_delegate_vote(db: Session, delegate_id: str, vote: str | None):
    state = get_committee_state(db)
    current_votes = state.delegate_votes.copy() if state.delegate_votes else {}
    if vote is None:
        current_votes.pop(delegate_id, None)
    else:
        current_votes[delegate_id] = vote
    state.delegate_votes = current_votes
    db.commit()
    db.refresh(state)
    return state

def update_caucus_session(db: Session, caucus_id: str | None):
    state = get_committee_state(db)
    state.active_caucus_id = caucus_id
    if caucus_id is None:
        state.caucus_speakers_list = []
        state.caucus_current_speaker = None
        state.caucus_floor_open = False
    db.commit()
    db.refresh(state)
    return state

def update_caucus_speakers(db: Session, speakers_list: list, current_speaker: str | None):
    state = get_committee_state(db)
    state.caucus_speakers_list = speakers_list
    state.caucus_current_speaker = current_speaker
    db.commit()
    db.refresh(state)
    return state

def update_caucus_floor(db: Session, floor_open: bool):
    state = get_committee_state(db)
    state.caucus_floor_open = floor_open
    db.commit()
    db.refresh(state)
    return state

def update_yield_state(db: Session, yield_type: str | None, target: str | None):
    state = get_committee_state(db)
    state.current_yield_type = yield_type
    state.yield_target = target
    db.commit()
    db.refresh(state)
    return state

def update_committee_info(db: Session, name: str, agenda: str):
    state = get_committee_state(db)
    state.name = name
    state.agenda = agenda
    db.commit()
    db.refresh(state)
    return state

def update_question_queue(db: Session, queue: list):
    state = get_committee_state(db)
    state.question_queue = queue
    db.commit()
    db.refresh(state)
    return state

def create_verbatim(db: Session, verbatim: schemas.VerbatimCreate):
    db_verbatim = models.Verbatim(**verbatim.dict())
    db.add(db_verbatim)
    db.commit()
    db.refresh(db_verbatim)
    return db_verbatim

def get_verbatims(db: Session):
    return db.query(models.Verbatim).order_by(models.Verbatim.timestamp.desc()).all()

def update_verbatim_permissions(db: Session, permissions: list):
    state = get_committee_state(db)
    state.verbatim_permissions = permissions
    db.commit()
    db.refresh(state)
    return state

# --- NEW: Resolutions ---
def get_resolutions(db: Session):
    return db.query(models.Resolution).order_by(models.Resolution.timestamp.desc()).all()

def get_resolution(db: Session, resolution_id: str):
    return db.query(models.Resolution).filter(models.Resolution.id == resolution_id).first()

def create_resolution(db: Session, resolution: schemas.ResolutionCreate):
    db_res = models.Resolution(**resolution.model_dump())
    db.add(db_res)
    db.commit()
    db.refresh(db_res)
    return db_res

def update_resolution(db: Session, resolution_id: str, status: str | None, marks: int | None):
    db_res = get_resolution(db, resolution_id)
    if db_res:
        if status is not None:
            db_res.status = status
        if marks is not None:
            db_res.marks = marks
        db.commit()
        db.refresh(db_res)
    return db_res