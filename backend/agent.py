import httpx
import re
import json
from datetime import datetime
from models import AIModel


# ── Config ────────────────────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODELS = ["phi3:mini", "phi3", "phi", "mistral", "llama3", "llama2", "gemma", "neural-chat"]


# ── Ollama ────────────────────────────────────────────────────────────────────

async def check_ollama() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                return {"online": True, "models": models}
    except Exception:
        pass
    return {"online": False, "models": []}


async def query_ollama(prompt: str, model: str = "phi3:mini") -> str | None:
    try:
        async with httpx.AsyncClient(timeout=90.0) as c:
            r = await c.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.6, "num_predict": 700}},
            )
            if r.status_code == 200:
                return r.json().get("response", "").strip()
    except Exception:
        pass
    return None


async def get_ollama_model(available: list) -> str:
    for preferred in OLLAMA_MODELS:
        for avail in available:
            if preferred.replace(":","").lower() in avail.replace(":","").lower():
                return avail
    return available[0] if available else "phi3:mini"


# ── Web Search (DuckDuckGo HTML scraper) ─────────────────────────────────────

async def real_web_search(query: str) -> list:
    """Scrape DuckDuckGo HTML search — no API key needed, returns real results."""
    results = []
    try:
        from duckduckgo_search import DDGS
        import asyncio
        ddgs = DDGS()
        # Run synchronous ddgs in a thread pool to avoid blocking async loop
        search_results = await asyncio.to_thread(ddgs.text, query, max_results=5)
        
        for res in search_results:
            if res.get("title") and res.get("body"):
                results.append({
                    "title": res.get("title", "")[:120],
                    "snippet": res.get("body", "")[:300],
                    "url": res.get("href", ""),
                })
    except Exception as e:
        print(f"Web search error: {e}")
        
    return results


# ── Database helpers ──────────────────────────────────────────────────────────

def model_summary(m: AIModel) -> str:
    avg = (m.coding_score + m.reasoning_score + m.creative_score) / 3
    return (
        f"- {m.name} by {m.creator} | {m.pricing} | Avg:{avg:.0f}/100 | "
        f"Code:{int(m.coding_score)} Reason:{int(m.reasoning_score)} Creative:{int(m.creative_score)}\n"
        f"  {m.description[:140]}"
    )


def detect_intent(msg: str) -> str:
    m = msg.lower()
    if any(w in m for w in ["hello", "hi ", "hey ", "howdy", "greetings"]): return "greeting"
    if any(w in m for w in ["help", "what can you", "commands", "capabilities"]): return "help"
    if any(w in m for w in [" vs ", " versus ", "compare", "difference between", "which is better"]): return "compare"
    if any(w in m for w in ["best for", "recommend", "suggest", "which model", "what model"]): return "recommend"
    if any(w in m for w in ["list all", "show all", "all models", "available models"]): return "list"
    if any(w in m for w in ["free model", "open source", "no cost", "cheapest", "open-source"]): return "pricing"
    if any(w in m for w in ["news", "latest", "recent", "2024", "2025", "new model", "just released"]): return "news"
    if any(w in m for w in ["cod", "python", "javascript", "debug", "programming", "developer", "software"]): return "task_coding"
    if any(w in m for w in ["image", "art", "illustrat", "dall-e", "midjourney", "stable diffusion", "draw"]): return "task_creative"
    if any(w in m for w in ["reason", "logic", "math", "analysis", "think", "complex problem"]): return "task_reasoning"
    if any(w in m for w in ["writ", "blog", "marketing", "essay", "content", "copywriting"]): return "task_writing"
    if any(w in m for w in ["research", "paper", "academic", "science", "literature", "study"]): return "task_research"
    if any(w in m for w in ["agent", "autonom", "automat", "workflow", "agentic", "multi-step"]): return "task_agent"
    return "general"


# ── Master Agent ──────────────────────────────────────────────────────────────

async def intelligent_agent_response(message: str, db, requested_model: str = None) -> dict:
    all_models = db.query(AIModel).all()
    intent = detect_intent(message)
    m_lower = message.lower()
    sources = []

    # ── Pick relevant models from DB ──────────────────────────────────────────
    matched = [m for m in all_models if m.name.lower() in m_lower]
    if not matched:
        if intent == "task_coding":
            matched = sorted(all_models, key=lambda m: m.coding_score, reverse=True)[:5]
        elif intent == "task_creative":
            matched = sorted(all_models, key=lambda m: m.creative_score, reverse=True)[:5]
        elif intent in ("task_reasoning", "task_research"):
            matched = sorted(all_models, key=lambda m: m.reasoning_score, reverse=True)[:5]
        elif intent in ("task_writing", "task_agent"):
            matched = sorted(all_models, key=lambda m: m.reasoning_score + m.creative_score, reverse=True)[:5]
        elif intent in ("compare", "recommend"):
            matched = sorted(all_models, key=lambda m: m.coding_score + m.reasoning_score + m.creative_score, reverse=True)[:6]
        else:
            matched = sorted(all_models, key=lambda m: m.coding_score + m.reasoning_score + m.creative_score, reverse=True)[:5]

    db_context = "AI Models in ARCHON database:\n" + "\n".join(model_summary(m) for m in matched)

    # ── Web search ────────────────────────────────────────────────────────────
    do_search = intent in ("news", "general") or (intent == "recommend" and len(matched) < 2)
    if do_search:
        search_q = message
        sources = await real_web_search(search_q)

    web_context = ""
    if sources:
        web_context = "\nRelevant web search results:\n" + "\n".join(
            f"[{i+1}] {s['title']}: {s['snippet'][:200]}"
            for i, s in enumerate(sources[:4])
        )

    # ── Try Ollama ────────────────────────────────────────────────────────────
    status = await check_ollama()
    ollama_used = False
    llm_response = None

    if status["online"] and status["models"]:
        if requested_model and requested_model in status["models"]:
            chosen = requested_model
        else:
            chosen = await get_ollama_model(status["models"])

        # System prompt based on intent
        if intent == "general":
            system = (
                "You are ARCHON, a highly intelligent and capable AI assistant. "
                "You are equipped with live web search to answer any question across all domains. "
                "Always provide clear, accurate, and detailed answers based on the provided web search context. "
                "Use markdown formatting."
            )
        else:
            system = (
                "You are ARCHON, an expert AI model recommendation assistant. "
                "ONLY discuss AI models, tools, and related technology. "
                "Always be specific: mention model names, scores, and pricing. "
                "Use markdown: **bold** for model names, numbered lists for rankings. "
                "Keep responses under 300 words."
            )

        user_prompt = f"User question: {message}\n\n{db_context}{web_context}"

        # Build intent-specific guidance
        if intent in ("task_coding", "task_creative", "task_reasoning", "task_writing", "task_agent", "task_research"):
            task_label = intent.replace("task_", "")
            user_prompt += (
                f"\n\nInstruction: Recommend the TOP 4 AI models for {task_label} tasks. "
                "For each model state: name, company, pricing, relevant score out of 100, and one sentence why it excels at this task. "
                "Format as a numbered list."
            )
        elif intent == "compare":
            user_prompt += (
                "\n\nInstruction: Create a side-by-side comparison table with coding, reasoning, and creative scores. "
                "State which model wins each category and give a final recommendation."
            )
        elif intent == "recommend":
            user_prompt += (
                "\n\nInstruction: Give 3–5 specific model recommendations with scores and pricing. "
                "Ask one clarifying question to refine the recommendation."
            )
        elif intent == "pricing":
            user_prompt += (
                "\n\nInstruction: List all free, freemium, and open-source models from the database with their key strengths."
            )
        else:
            user_prompt += (
                "\n\nInstruction: Answer the user's question accurately using the provided web search results. "
                "If the web results are irrelevant or empty, use your vast general knowledge."
            )

        full_prompt = f"{system}\n\n{user_prompt}"
        llm_response = await query_ollama(full_prompt, model=chosen)
        if llm_response and len(llm_response.strip()) > 30:
            ollama_used = True

    # ── Try Cloud Fallback if Ollama is Offline ───────────────────────────────
    if not llm_response:
        try:
            async with httpx.AsyncClient(timeout=30.0) as c:
                target_model = "openai" # Default to GPT-4o-mini via pollinations
                r = await c.post(
                    "https://text.pollinations.ai/",
                    json={"messages": [{"role": "system", "content": system}, {"role": "user", "content": user_prompt}], "model": target_model},
                    headers={"Content-Type": "application/json"}
                )
                if r.status_code == 200:
                    llm_response = r.text
                    ollama_used = False
                    status["cloud_fallback"] = True
        except Exception as e:
            print("Cloud fallback failed:", e)

    # ── Curated fallback ──────────────────────────────────────────────────────
    if not llm_response:
        llm_response = _curated(message, intent, m_lower, all_models, sources)

    return {
        "response": llm_response,
        "sources": sources,
        "ollama_used": ollama_used,
        "ollama_status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _curated(message, intent, m_lower, all_models, sources) -> str:
    if intent == "greeting":
        return (
            f"## ARCHON Online 🤖\n\n"
            f"I know **{len(all_models)} AI models** in detail. Try:\n\n"
            f"- *\"Best model for Python coding?\"*\n"
            f"- *\"Compare Claude 4.6 and GPT-5.4\"*\n"
            f"- *\"Show free AI models\"*\n"
            f"- *\"Latest AI news 2025\"*"
        )

    if intent == "compare":
        matched2 = [m for m in all_models if m.name.lower() in m_lower]
        if len(matched2) >= 2:
            a, b = matched2[0], matched2[1]
            w = lambda va, vb, na, nb: f"**{na}**" if va > vb else (f"**{nb}**" if vb > va else "Tie")
            return (
                f"## {a.name} vs {b.name}\n\n"
                f"| Metric | {a.name} | {b.name} | Winner |\n"
                f"|--------|---------|---------|--------|\n"
                f"| 💻 Coding | {int(a.coding_score)} | {int(b.coding_score)} | {w(a.coding_score,b.coding_score,a.name,b.name)} |\n"
                f"| 🧠 Reasoning | {int(a.reasoning_score)} | {int(b.reasoning_score)} | {w(a.reasoning_score,b.reasoning_score,a.name,b.name)} |\n"
                f"| 🎨 Creative | {int(a.creative_score)} | {int(b.creative_score)} | {w(a.creative_score,b.creative_score,a.name,b.name)} |\n"
                f"| 💰 Pricing | {a.pricing} | {b.pricing} | — |\n\n"
                f"> Open [/compare](/compare) for the full radar chart."
            )

    for m in all_models:
        if m.name.lower() in m_lower:
            avg = (m.coding_score + m.reasoning_score + m.creative_score) / 3
            return (
                f"## {m.name} by {m.creator}\n\n"
                f"**Pricing:** {m.pricing} | **Avg:** {avg:.1f}/100\n\n"
                f"{m.description}\n\n"
                f"| Metric | Score |\n|--------|-------|\n"
                f"| 💻 Coding | **{int(m.coding_score)}/100** |\n"
                f"| 🧠 Reasoning | **{int(m.reasoning_score)}/100** |\n"
                f"| 🎨 Creative | **{int(m.creative_score)}/100** |"
            )

    task_map = {
        "task_coding":   ("coding_score",    "💻 Top Models for Coding"),
        "task_creative": ("creative_score",  "🎨 Top Models for Creative"),
        "task_reasoning":("reasoning_score", "🧠 Top Models for Reasoning"),
        "task_writing":  ("creative_score",  "✍️ Top Models for Writing"),
        "task_research": ("reasoning_score", "🔬 Top Models for Research"),
        "task_agent":    ("coding_score",    "🤖 Top Agentic Models"),
    }
    if intent in task_map:
        metric, title = task_map[intent]
        top = sorted(all_models, key=lambda m: getattr(m, metric), reverse=True)[:4]
        return (
            f"## {title}\n\n"
            + "\n".join(f"{i+1}. **{m.name}** ({m.creator}) — {m.pricing} — {int(getattr(m, metric))}/100" for i, m in enumerate(top))
            + "\n\n> Use [/compare](/compare) for detailed charts."
        )

    if intent == "pricing":
        free = [m for m in all_models if m.pricing.lower() in ["free", "open source", "freemium"]]
        return "## Free & Open-Source AI Models\n\n" + "\n".join(
            f"- **{m.name}** ({m.creator}) — {m.pricing}" for m in free)

    if intent == "list":
        out = f"## All {len(all_models)} AI Models\n\n"
        for m in all_models:
            avg = (m.coding_score + m.reasoning_score + m.creative_score) / 3
            out += f"- **{m.name}** ({m.creator}) — {m.pricing} — Avg {avg:.0f}/100\n"
        return out

    if intent == "news" and sources:
        out = "## 🌐 Latest AI News\n\n"
        for s in sources[:4]:
            out += f"**{s['title']}**\n{s['snippet'][:200]}\n\n"
        return out

    web_bit = ""
    if sources:
        web_bit = "\n\n### 🌐 Web Results\n" + "\n".join(
            f"- **{s['title']}**: {s['snippet'][:150]}" for s in sources[:3])

    top = sorted(all_models, key=lambda m: m.coding_score + m.reasoning_score + m.creative_score, reverse=True)[:3]
    return (
        f"I can help with AI model recommendations.{web_bit}\n\n"
        f"### 🏆 Top Models Right Now\n"
        + "\n".join(f"- **{m.name}** ({m.creator}) — {m.pricing}" for m in top)
        + "\n\nAsk me: *\"Best for coding?\"* or *\"Compare Claude vs GPT-5\"*"
    )


# ── News fetcher ──────────────────────────────────────────────────────────────

async def fetch_ai_news() -> list:
    results = await real_web_search("latest AI model release news 2025")
    if results:
        return results[:6]
    return [
        {"title": "Claude 4.6 Sets New Coding Records", "snippet": "Anthropic's Claude 4.6 achieves 98/100 coding score on SWE-bench.", "url": "https://anthropic.com"},
        {"title": "GPT-5.4 Multimodal Update", "snippet": "OpenAI expands GPT-5.4 with advanced vision and real-time reasoning.", "url": "https://openai.com"},
        {"title": "DeepSeek-R1 Open Source Milestone", "snippet": "DeepSeek-R1 rivals closed models at zero cost with 97/100 reasoning.", "url": "https://chat.deepseek.com"},
        {"title": "Llama 4 Leads Open Source Rankings", "snippet": "Meta's Llama 4 dominates open-source LLM benchmarks.", "url": "https://llama.meta.com"},
        {"title": "Cursor Surpasses GitHub Copilot", "snippet": "Cursor achieves 97/100 coding score with agentic editing.", "url": "https://cursor.sh"},
        {"title": "Gemini 3.1 Deep Research Mode", "snippet": "Google's Gemini 3.1 introduces multi-step research with automatic citations.", "url": "https://gemini.google.com"},
    ]
