from typing import Literal

from pydantic import BaseModel, Field


class LLMRequest(BaseModel):
    prompt: str
    history: list | None = None


class LLMResponse(BaseModel):
    response: str
    error: str | None = None
    debug_info: str | None = None


class ChatRouting(BaseModel):
    intent: Literal["chat", "query"] = Field(
        description="Use 'chat' for greetings or general talk. Use 'query' if the user asks for financial data/stats."
    )
    sql: str | None = Field(
        None, description="The SQL SELECT query. Required if intent is 'query'."
    )
    chat_response: str | None = Field(
        None,
        description="A friendly conversational response. Required if intent is 'chat'.",
    )
