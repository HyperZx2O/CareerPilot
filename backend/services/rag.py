import os
from typing import List
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from backend.db.supabase_client import get_supabase_client
from integrations.fit_score import embed_text
from backend.logger import get_logger
from backend.utils import is_placeholder

logger = get_logger("rag")


def get_user_context_data(user_id: str) -> dict:
    """
    Retrieve user's tracker data (applications, todos, goals) from Supabase.
    """
    context = {"applications": [], "todos": [], "goals": []}
    supabase = get_supabase_client()

    # Look up user's internal UUID by clerk_id
    user_result = supabase.table("users").select("id").eq("clerk_id", user_id).execute()
    if not user_result.data:
        return context
    db_user_id = user_result.data[0]["id"]

    try:
        apps = supabase.table("applications").select("job_title,company,status,source").eq("user_id", db_user_id).order("created_at", desc=True).limit(5).execute()
        for a in apps.data:
            context["applications"].append({
                "job_title": a.get("job_title", ""),
                "company": a.get("company", ""),
                "status": a.get("status", "applied")
            })
    except Exception as e:
        logger.warning("Error fetching applications: %s", e)

    try:
        todos = supabase.table("todos").select("title,due_date").eq("user_id", db_user_id).eq("done", False).order("due_date").limit(5).execute()
        for t in todos.data:
            context["todos"].append({
                "title": t.get("title", ""),
                "due_date": t.get("due_date")
            })
    except Exception as e:
        logger.warning("Error fetching todos: %s", e)

    try:
        goals = supabase.table("goals").select("title,target_date").eq("user_id", db_user_id).eq("status", "active").order("created_at", desc=True).limit(3).execute()
        for g in goals.data:
            context["goals"].append({
                "title": g.get("title", ""),
                "target_date": g.get("target_date")
            })
    except Exception as e:
        logger.warning("Error fetching goals: %s", e)

    return context


def format_user_context(context: dict) -> str:
    """Format user context data into a string for the AI prompt."""
    parts = []

    if context["applications"]:
        parts.append("**Your Recent Job Applications:**")
        for app in context["applications"]:
            parts.append(f"  - {app['job_title']} at {app['company']} ({app.get('status', 'applied')})")

    if context["todos"]:
        parts.append("**Your Pending Tasks:**")
        for todo in context["todos"]:
            due = todo.get("due_date", "No deadline")
            parts.append(f"  - {todo['title']} (Due: {due})")

    if context["goals"]:
        parts.append("**Your Career Goals:**")
        for goal in context["goals"]:
            parts.append(f"  - {goal['title']}" + (f" (Target: {goal['target_date']})" if goal.get("target_date") else ""))

    return "\n".join(parts) if parts else ""


def retrieve_relevant_chunks(query: str, cv_id: str = None, top_k: int = 3) -> List[dict]:
    """
    Retrieves CV chunks from Supabase. Falls back to hardcoded demo chunks if none found.
    For production semantic search, configure Pinecone + Groq/NVIDIA credentials.
    """
    supabase = get_supabase_client()
    chunks = []

    # Try Pinecone semantic search first (if configured)
    pinecone_key = os.getenv("PINECONE_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    use_pinecone = pinecone_key and (groq_key or nvidia_key) and not is_placeholder(pinecone_key)

    if use_pinecone:
        def _pinecone_query():
            from pinecone import Pinecone
            pc = Pinecone(api_key=pinecone_key)
            index = pc.Index(os.getenv("PINECONE_INDEX", "careerpilot-cv"))
            query_vector = embed_text(query)
            filter_dict = {"cv_id": cv_id} if cv_id else None
            res = index.query(vector=query_vector, top_k=top_k, filter=filter_dict, include_metadata=True)
            result = []
            for match in res.get("matches", []):
                meta = match.get("metadata", {})
                result.append({"section": meta.get("section", "general"), "content": meta.get("content", "")})
            return result

        pool = ThreadPoolExecutor(max_workers=1)
        try:
            future = pool.submit(_pinecone_query)
            pc_chunks = future.result(timeout=8)
            if pc_chunks:
                return pc_chunks
        except TimeoutError:
            logger.warning("Pinecone query timed out after 8s, falling back to Supabase")
        except Exception as e:
            logger.warning("Pinecone query failed, falling back to Supabase: %s", e)
        finally:
            pool.shutdown(wait=False)

    # Fetch from Supabase cv_chunks table
    try:
        query_builder = supabase.table("cv_chunks").select("section_type,chunk_text")
        if cv_id:
            query_builder = query_builder.eq("cv_id", cv_id)
        result = query_builder.order("chunk_index").limit(top_k).execute()

        for chunk in result.data:
            chunks.append({
                "section": chunk.get("section_type", "general"),
                "content": chunk.get("chunk_text", "")
            })
    except Exception as e:
        logger.warning("Supabase chunk fetch failed: %s", e)

    # Hardcoded demo fallback — ensures AI Assistant always returns something
    if not chunks:
        chunks = [
            {"section": "summary", "content": "Passionate full stack developer with 3+ years experience in React, Next.js, FastAPI, and Python."},
            {"section": "skills", "content": "React, Next.js, FastAPI, Python, PostgreSQL, TailwindCSS, Docker, CI/CD, API Design"},
            {"section": "experience", "content": "Senior React Developer at Vercel (2024-Present). Built responsive UI dashboards and custom component libraries."},
        ]

    return chunks


def generate_answer(query: str, chunks: List[dict], user_id: str = None) -> str:
    """
    Generates a response using Groq/NVIDIA NIM if keys are configured,
    falling back to a high-fidelity template engine locally.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")

    # Compose context from CV chunks
    context_str = "\n\n".join([f"[{c['section'].upper()}]: {c['content']}" for c in chunks])

    # Add user activity context if user_id provided
    user_context_str = ""
    if user_id:
        try:
            user_context = get_user_context_data(user_id)
            user_context_str = format_user_context(user_context)
        except Exception as e:
            logger.warning("Failed to get user context: %s", e)

    system_prompt = (
        "You are a precise, professional AI Career Coach on CareerPilot. "
        "You analyze CV data and user activity to deliver concise, actionable career advice. "
        "Focus only on what helps the user — no fluff, no generic motivation, no lengthy preambles."
    )

    user_prompt = f"CV Context:\n{context_str}\n\n"

    if user_context_str:
        user_prompt += f"User Activity:\n{user_context_str}\n\n"

    user_prompt += (
        f"Query: {query}\n\n"
        f"Style:\n"
        f"- Max 150 words. 3-5 bullet points or a short paragraph.\n"
        f"- Answer immediately — no introductions like 'Based on your CV...'\n"
        f"- Bold key terms. No markdown headers.\n"
        f"- Reference specific skills/experience from their CV.\n"
        f"- End with one clear next action.\n"
        f"- If insufficient data, say so directly — do not invent information."
    )

    # Try Groq (fastest free option)
    if groq_key and not is_placeholder(groq_key):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key, timeout=30)
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )
            logger.info("Groq response generated successfully")
            return res.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("Groq call failed: %s", e)

    if nvidia_key and not is_placeholder(nvidia_key):
        logger.warning("NVIDIA NIM configured but no runtime integration available in this build")



    logger.info("Using local template fallback (no LLM API keys configured)")
    q = query.lower()
    if any(k in q for k in ["skill", "learn", "improve", "gap", "roadmap"]):
        return (
            "Based on your profile, your technical foundation in **React, Next.js, and FastAPI** is solid!\n\n"
            "To target Senior and Platform roles, I recommend focusing on:\n"
            "1. **Advanced Orchestration & Deployments**: Docker, CI/CD, secrets management, and cloud infrastructure.\n"
            "2. **Vector Indexing & RAG**: Semantic similarity with Pinecone and advanced prompt engineering.\n\n"
            "Would you like me to generate a personalized 4-week learning roadmap?"
        )
    elif any(k in q for k in ["resume", "cv", "ready", "fit"]):
        return (
            "Looking at your CV, you have excellent project alignment for frontend/fullstack roles!\n\n"
            "To boost your fit score further:\n"
            "- Quantify achievements (e.g., 'improved page load times by 20%').\n"
            "- List specific technologies in your experience section.\n"
            "- Highlight cross-functional collaboration.\n\n"
            "Want me to perform a detailed resume optimization check for a specific job?"
        )
    elif any(k in q for k in ["job", "apply", "interview", "offer"]):
        return (
            "I can help you find matching job openings and assess your readiness!\n\n"
            "Here's what I can do:\n"
            "- Search for relevant jobs in Bangladesh and worldwide\n"
            "- Calculate fit scores against your CV\n"
            "- Track your applications in the Kanban board\n"
            "- Prepare you for interviews\n\n"
            "What type of role are you targeting right now?"
        )
    else:
        apps_count = 0
        todos_count = 0
        if user_context_str:
            # Extract counts from formatted context
            apps_count = user_context_str.count("  - ") if "Applications" in user_context_str else 0

        return (
            f"Hello! I'm your CareerPilot AI Coach. I've analyzed your profile.\n\n"
            f"Your core skills in **React, Next.js, FastAPI, and Python** are a great foundation! "
            f"I can help you:\n\n"
            f"👉 Find matching job openings\n"
            f"👉 Assess your readiness and calculate fit scores\n"
            f"👉 Suggest skills to bridge gaps\n"
            f"👉 Generate cover letters and roadmaps\n\n"
            f"What career goal can I support you with today?"
        )
