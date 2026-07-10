from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from database import get_session
from models import Todo
from openai import OpenAI
import httpx
import json
import os

router = APIRouter(prefix="/api/pocket", tags=["pocket"])

_BASE = "https://public.heypocketai.com/api/v1/public"


def _headers():
    key = os.getenv("POCKET_API_KEY")
    if not key:
        raise HTTPException(503, "POCKET_API_KEY not configured — add it to .env")
    return {"Authorization": f"Bearer {key}"}


def _ai():
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model():
    return os.getenv("GREENPT_MODEL", "gemma4")


def _get_transcript(recording_id: str) -> tuple[str, str]:
    r = httpx.get(f"{_BASE}/recordings/{recording_id}", headers=_headers(), timeout=15)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Pocket API error: {r.text}")
    d = r.json().get("data") or r.json()
    title = d.get("title", "Recording")
    transcript = d.get("transcript") or {}
    text = transcript.get("text", "") if isinstance(transcript, dict) else str(transcript)
    if not text:
        raise HTTPException(422, "This recording has no transcript yet")
    return title, text


@router.get("/recordings")
def list_recordings():
    r = httpx.get(f"{_BASE}/recordings", headers=_headers(), timeout=15)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Pocket API error: {r.text}")
    return r.json()


@router.get("/recordings/{recording_id}")
def get_recording(recording_id: str):
    r = httpx.get(f"{_BASE}/recordings/{recording_id}", headers=_headers(), timeout=15)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Pocket API error: {r.text}")
    return r.json()


class SearchBody(BaseModel):
    query: str


@router.post("/search")
def search_recordings(body: SearchBody):
    r = httpx.post(f"{_BASE}/search", json={"query": body.query}, headers=_headers(), timeout=15)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Pocket API error: {r.text}")
    return r.json()


@router.post("/recordings/{recording_id}/ai/summarise")
def ai_summarise(recording_id: str):
    title, text = _get_transcript(recording_id)
    prompt = f"""Write a concise prose summary (2-4 paragraphs) of the following meeting/conversation titled "{title}". Cover what was discussed, any decisions made, and key outcomes. Write in plain English as if briefing someone who wasn't there.

Transcript:
{text[:6000]}"""
    resp = _ai().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"summary": resp.choices[0].message.content}


@router.post("/recordings/{recording_id}/ai/extract-tasks")
def ai_extract_tasks(recording_id: str, session: Session = Depends(get_session)):
    title, text = _get_transcript(recording_id)
    prompt = f"""You are extracting action items from a meeting/conversation recording titled "{title}".

Return ONLY a valid JSON object in this exact format with no extra text:
{{
  "tasks": [
    {{"title": "task description", "priority": "high|medium|low", "notes": "optional context"}}
  ]
}}

Rules:
- Only include concrete action items someone needs to do
- Keep titles short and actionable (start with a verb)
- Set priority: high = urgent/time-sensitive, low = nice-to-have, medium = everything else
- notes field is optional — only include if context is genuinely useful
- Return an empty tasks array if there are no clear action items

Transcript:
{text[:6000]}"""

    resp = _ai().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.choices[0].message.content.strip()

    # strip markdown code fences if model wraps in ```json
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        raise HTTPException(502, f"AI returned unparseable response: {raw[:200]}")

    created = []
    for t in parsed.get("tasks", []):
        if not t.get("title"):
            continue
        todo = Todo(
            title=t["title"],
            priority=t.get("priority", "medium"),
            notes=t.get("notes") or None,
        )
        session.add(todo)
        created.append(todo)
    session.commit()
    for todo in created:
        session.refresh(todo)

    return {"created": len(created), "tasks": [{"id": t.id, "title": t.title, "priority": t.priority, "notes": t.notes} for t in created]}
