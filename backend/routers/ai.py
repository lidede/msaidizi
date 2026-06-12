from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Chore
from pydantic import BaseModel
from openai import OpenAI
from datetime import datetime, timedelta, timezone
import os

router = APIRouter(prefix="/api/ai", tags=["ai"])


def get_client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured on server")
    return OpenAI(
        api_key=key,
        base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"),
    )


def default_model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


class ChatRequest(BaseModel):
    message: str


class SuggestRequest(BaseModel):
    weather: str = ""


@router.post("/chat")
def chat(req: ChatRequest):
    client = get_client()
    resp = client.chat.completions.create(
        model=default_model(),
        messages=[{"role": "user", "content": req.message}],
    )
    return {"reply": resp.choices[0].message.content}


@router.post("/suggest-chores")
def suggest_chores(req: SuggestRequest, session: Session = Depends(get_session)):
    client = get_client()
    chores = session.exec(select(Chore)).all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    freq_days = {"daily": 1, "weekly": 7, "monthly": 30}
    lines = []
    for c in chores:
        days = freq_days.get(c.frequency, 7)
        if c.last_done:
            next_due = c.last_done + timedelta(days=days)
            delta = (now - next_due).days
            status = f"overdue by {delta}d" if delta > 0 else f"due in {-delta}d"
        else:
            status = "never done"
        lines.append(f"- {c.name} ({c.frequency}): {status}")

    chore_context = "\n".join(lines) if lines else "No chores tracked yet."
    weather_note = f"Current weather in Haarlem: {req.weather}." if req.weather else ""

    prompt = f"""You are a practical home assistant. Here are my chores and their current status:

{chore_context}

{weather_note}

Which chores should I prioritise today? Give a short numbered list (max 5 items) with a one-sentence reason each. Be direct and friendly."""

    resp = client.chat.completions.create(
        model=default_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"suggestion": resp.choices[0].message.content}


@router.get("/week-summary")
def week_summary(session: Session = Depends(get_session)):
    client = get_client()
    chores = session.exec(select(Chore)).all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    week_ago = now - timedelta(days=7)

    freq_days = {"daily": 1, "weekly": 7, "monthly": 30}
    done_this_week = [c.name for c in chores if c.last_done and c.last_done >= week_ago]
    overdue = []
    for c in chores:
        days = freq_days.get(c.frequency, 7)
        if c.last_done:
            if (c.last_done + timedelta(days=days)) < now:
                overdue.append(c.name)
        else:
            overdue.append(c.name)

    prompt = f"""Summarise this week's home activity in 3-4 warm, friendly sentences.
Done this week: {', '.join(done_this_week) if done_this_week else 'nothing yet'}.
Currently overdue: {', '.join(overdue) if overdue else 'nothing — great job!'}.
Keep it encouraging and brief."""

    resp = client.chat.completions.create(
        model=default_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"summary": resp.choices[0].message.content}
