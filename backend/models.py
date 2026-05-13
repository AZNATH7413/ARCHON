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
    hashed_password = Column(String)
    is_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    full_name = Column(String)
    profile_picture = Column(String, nullable=True)
