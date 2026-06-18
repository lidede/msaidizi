from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Todo, TodoCreate, TodoUpdate
from openai import OpenAI
import os

router = APIRouter(prefix="/api/todos", tags=["todos"])


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


@router.get("/")
def list_todos(session: Session = Depends(get_session)):
    return session.exec(select(Todo)).all()


@router.post("/")
def create_todo(data: TodoCreate, session: Session = Depends(get_session)):
    todo = Todo(**data.model_dump())
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


@router.patch("/{todo_id}")
def update_todo(todo_id: int, data: TodoUpdate, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(404, "Todo not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(todo, k, v)
    session.commit()
    session.refresh(todo)
    return todo


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(404, "Todo not found")
    session.delete(todo)
    session.commit()
    return {"ok": True}


@router.post("/{todo_id}/done")
def mark_done(todo_id: int, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(404, "Todo not found")
    todo.status = "done"
    session.commit()
    session.refresh(todo)
    return todo


@router.post("/ai/prioritise")
def prioritise(session: Session = Depends(get_session)):
    todos = session.exec(select(Todo).where(Todo.status != "done")).all()
    if not todos:
        return {"suggestion": "No open tasks — great job!"}

    lines = []
    for t in todos:
        due = f", due {t.due_date.strftime('%Y-%m-%d')}" if t.due_date else ""
        lines.append(f"- [{t.priority}] {t.title}{due}")

    prompt = f"""I have these open tasks:
{chr(10).join(lines)}

Suggest the best order to tackle them today. Give a numbered list with a one-sentence reason for each. Be direct and practical."""

    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"suggestion": resp.choices[0].message.content}
