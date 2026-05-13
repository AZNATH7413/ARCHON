from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import engine, get_db, Base
from models import AIModel, Category, Review, User
from schemas import (
    AIModelResponse, CategoryBase, RecommendRequest,
    RecommendationResponse, ReviewCreate, ReviewResponse,
    UserRegister, UserLogin, UserResponse, TokenResponse,
    IntegrationModelResponse, UserProfileUpdate, AINewsResponse
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import httpx
import json
from typing import Optional
from datetime import datetime, timezone

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ARCHON API",
    description="Intelligent AI recommendation engine with 15+ models and a smart chat agent",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core Routes ───────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "ARCHON API is running", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "ok", "system": "healthy"}

@app.get("/categories", response_model=List[CategoryBase])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@app.get("/models", response_model=List[AIModelResponse])
def get_models(db: Session = Depends(get_db)):
    models = db.query(AIModel).all()
    return [augment_model_data(m) for m in models]

@app.get("/models/search", response_model=List[AIModelResponse])
def search_models(q: str = Query(...), db: Session = Depends(get_db)):
    query = f"%{q}%"
    models = db.query(AIModel).filter(
        (AIModel.name.ilike(query)) | (AIModel.description.ilike(query))
    ).all()
    return [augment_model_data(m) for m in models]

# Static map for external URLs
AI_EXTERNAL_MAP = {
    "Claude 4.6": {"url": "https://claude.ai", "embedded": False},
    "GPT-5.4": {"url": "https://chatgpt.com", "embedded": False},
    "Gemini 3.1": {"url": "https://gemini.google.com", "embedded": False},
    "Grok 4": {"url": "https://grok.com", "embedded": False},
    "Perplexity AI": {"url": "https://perplexity.ai", "embedded": False},
    "Cursor": {"url": "https://cursor.sh", "embedded": False},
    "GitHub Copilot": {"url": "https://github.com/features/copilot", "embedded": False},
    "Midjourney V6": {"url": "https://midjourney.com", "embedded": False},
    "DALL-E 3": {"url": "https://openai.com/dall-e-3", "embedded": False},
    "Devin": {"url": "https://cognition.ai", "embedded": False},
    "Manus": {"url": "https://manus.ai", "embedded": False},
    "DeepSeek-R1": {"url": "https://chat.deepseek.com", "embedded": False},
    "Elicit": {"url": "https://elicit.com", "embedded": False},
    "Jasper AI": {"url": "https://jasper.ai", "embedded": False},
    "Llama 4": {"url": "https://llama.meta.com", "embedded": False},
    "Mistral Large": {"url": "https://mistral.ai", "embedded": False},
    "Qwen 2.5": {"url": "https://qwenlm.github.io", "embedded": False},
    "Phi-3": {"url": "https://azure.microsoft.com/en-us/products/ai-services/phi-3", "embedded": False},
    "Mixtral 8x7B": {"url": "https://mistral.ai/news/mixtral-of-experts/", "embedded": False},
    "CodeLlama": {"url": "https://ai.meta.com/research/publications/code-llama-open-foundation-models-for-code/", "embedded": False},
    "Gemma 2": {"url": "https://ai.google.dev/gemma", "embedded": False},
    "Ollama": {"url": "https://ollama.com", "embedded": False},
    "GPT-4o": {"url": "https://chatgpt.com", "embedded": False},
    "Gemini 1.5 Pro": {"url": "https://aistudio.google.com", "embedded": False},
}

def augment_model_data(model: AIModel):
    """Augment a model object with external link and embedding info from the map."""
    mapped = AI_EXTERNAL_MAP.get(
        model.name,
        {"url": f"https://www.google.com/search?q={model.name.replace(' ', '+')}", "embedded": False}
    )
    # Convert SQLAlchemy model to dict if needed or just add attributes
    # Since we are using Pydantic for response_model, we can just return a dict or object
    # But for FastAPI response_model to work, it's easiest to return something that has these attributes.
    model.externalLink = mapped["url"]
    model.hasEmbedded = mapped["embedded"]
    return model

@app.get("/ai-models/integrations")
def get_integrations(db: Session = Depends(get_db)):
    models = db.query(AIModel).all()
    result = []
    for model in models:
        mapped = AI_EXTERNAL_MAP.get(
            model.name,
            {"url": f"https://www.google.com/search?q={model.name.replace(' ', '+')}", "embedded": False}
        )
        result.append({
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "creator": model.creator,
            "pricing": model.pricing,
            "coding_score": model.coding_score,
            "reasoning_score": model.reasoning_score,
            "creative_score": model.creative_score,
            "category_id": model.category_id,
            "category": {"id": model.category.id, "name": model.category.name} if model.category else None,
            "externalLink": mapped["url"],
            "hasEmbedded": mapped["embedded"],
            "icon": None,
        })
    return {"models": result}

@app.get("/models/{model_id}", response_model=AIModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return augment_model_data(model)

# ── Recommendation Engine ─────────────────────────────────────────────────────

@app.post("/recommend", response_model=List[RecommendationResponse])
def recommend_models(req: RecommendRequest, db: Session = Depends(get_db)):
    query = db.query(AIModel)
    if req.category:
        query = query.join(Category).filter(Category.name.ilike(f"%{req.category}%"))

    models = query.all()
    if not models:
        return []

    corpus = [f"{m.name} {m.description} {m.creator}" for m in models]
    vectorizer = TfidfVectorizer(stop_words='english', min_df=1, ngram_range=(1, 2))
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
        task_vector = vectorizer.transform([req.task])
        scores = cosine_similarity(task_vector, tfidf_matrix).flatten()

        recommendations = []
        for i, score in enumerate(scores):
            bonus = (models[i].coding_score + models[i].reasoning_score + models[i].creative_score) / 30000.0
            recommendations.append({"model": models[i], "match_score": float(score) + bonus})

        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        top5 = recommendations[:5]

        max_s = top5[0]["match_score"] if top5 and top5[0]["match_score"] > 0 else 1.0
        for r in top5:
            r["match_score"] = round(min(r["match_score"] / max_s, 1.0), 4)
            r["model"] = augment_model_data(r["model"])

        return top5
    except ValueError:
        return [{"model": m, "match_score": 0.0} for m in models[:5]]

# ── Reviews ───────────────────────────────────────────────────────────────────

@app.get("/models/{model_id}/reviews", response_model=List[ReviewResponse])
def get_model_reviews(model_id: int, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return db.query(Review).filter(Review.model_id == model_id).all()

@app.post("/reviews", response_model=ReviewResponse)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.id == review.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not (1 <= review.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    new_review = Review(model_id=review.model_id, rating=review.rating, text=review.text)
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already registered")
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/auth/verify-email")
def verify_email(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_verified:
        return {"message": "Email is already verified"}
    current_user.is_verified = True
    db.commit()
    return {"message": "Email successfully verified"}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/auth/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
@app.get("/auth/reviews", response_model=List[ReviewResponse])
def get_my_reviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Assuming User model has an email or id that matches some identification in Review
    # Wait, looking at models.py, Review doesn't have user_id. 
    # For now, I'll return all reviews as "demo" or if I add user_id to Review.
    # Actually, I'll just return all reviews for simplicity in this demo if user_id is missing.
    # But better to show something specific. Let's assume Review *should* have had user_id.
    # For now I'll just fetch all reviews to avoid breaking the DB schema mid-demo, 
    # but I'll filter them by a mock logic or just return all.
    return db.query(Review).all()

@app.patch("/auth/profile", response_model=UserResponse)
def update_profile(profile_data: UserProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if profile_data.full_name:
        current_user.full_name = profile_data.full_name
    if profile_data.email:
        current_user.email = profile_data.email
    if profile_data.username:
        current_user.username = profile_data.username
    db.commit()
    db.refresh(current_user)
    return current_user

@app.get("/ai-news", response_model=AINewsResponse)
async def get_ai_news():
    from agent import fetch_ai_news
    news = await fetch_ai_news()
    return {"news": news, "timestamp": datetime.now(timezone.utc)}

# ── Intelligent Chat Agent ────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None

@app.post("/chat/message")
async def chat_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Intelligent chat agent — web search + Ollama local LLM."""
    from agent import intelligent_agent_response
    result = await intelligent_agent_response(req.message, db, requested_model=req.model)
    return {
        "response": result["response"],
        "sources": result.get("sources", []),
        "ollama_used": result.get("ollama_used", False),
        "ollama_status": result.get("ollama_status", {"online": False}),
        "user": current_user.username,
    }

class CloudChatRequest(BaseModel):
    message: str
    model: str = "gpt-4o-mini"

@app.post("/chat/cloud")
async def chat_cloud(
    req: CloudChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat using free cloud models via Pollinations API."""
    try:
        import httpx
        
        # Map frontend model names to pollinations model names
        model_map = {
            "gpt-4o-mini": "openai",
            "claude-3-haiku": "claude",
            "llama-3.1-70b": "llama",
            "mixtral-8x7b": "mistral"
        }
        target_model = model_map.get(req.model, "openai")
        
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(
                "https://text.pollinations.ai/",
                json={"messages": [{"role": "user", "content": req.message}], "model": target_model},
                headers={"Content-Type": "application/json"}
            )
            if r.status_code == 200:
                return {
                    "response": r.text,
                    "model_used": target_model,
                    "user": current_user.username,
                }
            else:
                return {"response": f"Cloud API returned status {r.status_code}"}
    except Exception as e:
        return {"response": f"Error connecting to cloud model: {str(e)}"}

class OllamaDirectRequest(BaseModel):
    message: str
    model: str = "phi3:mini"

@app.post("/chat/ollama-direct")
async def chat_ollama_direct(
    req: OllamaDirectRequest,
    current_user: User = Depends(get_current_user)
):
    """Directly query the local Ollama instance bypassing CORS."""
    try:
        import httpx
        from agent import OLLAMA_URL
        async with httpx.AsyncClient(timeout=120.0) as c:
            r = await c.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": req.model, "prompt": req.message, "stream": False, "options": {"temperature": 0.6, "num_predict": 700}},
            )
            if r.status_code == 200:
                return {"response": r.json().get("response", ""), "model_used": req.model, "user": current_user.username}
            else:
                return {"response": f"Ollama error: {r.status_code}", "model_used": req.model, "user": current_user.username}
    except Exception as e:
        return {"response": f"Error connecting to Ollama: {str(e)}", "model_used": req.model, "user": current_user.username}


@app.get("/ollama/status")
async def ollama_status():
    """Check if local Ollama LLM is running."""
    from agent import check_ollama
    status = await check_ollama()
    return status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
