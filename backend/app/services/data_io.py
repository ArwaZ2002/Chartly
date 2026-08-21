"""Loading and parsing uploaded dataset files.

Uploaded files are stored as raw bytes in the database (``file_data``) so the
app works on serverless platforms with an ephemeral filesystem (e.g. Vercel).
The legacy disk-based location (``file_path``) is still supported as a
fallback for existing local databases.
"""

import io
import logging
import os

import pandas as pd

logger = logging.getLogger(__name__)


def get_dataset_file(dataset) -> tuple[str, bytes]:
    """Return (original filename, raw bytes) for a Dataset row."""
    if dataset.file_data:
        return dataset.file_name, dataset.file_data
    with open(dataset.file_path, "rb") as f:
        return dataset.file_name, f.read()


def parse_dataset_bytes(file_name: str, data: bytes) -> pd.DataFrame:
    ext = os.path.splitext(file_name)[1].lower()
    if ext == ".csv":
        return pd.read_csv(io.BytesIO(data))
    return pd.read_excel(io.BytesIO(data))
