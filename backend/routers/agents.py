from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Agent, AgentUpdate

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/")
def list_agents(session: Session = Depends(get_session)):
    return session.exec(select(Agent)).all()


@router.post("/", status_code=201)
def create_agent(agent: Agent, session: Session = Depends(get_session)):
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.patch("/{agent_id}")
def update_agent(agent_id: int, update: AgentUpdate, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(agent, field, value)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    session.delete(agent)
    session.commit()
