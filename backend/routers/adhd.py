from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os

router = APIRouter(prefix="/api/adhd", tags=["adhd"])

_SYSTEM = (
    "You are a supportive ADHD coach. Be concise, warm, and non-judgmental. "
    "Use short sentences, clear numbered steps, and avoid information overload."
)


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


class FocusRequest(BaseModel):
    context: str = ""


class BreakdownRequest(BaseModel):
    task: str


def _chat(prompt: str) -> str:
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content


@router.post("/focus")
def focus_plan(req: FocusRequest):
    context = f"\nContext: {req.context}" if req.context else ""
    prompt = f"""Give me a practical focus plan for today:{context}

1. One main goal (the thing that matters most)
2. Two supporting tasks
3. A short accountability tip for staying on track"""
    return {"reply": _chat(prompt)}


@router.post("/breakdown")
def breakdown_task(req: BreakdownRequest):
    prompt = f"""Break this task into tiny, concrete steps for someone with ADHD:

Task: {req.task}

Give 5-7 steps. Each step should take under 10 minutes and start with a verb."""
    return {"reply": _chat(prompt)}


@router.post("/checkin")
def checkin():
    prompt = (
        "Give me a warm, encouraging 2-3 sentence check-in for someone with ADHD "
        "working on tasks today. Acknowledge common struggles like distraction and task-switching."
    )
    return {"reply": _chat(prompt)}
