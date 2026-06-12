from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Chore, ChoreCreate, ChoreUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/api/chores", tags=["chores"])


@router.get("/")
def list_chores(session: Session = Depends(get_session)):
    return session.exec(select(Chore)).all()


@router.post("/", status_code=201)
def create_chore(body: ChoreCreate, session: Session = Depends(get_session)):
    chore = Chore(**body.model_dump())
    session.add(chore)
    session.commit()
    session.refresh(chore)
    return chore


@router.patch("/{chore_id}")
def update_chore(chore_id: int, update: ChoreUpdate, session: Session = Depends(get_session)):
    chore = session.get(Chore, chore_id)
    if not chore:
        raise HTTPException(404, "Chore not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(chore, field, value)
    session.add(chore)
    session.commit()
    session.refresh(chore)
    return chore


@router.post("/{chore_id}/done")
def mark_done(chore_id: int, session: Session = Depends(get_session)):
    chore = session.get(Chore, chore_id)
    if not chore:
        raise HTTPException(404, "Chore not found")
    chore.last_done = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(chore)
    session.commit()
    session.refresh(chore)
    return chore


@router.delete("/{chore_id}", status_code=204)
def delete_chore(chore_id: int, session: Session = Depends(get_session)):
    chore = session.get(Chore, chore_id)
    if not chore:
        raise HTTPException(404, "Chore not found")
    session.delete(chore)
    session.commit()
