from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import GoogleToken
from openai import OpenAI
import os

router = APIRouter(prefix="/api/gmail", tags=["gmail"])

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
        session.commit()


@router.get("/status")
def status(session: Session = Depends(get_session)):
    token = session.exec(select(GoogleToken)).first()
    return {"connected": token is not None}


@router.get("/digest")
def email_digest(session: Session = Depends(get_session)):
    from googleapiclient.discovery import build
    creds = _get_creds(session)
    if not creds:
        raise HTTPException(401, "Not connected. Connect via the Calendar panel first.")
    _refresh_if_needed(creds, session)

    service = build("gmail", "v1", credentials=creds)
    results = service.users().messages().list(userId="me", maxResults=10, q="is:unread").execute()

    emails = []
    for msg in results.get("messages", []):
        m = service.users().messages().get(
            userId="me", id=msg["id"], format="metadata",
            metadataHeaders=["Subject", "From", "Date"],
        ).execute()
        headers = {h["name"]: h["value"] for h in m["payload"]["headers"]}
        emails.append({
            "id": msg["id"],
            "subject": headers.get("Subject", "(no subject)"),
            "from_": headers.get("From", ""),
            "date": headers.get("Date", ""),
            "snippet": m.get("snippet", ""),
        })
    return {"emails": emails}


@router.post("/ai/todos")
def extract_todos(session: Session = Depends(get_session)):
    from googleapiclient.discovery import build
    creds = _get_creds(session)
    if not creds:
        raise HTTPException(401, "Not connected. Connect via the Calendar panel first.")
    _refresh_if_needed(creds, session)

    service = build("gmail", "v1", credentials=creds)
    results = service.users().messages().list(userId="me", maxResults=15, q="is:unread").execute()

    snippets = []
    for msg in results.get("messages", []):
        m = service.users().messages().get(
            userId="me", id=msg["id"], format="metadata",
            metadataHeaders=["Subject"],
        ).execute()
        subject = next((h["value"] for h in m["payload"]["headers"] if h["name"] == "Subject"), "")
        snippet = m.get("snippet", "")
        if subject or snippet:
            snippets.append(f"Subject: {subject}\nPreview: {snippet}")

    if not snippets:
        return {"todos": "No unread emails found."}

    prompt = f"""Scan these emails and extract concrete action items I need to do:

{chr(10).join(snippets[:10])}

List only things I need to DO, numbered. Format: number. Task — from: [context]
If there are none, say so clearly."""

    resp = _client().chat.completions.create(
        model=_model(), messages=[{"role": "user", "content": prompt}],
    )
    return {"todos": resp.choices[0].message.content}
