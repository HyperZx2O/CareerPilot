from fastapi import APIRouter, Depends, HTTPException
from backend.auth import get_current_user, get_supabase_user_client
from backend.services.rag import retrieve_relevant_chunks, generate_answer
from backend.logger import get_logger
from pydantic import BaseModel, Field

logger = get_logger("chat")

class ChatRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)

router = APIRouter()

@router.post("/api/chat/message")
def post_message(
    request: ChatRequest,
    user = Depends(get_current_user)
):
    supabase = get_supabase_user_client(user.jwt)
    
    content = request.content
    logger.info("Message received: %s...", content[:50])

    user_id_str = str(user.id) if user.id else None
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_result = supabase.table("users").select("id").eq("clerk_id", user_id_str).execute()
    if not user_result.data:
        try:
            supabase.table("users").insert({"clerk_id": user_id_str}).execute()
            db_user_result = supabase.table("users").select("id").eq("clerk_id", user_id_str).execute()
            db_user_id = db_user_result.data[0]["id"] if db_user_result.data else None
        except Exception as e:
            logger.error("Failed to upsert user record: %s", e)
            db_user_id = None
    else:
        db_user_id = user_result.data[0]["id"]

    cv_id = None
    if db_user_id:
        cv_result = supabase.table("cvs").select("id").eq("user_id", db_user_id).eq("processing_status", "completed").order("created_at", desc=True).limit(1).execute()
        cv_id = cv_result.data[0]["id"] if cv_result.data else None
    logger.info("CV found: %s", cv_id)

    chunks = retrieve_relevant_chunks(query=content, cv_id=cv_id)
    logger.info("Retrieved %d chunks", len(chunks))

    try:
        answer = generate_answer(content, chunks, user_id=user_id_str)
        logger.info("Answer generated successfully (%d chars)", len(answer))
    except Exception as e:
        logger.error("Failed to generate answer: %s", e)
        answer = (
            "I'm having trouble processing your message right now. "
            "Please try again in a moment. If the issue persists, ensure your CV is uploaded and processed."
        )

    if db_user_id:
        try:
            msg_data = {
                "user_id": db_user_id,
                "session_id": f"session_{db_user_id}",
                "role": "assistant",
                "content": answer,
                "sources": [],
                "query_type": None
            }
            supabase.table("chat_messages").insert(msg_data).execute()
            logger.info("Message stored, returning response")
        except Exception as e:
            logger.error("Failed to store message: %s", e)
    else:
        logger.warning("Skipping message storage — database user UUID could not be resolved")
    
    return {"answer": answer, "sources": []}
