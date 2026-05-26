import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean
from sqlalchemy.sql import func
from backend.db.supabase_client import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(
        String, 
        nullable=False, 
        default="applied", 
        server_default="applied"
    )
    notes = Column(String, nullable=True)
    job_id = Column(String, nullable=True)
    fit_score = Column(Integer, nullable=True)
    applied_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(), 
        default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(), 
        default=func.now(), 
        onupdate=func.now()
    )

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(), 
        default=func.now()
    )

class Todo(Base):
    __tablename__ = "todos"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=True)
    done = Column(Boolean, nullable=False, default=False, server_default="0")
    goal_id = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now()
    )

class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    target_date = Column(Date, nullable=True)
    progress = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now()
    )
