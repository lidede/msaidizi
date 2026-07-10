from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from datetime import date
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


_DUTCH_TOPICS = [
    "a common greeting or farewell phrase",
    "a verb and its conjugation (present tense)",
    "a word related to food or dining",
    "a phrase for shopping or everyday errands",
    "a word related to weather or seasons",
    "a phrase for expressing feelings or emotions",
    "a word related to work or the office",
    "a transport or directions phrase",
    "a Dutch idiom or expression",
    "a word related to family or relationships",
    "a phrase for making plans or appointments",
    "a word related to Dutch culture or traditions",
    "a number, date, or time expression",
    "a question word and how to use it",
]

_FRENCH_TOPICS = [
    "a common greeting or farewell phrase",
    "a verb and its conjugation (present tense)",
    "a word related to food or dining",
    "a phrase for shopping or everyday errands",
    "a word related to weather or seasons",
    "a phrase for expressing feelings or emotions",
    "a word related to work or the office",
    "a transport or directions phrase",
    "a French idiom or expression",
    "a word related to family or relationships",
    "a phrase for making plans or appointments",
    "a word related to French culture or traditions",
    "a number, date, or time expression",
    "a question word and how to use it",
]

_TECH_TOPICS = [
    "a useful terminal or shell trick",
    "a git command or workflow tip",
    "a browser devtools feature",
    "a VS Code or editor shortcut",
    "a Python or JavaScript language feature",
    "a Docker or container tip",
    "a networking or HTTP concept",
    "a security best practice",
    "a performance optimisation technique",
    "an API design pattern",
    "a regex tip or trick",
    "a useful CLI tool",
    "a database query tip",
    "a debugging technique",
]


def _day_topic(topics: list) -> str:
    return topics[date.today().toordinal() % len(topics)]


@router.get("/dutch")
def dutch_lesson():
    topic = _day_topic(_DUTCH_TOPICS)
    today = date.today().strftime("%A, %d %B %Y")
    prompt = f"""Today is {today}. Give me a Dutch language lesson focused on: {topic}.

Include:
1. The word or phrase (with pronunciation guide)
2. An example sentence in Dutch with English translation
3. A short note on when or how it is used in the Netherlands

Keep it under 120 words. Do not use markdown formatting."""
    return {"lesson": _chat(prompt)}


@router.get("/french")
def french_lesson():
    topic = _day_topic(_FRENCH_TOPICS)
    today = date.today().strftime("%A, %d %B %Y")
    prompt = f"""Today is {today}. Give me a French language lesson focused on: {topic}.

Include:
1. The word or phrase (with pronunciation guide)
2. An example sentence in French with English translation
3. A short note on when or how it is used in France

Keep it under 120 words. Do not use markdown formatting."""
    return {"lesson": _chat(prompt)}


@router.get("/tech")
def tech_tidbit():
    topic = _day_topic(_TECH_TOPICS)
    today = date.today().strftime("%A, %d %B %Y")
    prompt = f"""Today is {today}. Give me a practical tech tidbit about: {topic}.

It should be actionable (something I can try today), not just common knowledge, and under 100 words. Do not use markdown formatting."""
    return {"tidbit": _chat(prompt)}


@router.post("/ask")
def ask_question(req: AskRequest):
    subjects = {
        "dutch": "Dutch language and Dutch culture",
        "french": "French language and French culture",
        "tech": "technology and software development",
    }
    subject = subjects.get(req.subject, "the requested subject")
    prompt = f"Answer this question about {subject}: {req.question}\n\nBe clear and concise (under 150 words). Include a practical example if helpful. Do not use markdown formatting."
    return {"answer": _chat(prompt)}
