from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import NewsSource
from pydantic import BaseModel
from openai import OpenAI
import feedparser
import os

router = APIRouter(prefix="/api/news", tags=["news"])


def _client() -> OpenAI:
    key = os.getenv("GREENPT_API_KEY")
    if not key:
        raise HTTPException(500, "GREENPT_API_KEY not configured")
    return OpenAI(api_key=key, base_url=os.getenv("GREENPT_BASE_URL", "https://api.greenpt.ai/v1"))


def _model() -> str:
    return os.getenv("GREENPT_MODEL", "gemma4")


class SourceCreate(BaseModel):
    name: str
    url: str
    category: str = "general"


class SummariseRequest(BaseModel):
    headlines: list[str]


@router.get("/sources")
def list_sources(session: Session = Depends(get_session)):
    return session.exec(select(NewsSource)).all()


@router.post("/sources")
def add_source(data: SourceCreate, session: Session = Depends(get_session)):
    source = NewsSource(**data.model_dump())
    session.add(source)
    session.commit()
    session.refresh(source)
    return source


@router.delete("/sources/{source_id}")
def delete_source(source_id: int, session: Session = Depends(get_session)):
    source = session.get(NewsSource, source_id)
    if not source:
        raise HTTPException(404, "Source not found")
    session.delete(source)
    session.commit()
    return {"ok": True}


@router.get("/feed")
def get_feed(session: Session = Depends(get_session)):
    sources = session.exec(select(NewsSource)).all()
    articles = []
    for source in sources:
        try:
            feed = feedparser.parse(source.url)
            for entry in feed.entries[:5]:
                articles.append({
                    "source": source.name,
                    "category": source.category,
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", "")[:200],
                })
        except Exception:
            pass
    return {"articles": articles}


@router.post("/ai/summarise")
def summarise_news(req: SummariseRequest):
    if not req.headlines:
        return {"summary": "No headlines to summarise."}

    headlines_text = "\n".join(f"- {h}" for h in req.headlines[:20])
    prompt = f"""Here are today's news headlines:
{headlines_text}

Give a concise 3-4 sentence summary of the key themes.
Then note one story that might directly affect someone living in Haarlem, Netherlands."""

    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "user", "content": prompt}],
    )
    return {"summary": resp.choices[0].message.content}
