import traceback

from anyio.to_thread import run_sync
from fastapi import APIRouter
from google import genai
from sqlalchemy import text

from app.core.config import settings
from app.core.database import DBSession
from app.core.security import CurrentUserID

from .helper import check_and_raise_api_error
from .prompts import get_routing_system_prompt, get_summary_prompt
from .schemas import ChatRouting, LLMRequest, LLMResponse

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/generate", response_model=LLMResponse)
async def generate_chat_response(
    request: LLMRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    model_id = settings.GEMINI_MODEL_ID

    try:
        # 1. Get AI to decide: Chat or SQL?
        system_prompt = get_routing_system_prompt(user_id)
        # Prevent SELECT * for performance and memory safety
        system_prompt += "\n- NEVER use SELECT *. Always select specific columns needed for the answer (e.g., amount, category, date, note)."

        def _generate_routing():
            return client.models.generate_content(
                model=model_id,
                contents=request.prompt,
                config={
                    "system_instruction": system_prompt,
                    "response_mime_type": "application/json",
                    "response_json_schema": ChatRouting.model_json_schema(),
                },
            )

        response = await run_sync(_generate_routing)

        if not response.text:
            raise ValueError("Empty response from AI for routing")

        routing = ChatRouting.model_validate_json(response.text)

        if routing.intent == "query":
            if not routing.sql:
                return LLMResponse(
                    response="I understand you're asking about finances, but I couldn't generate a specific query."
                )

            # Safety check
            forbidden = ["DELETE", "UPDATE", "DROP", "ALTER", "INSERT", "TRUNCATE"]
            if any(word in routing.sql.upper() for word in forbidden):
                return LLMResponse(
                    response="I'm sorry, I can't perform modification actions on your data."
                )

            # Execute SQL
            try:
                # Add timeout to prevent hanging queries
                result = await db.execute(
                    text(routing.sql).execution_options(timeout=5, statement_timeout=5)
                )
                # Convert result rows to dicts
                data = [dict(row._mapping) for row in result]

                # Summarize
                summary_prompt = get_summary_prompt(request.prompt, data)

                def _generate_summary():
                    return client.models.generate_content(
                        model=model_id, contents=summary_prompt
                    )

                summary_resp = await run_sync(_generate_summary)

                return LLMResponse(
                    response=summary_resp.text or "Here is the data found."
                )

            except Exception as e:
                print(f"SQL Execution failed: {e}")
                return LLMResponse(
                    response=f"I tried to query the data but ran into an error: {str(e)}"
                )

        # Intent is "chat"
        return LLMResponse(
            response=routing.chat_response or "I'm here to help with your finances."
        )

    except Exception as e:
        error_msg = str(e)
        # Check for specific API errors to raise cleanly if needed,
        # otherwise return error in response
        try:
            check_and_raise_api_error(error_msg)
        except Exception as api_e:
            return LLMResponse(response=str(api_e), error=str(api_e))

        traceback.print_exc()
        return LLMResponse(response=f"An error occurred: {error_msg}", error=error_msg)
