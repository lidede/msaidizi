from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os

router = APIRouter(prefix="/api/pocket", tags=["pocket"])

_BASE = "https://public.heypocketai.com/api/v1/public"


def _headers():
    key = os.getenv("POCKET_API_KEY")
    if not key:
        raise HTTPException(503, "POCKET_API_KEY not configured — add it to .env")
    return {"Authorization": f"Bearer {key}"}


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
