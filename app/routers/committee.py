from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/committee", tags=["committee"])

@router.get("/", response_model=schemas.CommitteeStateResponse)
def read_committee_state(db: Session = Depends(get_db)):
    return crud.get_committee_state(db)

@router.put("/phase", response_model=schemas.CommitteeStateResponse)
def update_phase(phase: str, db: Session = Depends(get_db)):
    return crud.update_committee_phase(db, phase)

@router.put("/speakers", response_model=schemas.CommitteeStateResponse)
def update_speakers(update_data: schemas.CommitteeSpeakersUpdate, db: Session = Depends(get_db)):
    return crud.update_committee_speakers(db, update_data.speakers_list, update_data.current_speaker)

@router.put("/timer", response_model=schemas.CommitteeStateResponse)
def update_timer(update_data: schemas.CommitteeTimerUpdate, db: Session = Depends(get_db)):
    return crud.update_committee_timer(db, update_data.timer_seconds, update_data.timer_running, update_data.timer_total, update_data.last_started_at)

@router.put("/floor", response_model=schemas.CommitteeStateResponse)
def update_floor(update_data: schemas.CommitteeFloorUpdate, db: Session = Depends(get_db)):
    return crud.update_committee_floor(db, update_data.floor_open)

@router.put("/motions_floor", response_model=schemas.CommitteeStateResponse)
def update_motions_floor(update_data: schemas.CommitteeMotionsFloorUpdate, db: Session = Depends(get_db)):
    return crud.update_motions_floor(db, update_data.motions_floor_open)

@router.put("/voting_session", response_model=schemas.CommitteeStateResponse)
def update_voting_session(update_data: schemas.CommitteeVotingSessionUpdate, db: Session = Depends(get_db)):
    return crud.update_voting_session(db, update_data.active_voting_motion_id, update_data.delegate_votes)

@router.put("/cast_vote", response_model=schemas.CommitteeStateResponse)
def cast_vote(update_data: schemas.CommitteeDelegateVoteUpdate, db: Session = Depends(get_db)):
    return crud.cast_delegate_vote(db, update_data.delegate_id, update_data.vote)

@router.put("/caucus_session", response_model=schemas.CommitteeStateResponse)
def update_caucus_session(update_data: schemas.CommitteeCaucusSessionUpdate, db: Session = Depends(get_db)):
    return crud.update_caucus_session(db, update_data.active_caucus_id)

@router.put("/caucus_speakers", response_model=schemas.CommitteeStateResponse)
def update_caucus_speakers(update_data: schemas.CommitteeCaucusSpeakersUpdate, db: Session = Depends(get_db)):
    return crud.update_caucus_speakers(db, update_data.caucus_speakers_list, update_data.caucus_current_speaker)

@router.put("/caucus_floor", response_model=schemas.CommitteeStateResponse)
def update_caucus_floor(update_data: schemas.CommitteeCaucusFloorUpdate, db: Session = Depends(get_db)):
    return crud.update_caucus_floor(db, update_data.caucus_floor_open)

@router.put("/yield", response_model=schemas.CommitteeStateResponse)
def update_yield_state(update_data: schemas.CommitteeYieldUpdate, db: Session = Depends(get_db)):
    return crud.update_yield_state(db, update_data.current_yield_type, update_data.yield_target)

@router.put("/info", response_model=schemas.CommitteeStateResponse)
def update_info(update_data: schemas.CommitteeInfoUpdate, db: Session = Depends(get_db)):
    return crud.update_committee_info(db, update_data.name, update_data.agenda)

@router.put("/question_queue", response_model=schemas.CommitteeStateResponse)
def update_question_queue(update_data: schemas.CommitteeQuestionQueueUpdate, db: Session = Depends(get_db)):
    return crud.update_question_queue(db, update_data.question_queue)

@router.put("/verbatim_permissions", response_model=schemas.CommitteeStateResponse)
def update_verbatim_perms(update_data: schemas.CommitteeVerbatimPermUpdate, db: Session = Depends(get_db)):
    return crud.update_verbatim_permissions(db, update_data.verbatim_permissions)