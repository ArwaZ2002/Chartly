"""Vercel serverless entrypoint.

Vercel runs this module with the repo root as the working directory and
installs dependencies from the root requirements.txt. The FastAPI app lives in
backend/, so that directory is added to sys.path before importing it.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from main import app  # noqa: E402
