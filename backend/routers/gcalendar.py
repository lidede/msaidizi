from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from database import get_session
from models import GoogleToken
from openai import OpenAI
from datetime import datetime, timezone
import json
import os

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


def _callback_uri():
    return f"{os.getenv('APP_BASE_URL', 'http://localhost:8000')}/api/calendar/callback"


def _get_flow():
    from google_auth_oauthlib.flow import Flow
    return Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [_callback_uri()],
            }
        },
        scopes=_SCOPES,
        redirect_uri=_callback_uri(),
    )


def _get_creds(session: Session):
    from google.oauth2.credentials import Credentials
    token = session.exec(select(GoogleToken)).first()
    if not token:
        return None
    creds = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=_SCOPES,
    )
    if token.token_expiry:
        creds.expiry = token.token_expiry
    return creds


def _refresh_if_needed(creds, session: Session):
    from google.auth.transport.requests import Request
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token = session.exec(select(GoogleToken)).first()
        token.access_token = creds.token
        token.token_expiry = creds.expiry
        session.commit()


@router.get("/status")
def status(session: Session = Depends(get_session)):
    token = session.exec(select(GoogleToken)).first()
    return {"connected": token is not None}


@router.get("/auth")
def auth():
    if not os.getenv("GOOGLE_CLIENT_ID"):
        raise HTTPException(503, "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")
    url, _ = _get_flow().authorization_url(prompt="consent", access_type="offline")
    return RedirectResponse(url)


@router.get("/callback")
def callback(code: str, session: Session = Depends(get_session)):
    flow = _get_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    token = session.exec(select(GoogleToken)).first()
    if not token:
        token = GoogleToken(access_token="")
        session.add(token)

    token.access_token = creds.token
    token.refresh_token = creds.refresh_token
    token.scopes = json.dumps(list(creds.scopes or []))
    token.token_expiry = creds.expiry
    session.commit()

    frontend = os.getenv("APP_FRONTEND_URL", os.getenv("APP_BASE_URL", "http://localhost:5173"))
    return RedirectResponse(f"{frontend}/?connected=google")


@router.get("/events")
def list_events(session: Session = Depends(get_session)):
    from googleapiclient.discovery import build
    creds = _get_creds(session)
    if not creds:
        raise HTTPException(401, "Not connected to Google Calendar")
    _refresh_if_needed(creds, session)

    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc).isoformat()
    result = service.events().list(
        calendarId="primary", timeMin=now,
        maxResults=10, singleEvents=True, orderBy="startTime",
    ).execute()

    return {"events": [
        {
            "id": e["id"],
            "title": e.get("summary", "(no title)"),
            "start": e["start"].get("dateTime", e["start"].get("date", "")),
            "location": e.get("location", ""),
        }
        for e in result.get("items", [])
    ]}


@router.post("/ai/plan")
def ai_plan(session: Session = Depends(get_session)):
    from googleapiclient.discovery import build
    creds = _get_creds(session)
    if not creds:
        raise HTTPException(401, "Not connected to Google Calendar")
    _refresh_if_needed(creds, session)

    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc).isoformat()
    result = service.events().list(
        calendarId="primary", timeMin=now,
        maxResults=15, singleEvents=True, orderBy="startTime",
    ).execute()

    lines = [
        f"- {e['start'].get('dateTime', e['start'].get('date', ''))[:16]}: {e.get('summary', '(no title)')}"
        for e in result.get("items", [])
    ]
    if not lines:
        return {"analysis": "Your calendar is clear — no upcoming events found."}

    prompt = f"""Upcoming calendar events:
{chr(10).join(lines)}

Give a brief schedule analysis (3-4 sentences):
1. What the week looks like overall
2. Any concerns (conflicts, too packed, long gaps)
3. One tip to make the most of this schedule"""

    resp = _client().chat.completions.create(
        model=_model(), messages=[{"role": "user", "content": prompt}],
    )
    return {"analysis": resp.choices[0].message.content}


@router.delete("/disconnect")
def disconnect(session: Session = Depends(get_session)):
    token = session.exec(select(GoogleToken)).first()
    if token:
        session.delete(token)
        session.commit()
    return {"ok": True}
