from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


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
