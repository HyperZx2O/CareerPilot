import os
import sys
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from backend.db.supabase_client import get_supabase_client
from backend.auth import get_current_user
from backend.services.rag import retrieve_relevant_chunks, generate_answer

from pydantic import BaseModel

class ChatRequest(BaseModel):
    content: str

router = APIRouter()

@router.post("/api/chat/message")
def post_message(
    request: ChatRequest,
    user = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    # Retrieve request body content
    content = request.content
    print(f"[CHAT] Message received: {content[:50]}...")

    # Dynamically locate the user's most recent completed CV to ground the chat response
    user_id_str = str(user.id) if user.id else "demo_user_123"

    # First look up the user's internal UUID by clerk_id
    db_user = supabase.table("users").select("id").eq("clerk_id", user_id_str).execute()
    if not db_user.data:
        cv_id = None
    else:
        db_user_id = db_user.data[0]["id"]
        # Fetch CV via Supabase REST
        cv_result = supabase.table("cvs").select("id").eq("user_id", db_user_id).eq("processing_status", "completed").order("created_at", desc=True).limit(1).execute()
        cv_id = cv_result.data[0]["id"] if cv_result.data else None
    print(f"[CHAT] CV found: {cv_id}")

    # Retrieve relevant CV chunks grounded in the user's resume
    chunks = retrieve_relevant_chunks(query=content, cv_id=cv_id)
    print(f"[CHAT] Retrieved {len(chunks)} chunks")
    
    # Generate answer with error handling and user context
    try:
        answer = generate_answer(content, chunks, user_id=user_id_str)
        print(f"[CHAT] Answer generated successfully ({len(answer)} chars)")
    except Exception as e:
        print(f"[CHAT ERROR] Failed to generate answer: {e}")
        # Return a helpful fallback response instead of 500
        answer = (
            "I'm having trouble processing your message right now. "
            "Please try again in a moment. If the issue persists, ensure your CV is uploaded and processed."
        )
    
    # Store message via Supabase REST
    try:
        msg_data = {
            "user_id": user_id_str,
            "session_id": "session_placeholder",
            "role": "assistant",
            "content": answer,
            "sources": [],
            "query_type": None
        }
        result = supabase.table("chat_messages").insert(msg_data).execute()
        print(f"[CHAT] Message stored, returning response")
    except Exception as e:
        print(f"[CHAT ERROR] Failed to store message: {e}")
        # Don't fail the request if storage fails
    
    return {"answer": answer, "sources": []}
