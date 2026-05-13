from database import SessionLocal, engine, Base
from models import Category, AIModel, User
from auth import hash_password

def seed_db():
    db = SessionLocal()
    
    # Drop and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Add default admin user
    if not db.query(User).filter(User.email == "admin@archon.ai").first():
        admin = User(
            username="admin",
            email="admin@archon.ai",
            hashed_password=hash_password("password123"),
            full_name="Archon Admin",
            is_verified=True
        )
        db.add(admin)
        db.commit()


    categories_data = [
        {"name": "Coding & Development", "description": "AI models optimized for writing, debugging, and analyzing code."},
        {"name": "Chat & Reasoning", "description": "Conversational models with strong logical reasoning capabilities."},
        {"name": "Creative & Image", "description": "Models specialized in generating images and creative content."},
        {"name": "Research & Writing", "description": "Tools designed for analyzing documents, research, and long-form writing."},
        {"name": "Agentic & Autonomous", "description": "AI agents capable of planning and executing complex multi-step tasks autonomously."}
    ]

    for cat in categories_data:
        db.add(Category(**cat))
    db.commit()

    cat_map = {cat.name: cat.id for cat in db.query(Category).all()}

    models_data = [
        # Chat & Reasoning
        {"name": "GPT-5.4", "description": "OpenAI flagship model for chat reasoning analysis text generation language understanding and complex problem solving across all domains.", "creator": "OpenAI", "pricing": "Paid", "coding_score": 95, "reasoning_score": 98, "creative_score": 90, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Claude 4.6", "description": "Anthropic safe capable model for coding reasoning writing analysis research conversation and complex reasoning tasks with strong safety guarantees.", "creator": "Anthropic", "pricing": "Paid", "coding_score": 98, "reasoning_score": 95, "creative_score": 92, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Gemini 3.1", "description": "Google multimodal AI model for text image video reasoning chat analysis coding and complex understanding across multiple formats.", "creator": "Google", "pricing": "Freemium", "coding_score": 94, "reasoning_score": 96, "creative_score": 88, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Grok 4", "description": "xAI real-time reasoning model with internet access for current events news analysis chat and logical reasoning tasks.", "creator": "xAI", "pricing": "Paid", "coding_score": 92, "reasoning_score": 94, "creative_score": 85, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "DeepSeek-R1", "description": "DeepSeek high-performance reasoning model for mathematics logic analysis research and complex chain-of-thought problem solving.", "creator": "DeepSeek", "pricing": "Open Source", "coding_score": 88, "reasoning_score": 97, "creative_score": 80, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Llama 4", "description": "Meta open-source large language model for chat reasoning coding text generation fine-tuning and on-premise deployment.", "creator": "Meta", "pricing": "Open Source", "coding_score": 85, "reasoning_score": 88, "creative_score": 82, "category_id": cat_map["Chat & Reasoning"]},
        # Coding & Development
        {"name": "GitHub Copilot", "description": "GitHub AI coding assistant for Python JavaScript TypeScript code completion autocomplete debugging and software development in IDE.", "creator": "GitHub", "pricing": "Paid", "coding_score": 96, "reasoning_score": 75, "creative_score": 70, "category_id": cat_map["Coding & Development"]},
        {"name": "Cursor", "description": "Anysphere AI code editor for Python JavaScript coding refactoring debugging software development autocomplete and agentic code generation.", "creator": "Anysphere", "pricing": "Freemium", "coding_score": 97, "reasoning_score": 78, "creative_score": 72, "category_id": cat_map["Coding & Development"]},
        # Agentic & Autonomous
        {"name": "Manus", "description": "Meta autonomous AI agent for executing complex tasks browsing web writing code running scripts and agentic multi-step workflow automation.", "creator": "Meta", "pricing": "Paid", "coding_score": 94, "reasoning_score": 92, "creative_score": 75, "category_id": cat_map["Agentic & Autonomous"]},
        {"name": "Devin", "description": "Cognition autonomous AI software engineer for coding debugging testing deployment and end-to-end software development projects.", "creator": "Cognition", "pricing": "Paid", "coding_score": 93, "reasoning_score": 90, "creative_score": 78, "category_id": cat_map["Agentic & Autonomous"]},
        # Creative & Image
        {"name": "DALL-E 3", "description": "OpenAI image generation model for creating photorealistic artistic illustrations creative images from text prompts and visual design.", "creator": "OpenAI", "pricing": "Paid", "coding_score": 50, "reasoning_score": 60, "creative_score": 98, "category_id": cat_map["Creative & Image"]},
        {"name": "Midjourney V6", "description": "Midjourney artistic image generation model for creating stunning photorealistic and artistic visuals illustrations design from text prompts.", "creator": "Midjourney", "pricing": "Paid", "coding_score": 45, "reasoning_score": 55, "creative_score": 99, "category_id": cat_map["Creative & Image"]},
        # Research & Writing
        {"name": "Perplexity AI", "description": "Perplexity AI-powered search engine and research assistant for finding current information web search summarization and fact checking.", "creator": "Perplexity", "pricing": "Freemium", "coding_score": 75, "reasoning_score": 88, "creative_score": 70, "category_id": cat_map["Research & Writing"]},
        {"name": "Elicit", "description": "Elicit AI research assistant for analyzing academic papers literature review evidence synthesis and scientific research workflows.", "creator": "Elicit", "pricing": "Freemium", "coding_score": 60, "reasoning_score": 85, "creative_score": 65, "category_id": cat_map["Research & Writing"]},
        {"name": "Jasper AI", "description": "Jasper AI writing assistant for creating marketing copy blog posts social media content SEO writing and long-form creative content.", "creator": "Jasper", "pricing": "Paid", "coding_score": 50, "reasoning_score": 75, "creative_score": 92, "category_id": cat_map["Research & Writing"]},
        # Additional Powerful & Local/Ollama Models
        {"name": "Mistral Large", "description": "Mistral AI powerful reasoning and chat model optimized for low latency and high accuracy.", "creator": "Mistral AI", "pricing": "Open Source", "coding_score": 90, "reasoning_score": 91, "creative_score": 85, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Qwen 2.5", "description": "Alibaba robust multi-language model for reasoning, coding, and general tasks.", "creator": "Alibaba Cloud", "pricing": "Open Source", "coding_score": 91, "reasoning_score": 90, "creative_score": 82, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Phi-3", "description": "Microsoft highly efficient small language model for local execution and strong logical reasoning.", "creator": "Microsoft", "pricing": "Open Source", "coding_score": 86, "reasoning_score": 89, "creative_score": 75, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Mixtral 8x7B", "description": "Mistral sparse mixture of experts model offering high performance and fast inference for diverse tasks.", "creator": "Mistral AI", "pricing": "Open Source", "coding_score": 89, "reasoning_score": 92, "creative_score": 80, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "CodeLlama", "description": "Meta specialized language model optimized specifically for generating, analyzing, and debugging code.", "creator": "Meta", "pricing": "Open Source", "coding_score": 95, "reasoning_score": 85, "creative_score": 70, "category_id": cat_map["Coding & Development"]},
        {"name": "Gemma 2", "description": "Google lightweight open-source model built from the same research and technology as Gemini.", "creator": "Google", "pricing": "Open Source", "coding_score": 87, "reasoning_score": 88, "creative_score": 78, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Ollama", "description": "Local AI model runner that brings powerful open-source models like Llama 3 directly to your machine for offline execution.", "creator": "Ollama", "pricing": "Open Source", "coding_score": 88, "reasoning_score": 88, "creative_score": 80, "category_id": cat_map["Agentic & Autonomous"]},
        # The Ultimate Omni Models
        {"name": "GPT-4o", "description": "OpenAI's flagship omni model. The absolute best and most powerful AI capable of answering anything across all domains: text, audio, image, and video.", "creator": "OpenAI", "pricing": "Paid", "coding_score": 99, "reasoning_score": 99, "creative_score": 99, "category_id": cat_map["Chat & Reasoning"]},
        {"name": "Gemini 1.5 Pro", "description": "Google's most capable model featuring a massive context window, able to analyze entire codebases and books to answer anything.", "creator": "Google", "pricing": "Paid", "coding_score": 98, "reasoning_score": 98, "creative_score": 96, "category_id": cat_map["Chat & Reasoning"]}
    ]

    for model_data in models_data:
        db.add(AIModel(**model_data))

    db.commit()
    db.close()
    print("Database seeded successfully with 15 AI models!")

if __name__ == "__main__":
    seed_db()
