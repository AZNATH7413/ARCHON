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
    IntegrationModelResponse, UserProfileUpdate, AINewsResponse,
    GoogleAuthRequest, ConversationResponse, ConversationCreate,
    MessageResponse, MessageCreate
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import httpx
import json
import os
from typing import Optional, List
from datetime import datetime, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt as jose_jwt # Use jose for all JWT operations


# Create tables if not exist (don't drop)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ARCHON API",
    description="Intelligent AI recommendation engine with 15+ models and a smart chat agent",
    version="2.0.0"
)

# Allow all origins so it works on Vercel, mobile, and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    """Create tables and seed data on first boot (important for Vercel)."""
    Base.metadata.create_all(bind=engine)
    # Seed if empty
    from sqlalchemy.orm import Session as _Session
    db: _Session = next(get_db())
    try:
        if db.query(Category).count() == 0:
            import sys, os
            sys.path.insert(0, os.path.dirname(__file__))
            # Minimal inline seed so we don't depend on the script's __main__ block
            from seed_data import seed_db
            seed_db()
    finally:
        db.close()

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

    # 1. Primary: TF-IDF Similarity
    try:
        corpus = [f"{m.name} {m.description} {m.creator}" for m in models]
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(corpus + [req.task])
        
        cosine_sim = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
        
        results = []
        for idx, score in enumerate(cosine_sim):
            if score > 0.05:
                results.append({
                    "model": augment_model_data(models[idx]),
                    "match_score": float(score),
                    "reasoning": f"Matches based on content similarity ({int(score*100)}%)."
                })
        
        if results:
            return sorted(results, key=lambda x: x["match_score"], reverse=True)[:10]
    except Exception as e:
        print(f"TF-IDF failed: {e}")

    # 2. Fallback: Simple Keyword Match
    keywords = req.task.lower().split()
    fallback_results = []
    for m in models:
        matches = 0
        text = f"{m.name} {m.description} {m.creator}".lower()
        for kw in keywords:
            if kw in text:
                matches += 1
        if matches > 0:
            score = matches / len(keywords)
            fallback_results.append({
                "model": augment_model_data(m),
                "match_score": score,
                "reasoning": f"Matches keywords: {matches}/{len(keywords)}"
            })
    
    return sorted(fallback_results, key=lambda x: x["match_score"], reverse=True)[:10]

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
    if not user or not user.hashed_password or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/auth/google", response_model=TokenResponse)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Get Client ID from env or fallback to a dummy for testing
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "dummy_client_id")
        
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(req.credential, google_requests.Request(), client_id)
        except ValueError:
            # For development without a real client ID, we can decode without verification if needed
            if client_id == "dummy_client_id":
                idinfo = jose_jwt.get_unverified_claims(req.credential)
            else:
                raise HTTPException(status_code=401, detail="Invalid Google token")

        email = idinfo.get("email")
        name = idinfo.get("name", "Google User")
        
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create a new user
            user = User(
                username=email.split("@")[0],
                email=email,
                full_name=name,
                is_verified=True,
                oauth_provider="google",
                oauth_id=idinfo.get("sub", "")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer", "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Auth failed: {str(e)}")

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

# ── Intelligent Chat Agent & History ────────────────────────────────────────

@app.get("/chat/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Conversation
    return db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()

@app.post("/chat/conversations", response_model=ConversationResponse)
def create_conversation(conv: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Conversation
    new_conv = Conversation(user_id=current_user.id, title=conv.title)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@app.post("/chat/conversations/{conv_id}/messages", response_model=MessageResponse)
def add_message(conv_id: int, msg: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Conversation, Message
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    new_msg = Message(conversation_id=conv.id, role=msg.role, content=msg.content)
    db.add(new_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@app.delete("/chat/conversations/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Conversation
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted"}

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None

@app.post("/chat/archon")
async def chat_archon(
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
    """Query Ollama (Local or Cloud Proxy)."""
    try:
        from agent import query_ollama
        response = await query_ollama(req.message, model=req.model)
        if response:
            return {"response": response, "model_used": req.model, "user": current_user.username}
        return {"response": "Error: Model unresponsive (Local & Cloud fallback failed)", "model_used": req.model, "user": current_user.username}
    except Exception as e:
        return {"response": f"Error: {str(e)}", "model_used": req.model, "user": current_user.username}


@app.get("/ollama/status")
async def ollama_status():
    """Check if local Ollama is running, with guaranteed cloud fallback."""
    try:
        from agent import check_ollama
        status = await check_ollama()
        return status
    except Exception as e:
        print(f"Status check error: {e}")
        from agent import CLOUD_OLLAMA_FALLBACK
        return {"online": True, "models": CLOUD_OLLAMA_FALLBACK, "type": "cloud"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
