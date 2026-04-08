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
    is_auto_created = Column(Boolean, default=False)
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
    chunks = relationship("SourceChunk", back_populates="source", cascade="all, delete-orphan")

class SourceChunk(Base):
    __tablename__ = "source_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), index=True) # For cross-source filtering
    content_text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True) # Stores List[float]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("Source", back_populates="chunks")

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
    source_id = Column(String, ForeignKey("sources.id"), nullable=True)  # NULL for global chat
    category_id = Column(String, ForeignKey("categories.id"), nullable=True) # Learning Path grouping
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("Source", backref="chat_messages")
    category = relationship("Category", backref="chat_messages")
    user = relationship("User", backref="chat_messages")

class OTP(Base):
    __tablename__ = "otps"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, index=True)
    code = Column(String)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    attempts = Column(Integer, default=0)

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    key = Column(String, index=True)
    value = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="settings")

class Curriculum(Base):
    __tablename__ = "curriculums"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    goal = Column(String)
    phases = Column(JSON, nullable=True) # Overall phase strategy
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", backref="curriculum")
    category = relationship("Category", backref="curriculum")
    nodes = relationship("CurriculumNode", back_populates="curriculum", cascade="all, delete-orphan")

class CurriculumNode(Base):
    __tablename__ = "curriculum_nodes"

    id = Column(String, primary_key=True, default=generate_uuid)
    curriculum_id = Column(String, ForeignKey("curriculums.id"))
    parent_id = Column(String, ForeignKey("curriculum_nodes.id"), nullable=True)
    
    title = Column(String)
    description = Column(Text, nullable=True)
    phase = Column(String) # Foundation, Core, Advanced, Applied
    sequence_order = Column(Integer, default=0)
    
    # Mastery Tracking
    status = Column(String, default="locked") # locked, unlocked, in_progress, mastered
    mastery_score = Column(Integer, default=0)
    
    # Research Intel (for Scout Agent)
    search_requirements = Column(JSON, nullable=True) # Specific queries or topics to hunt for
    suggested_resources = Column(JSON, nullable=True) # Linked sources found by Scout
    lesson_content = Column(JSON, nullable=True) # AI-generated lesson (Article, Code, etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    curriculum = relationship("Curriculum", back_populates="nodes")
