from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class CategoryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None

class ReviewBase(BaseModel):
    model_id: int
    rating: float
    text: str

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class AIModelBase(BaseModel):
    id: int
    name: str
    description: str
    creator: str
    url: Optional[str] = None
    pricing: str
    coding_score: float
    reasoning_score: float
    creative_score: float
    category_id: int

class AIModelResponse(AIModelBase):
    model_config = ConfigDict(from_attributes=True)
    category: Optional[CategoryBase] = None
    externalLink: Optional[str] = None
    hasEmbedded: bool = False

class IntegrationModelResponse(AIModelBase):
    model_config = ConfigDict(from_attributes=True)
    externalLink: Optional[str] = None
    hasEmbedded: bool = False
    icon: Optional[str] = None

class RecommendRequest(BaseModel):
    task: str
    category: Optional[str] = None

class RecommendationResponse(BaseModel):
    model: AIModelResponse
    match_score: float

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    full_name: str
    is_verified: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None

class AINewsItem(BaseModel):
    title: str
    snippet: str
    url: Optional[str] = None
    source: Optional[str] = "DuckDuckGo"

class AINewsResponse(BaseModel):
    news: List[AINewsItem]
    timestamp: datetime

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class ConversationBase(BaseModel):
    title: str

class ConversationCreate(ConversationBase):
    pass

class ConversationResponse(ConversationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

class GoogleAuthRequest(BaseModel):
    credential: str
