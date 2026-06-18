from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    icon: str = "🤖"
    name: str
    status: str = "planned"  # live | connected | partial | planned
    description: str = ""
    prompt: str = ""


class AgentUpdate(SQLModel):
    icon: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None


class Chore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    frequency: str = "weekly"  # daily | weekly | monthly
    last_done: Optional[datetime] = None
    notes: Optional[str] = None


class ChoreCreate(SQLModel):
    name: str
    frequency: str = "weekly"
    notes: Optional[str] = None


class ChoreUpdate(SQLModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    last_done: Optional[datetime] = None
    notes: Optional[str] = None


class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    notes: Optional[str] = None
    priority: str = "medium"  # low | medium | high
    status: str = "todo"      # todo | in_progress | done
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now)


class TodoCreate(SQLModel):
    title: str
    notes: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None


class TodoUpdate(SQLModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class NewsSource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    url: str
    category: str = "general"


class GoogleToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    access_token: str
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    scopes: str = ""
