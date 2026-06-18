from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from database import create_db, engine
from models import Agent
from sqlmodel import Session, select
from routers import agents, chores, ai
from routers import todos, adhd, ideaman, edu, weather, news, gcalendar, gmail

INITIAL_AGENTS = [
    Agent(icon="✓",  name="Todo manager",           status="live",      description="Task capture, tracking & AI prioritisation",        prompt="Open my todo list"),
    Agent(icon="📅", name="Family calendar",         status="connected", description="Shared family schedule via Google Calendar",         prompt="Show me this week's family calendar"),
    Agent(icon="📧", name="Email assistant",         status="connected", description="Scan Gmail for todos & calendar events",             prompt="Scan my email for todos and calendar events"),
    Agent(icon="📝", name="Note taker & researcher", status="partial",   description="Idea → context → async research",                    prompt="Help me research an idea"),
    Agent(icon="🛒", name="Wishlist manager",        status="planned",   description="Track items & price changes over time",              prompt="Help me build a wishlist tracker"),
    Agent(icon="📊", name="Activity tracker",        status="planned",   description="Tasks, health & social balance nudges",              prompt="What should I track for my activity?"),
    Agent(icon="🧠", name="ADHD coach",              status="live",      description="Focus plans, task breakdown & accountability",        prompt="Be my ADHD coach today"),
    Agent(icon="🏠", name="Home chores manager",     status="live",      description="Track chores, due dates & AI suggestions",           prompt="Set up my home chores routine"),
    Agent(icon="📈", name="Investment tracker",      status="planned",   description="IBKR read-only + news-driven advice",                prompt="How should I set up my investment tracker?"),
    Agent(icon="📰", name="Newsman",                 status="live",      description="Curated RSS feeds + AI-summarised headlines",        prompt="What should my news sources be?"),
    Agent(icon="🗺️", name="Busyman (Haarlem)",       status="live",      description="Live weather + 5-day forecast for Haarlem",          prompt="What's happening in Haarlem this weekend?"),
    Agent(icon="✈️", name="Travel planner",          status="planned",   description="Wishlist places + trip inspiration",                 prompt="Show me my travel wishlist"),
    Agent(icon="💡", name="Ideaman",                 status="live",      description="Fresh ideas outside your bubble",                    prompt="Give me 3 ideas I wouldn't normally think of"),
    Agent(icon="🎓", name="Edu (Dutch + tech)",      status="live",      description="Daily Dutch lessons & tech tidbits",                 prompt="Teach me something in Dutch today"),
    Agent(icon="📷", name="Photoman",                status="planned",   description="Library organiser & memory maker",                   prompt="How can I organise my photo library?"),
    Agent(icon="💾", name="Backupman",               status="planned",   description="Scheduled, automated backups",                       prompt="Help me set up a backup schedule"),
    Agent(icon="🏦", name="Bankman",                 status="planned",   description="Spending patterns & financial insights",             prompt="Help me set up spending tracking"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    with Session(engine) as session:
        if not session.exec(select(Agent)).first():
            for a in INITIAL_AGENTS:
                session.add(a)
            session.commit()
    yield


app = FastAPI(title="Msaidizi API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(chores.router)
app.include_router(ai.router)
app.include_router(todos.router)
app.include_router(adhd.router)
app.include_router(ideaman.router)
app.include_router(edu.router)
app.include_router(weather.router)
app.include_router(news.router)
app.include_router(gcalendar.router)
app.include_router(gmail.router)

# Serve built frontend in production
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
