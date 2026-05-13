"""
Vercel serverless entry point.
Mangum wraps the FastAPI ASGI app so Vercel's Python runtime can invoke it.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from main import app  # noqa: F401
from mangum import Mangum

# Vercel invokes this handler for every request to /api/*
handler = Mangum(app, lifespan="off")
