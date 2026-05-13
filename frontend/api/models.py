from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)

    models = relationship("AIModel", back_populates="category")


class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    creator = Column(String)
    url = Column(String, nullable=True)
    pricing = Column(String)
    coding_score = Column(Float, default=0.0)
    reasoning_score = Column(Float, default=0.0)
    creative_score = Column(Float, default=0.0)
    category_id = Column(Integer, ForeignKey("categories.id"))

    category = relationship("Category", back_populates="models")
    benchmarks = relationship("Benchmark", back_populates="ai_model")
    reviews = relationship("Review", back_populates="ai_model")


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"))
    metric_name = Column(String, index=True)
    score = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ai_model = relationship("AIModel", back_populates="benchmarks")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"))
    rating = Column(Float)
    text = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ai_model = relationship("AIModel", back_populates="reviews")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    full_name = Column(String)
    profile_picture = Column(String, nullable=True)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")
