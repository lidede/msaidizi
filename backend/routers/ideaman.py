from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os

router = APIRouter(prefix="/api/ideaman", tags=["ideaman"])


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


class IdeaRequest(BaseModel):
    topic: str
    context: str = ""


@router.post("/generate")
def generate_ideas(req: IdeaRequest):
    context = f"\nAdditional context: {req.context}" if req.context else ""
    prompt = f"""Generate 5 fresh, creative ideas about: {req.topic}{context}

Rules:
- Each idea should be surprising or non-obvious — push outside the first thing that comes to mind
- Cover different angles: one practical, one social, one tech-driven, one creative, one wildcard
- 2-3 sentences per idea: what it is and why it's interesting
- Number each idea"""

    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"ideas": resp.choices[0].message.content}
