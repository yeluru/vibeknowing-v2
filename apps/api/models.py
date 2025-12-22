from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    role = Column(String, nullable=True)
    accepted_sms_terms = Column(Boolean, default=False)
    
    # OAuth fields
    provider = Column(String, default="email")  # email, google, github
    provider_id = Column(String, nullable=True) # Unique ID from provider
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("Project", back_populates="owner")
    categories = relationship("Category", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    owner_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="categories")
    projects = relationship("Project", back_populates="category")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"))
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    category = relationship("Category", back_populates="projects")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="project", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    type = Column(String) # youtube, pdf, web, text
    url = Column(String, nullable=True)
    title = Column(String, nullable=True)
    content_text = Column(Text, nullable=True) # Full transcript or extracted text
    summary = Column(Text, nullable=True) # AI-generated summary
    meta_data = Column(JSON, nullable=True) # Duration, author, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="sources")

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    source_id = Column(String, ForeignKey("sources.id"), nullable=True) # Link to specific source if applicable
    type = Column(String) # summary, quiz, flashcard, article, linkedin_post, diagram
    title = Column(String, nullable=True)
    content = Column(JSON) # Structured content (e.g. Q&A list, or markdown text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="artifacts")
    source = relationship("Source", backref="artifacts")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, ForeignKey("sources.id"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("Source", backref="chat_messages")

class OTP(Base):
    __tablename__ = "otps"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, index=True)
    code = Column(String)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    attempts = Column(Integer, default=0)
