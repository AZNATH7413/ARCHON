"""
Vercel serverless entry point.
This ASGI wrapper strips the '/api' prefix from requests so they match FastAPI routes correctly.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from main import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        path = scope.get("path", "")
        if path.startswith("/api"):
            scope["path"] = path[4:] or "/"
            
        raw_path = scope.get("raw_path", b"")
        if raw_path.startswith(b"/api"):
            scope["raw_path"] = raw_path[4:] or b"/"
            
    await fastapi_app(scope, receive, send)
