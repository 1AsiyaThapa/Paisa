import httpx
from fastapi import Request


def get_http_client(request: Request) -> httpx.AsyncClient:
    """
    FastAPI dependency that returns the shared httpx.AsyncClient
    instance from the application state.
    """
    return request.app.state.http_client
