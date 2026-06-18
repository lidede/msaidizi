from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os

router = APIRouter(prefix="/api/edu", tags=["edu"])


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


class AskRequest(BaseModel):
    question: str
    subject: str = "dutch"


def _chat(prompt: str) -> str:
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content


@router.get("/dutch")
def dutch_lesson():
    prompt = """Give me one Dutch language lesson for today. Include:
1. A word or phrase (with pronunciation guide)
2. Example sentence in Dutch with English translation
3. A short cultural note about when/how it's used in the Netherlands
Keep it under 100 words."""
    return {"lesson": _chat(prompt)}


@router.get("/tech")
def tech_tidbit():
    prompt = """Give me one practical tech tidbit for today. It should be:
- Actionable: something I can actually use or try today
- Surprising: not just common knowledge
- Concise: under 100 words
Topics: terminal tricks, developer tools, programming patterns, web tech, keyboard shortcuts, or emerging tools."""
    return {"tidbit": _chat(prompt)}


@router.post("/ask")
def ask_question(req: AskRequest):
    subject = "Dutch language and Dutch culture" if req.subject == "dutch" else "technology and software development"
    prompt = f"Answer this question about {subject}: {req.question}\n\nBe clear and concise (under 150 words). Include a practical example if helpful."
    return {"answer": _chat(prompt)}
