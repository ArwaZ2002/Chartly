"""Loading and parsing uploaded dataset files.

Uploaded files are stored as raw bytes in the database (``file_data``) so the
app works on serverless platforms with an ephemeral filesystem (e.g. Vercel).
The legacy disk-based location (``file_path``) is still supported as a
fallback for existing local databases.
"""

import io
import logging
import os
import re
import unicodedata

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_dataset_file(dataset) -> tuple[str, bytes]:
    """Return (original filename, raw bytes) for a Dataset row."""
    if dataset.file_data:
        return dataset.file_name, dataset.file_data
    with open(dataset.file_path, "rb") as f:
        return dataset.file_name, f.read()


# ---------------------------------------------------------------------------
# Column name normalisation
# ---------------------------------------------------------------------------

def _normalise_column_name(name: object) -> str:
    """Turn any header value into a clean, usable column name."""
    if name is None:
        return ""
    s = str(name).strip()
    if not s or s.lower() in ("nan", "none", "null", ""):
        return ""
    # Normalise unicode and strip accents
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    # Replace non-alphanumeric characters (keep spaces/hyphens/underscores)
    s = re.sub(r"[^\w\s\-]", "_", s)
    # Collapse whitespace and underscores
    s = re.sub(r"[\s_]+", "_", s).strip("_")
    return s


def _deduplicate_columns(columns: list[str]) -> list[str]:
    """Ensure all column names are unique by appending _2, _3, ..."""
    seen: dict[str, int] = {}
    result: list[str] = []
    for c in columns:
        key = c if c else "_col"
        if key in seen:
            seen[key] += 1
            result.append(f"{key}_{seen[key]}")
        else:
            seen[key] = 1
            result.append(key)
    return result


# ---------------------------------------------------------------------------
# Header row detection  (the core algorithm)
# ---------------------------------------------------------------------------

def _is_empty_cell(val: object) -> bool:
    """Check if a cell should be considered *empty*."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return True
    return str(val).strip() == ""


def _row_non_empty_count(row) -> int:
    return sum(1 for v in row if not _is_empty_cell(v))


def _candidate_header_score(row) -> float:
    """Score a row as a potential header.

    Higher is better.  We reward:
      * more non-empty cells (relative to the row width)
      * more unique string values (real headers tend to be unique)
      * shorter average string length (headers are typically short labels)
    We penalise:
      * mostly numeric rows (likely data, not headers)
      * rows with currency symbols, percent signs, or date-like values (data)
    """
    cells = [v for v in row if not _is_empty_cell(v)]
    if not cells:
        return -1.0

    n_filled = len(cells)
    n_unique = len(set(str(v).strip().lower() for v in cells))
    avg_len = np.mean([len(str(v)) for v in cells])

    # Fraction of cells that are non-numeric strings
    str_count = sum(1 for v in cells if not isinstance(v, (int, float, np.integer, np.floating)))
    str_ratio = str_count / n_filled if n_filled else 0

    # Penalty for cells that look like data (currency, %, long strings, dates)
    data_penalty = 0
    for v in cells:
        s = str(v).strip()
        # Only penalise currency symbols when they prefix a number (data pattern)
        if re.match(r"^[\$\u00a3\u20ac\u00a5]\s*\d", s):
            data_penalty += 1.5
        # Only penalise % when it follows a number (data pattern)
        if re.match(r"^[\d.,]+\s*%$", s):
            data_penalty += 1.0
        if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", s):
            data_penalty += 1.0
        if len(s) > 30:
            data_penalty += 0.5

    # Penalty for very short average length — data rows often have short
    # values like "a", "1", "yes", while headers tend to be more descriptive.
    short_penalty = 0
    if avg_len < 3:
        short_penalty = 2.0
    elif avg_len < 5:
        short_penalty = 0.5

    # Heuristic score
    score = (n_filled * 0.3) + (n_unique * 0.3) + (str_ratio * 0.3) - (avg_len * 0.01) - data_penalty - short_penalty
    return score


def _detect_header_row(raw_values: list[list], max_scan: int = 30) -> int:
    """Return the index of the most likely header row.

    Scans the first *max_scan* rows looking for the row that best fits the
    profile of a table header: many non-empty string cells, high uniqueness,
    short labels, and followed by rows with consistent column counts.
    """
    if not raw_values:
        return 0

    n_cols = max(len(r) for r in raw_values[:max_scan]) if raw_values else 0
    if n_cols == 0:
        return 0

    best_idx = 0
    best_score = -1.0

    scan_limit = min(len(raw_values), max_scan)

    for idx in range(scan_limit):
        row = raw_values[idx]
        score = _candidate_header_score(row)

        # Bonus: check that the next row has data (so we don't pick a
        # trailing metadata row at the end of the file).
        if idx + 1 < len(raw_values):
            next_filled = _row_non_empty_count(raw_values[idx + 1])
            if next_filled < 2:
                score -= 1.0
            # Bonus if next row has similar column count
            if abs(len(raw_values[idx + 1]) - n_cols) <= 2:
                score += 0.2
        else:
            score -= 0.5

        # Penalty for rows that are completely empty or nearly so
        filled = _row_non_empty_count(row)
        if filled == 0:
            score = -10.0
        elif filled == 1:
            score -= 2.0

        # Penalty if row is all-numeric (likely a data row)
        all_numeric = all(
            isinstance(v, (int, float, np.integer, np.floating))
            for v in row if not _is_empty_cell(v)
        )
        if all_numeric and filled > 0:
            score -= 3.0

        if score > best_score:
            best_score = score
            best_idx = idx

    return best_idx


# ---------------------------------------------------------------------------
# Excel multi-sheet handling
# ---------------------------------------------------------------------------

def _pick_best_sheet(excel_file: io.BytesIO) -> tuple[pd.DataFrame, str]:
    """Read all sheets and return the one most likely to contain the main
    tabular dataset (most rows * columns).
    """
    xls = pd.ExcelFile(excel_file)
    sheet_names = xls.sheet_names

    if len(sheet_names) == 1:
        df = pd.read_excel(xls, sheet_name=sheet_names[0], header=None)
        return df, sheet_names[0]

    best_df: pd.DataFrame | None = None
    best_name: str = sheet_names[0]
    best_score = -1

    for name in sheet_names:
        try:
            df = pd.read_excel(xls, sheet_name=name, header=None)
        except Exception:
            logger.debug("Skipping unreadable sheet %s", name)
            continue

        if df.empty:
            continue

        rows, cols = df.shape
        # Prefer sheets with more data
        score = rows * cols
        # Bonus for sheets with more non-empty cells
        non_empty = df.notna().sum().sum()
        score += non_empty * 0.1

        if score > best_score:
            best_score = score
            best_df = df
            best_name = name

    if best_df is None:
        # Fallback to first sheet
        best_df = pd.read_excel(xls, sheet_name=sheet_names[0], header=None)
        best_name = sheet_names[0]

    return best_df, best_name


# ---------------------------------------------------------------------------
# CSV reading
# ---------------------------------------------------------------------------

def _read_csv(data: bytes) -> pd.DataFrame:
    """Read CSV with encoding sniffing and basic sanity."""
    # Try UTF-8 first, then Latin-1
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            raw = io.BytesIO(data)
            df = pd.read_csv(raw, encoding=enc, header=None, dtype=str)
            if not df.empty:
                return df
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue

    # Last resort: let pandas guess
    return pd.read_csv(io.BytesIO(data), header=None, dtype=str)


# ---------------------------------------------------------------------------
# Cleaning helpers
# ---------------------------------------------------------------------------

def _drop_completely_empty_rows_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows and columns that are entirely empty."""
    # Drop rows where ALL cells are empty
    df = df.dropna(how="all")
    # Drop cols where ALL cells are empty
    df = df.dropna(axis=1, how="all")
    return df


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply final cleaning steps to the parsed DataFrame."""
    if df.empty:
        return df

    # Strip whitespace from string columns
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].map(
                lambda v: v.strip() if isinstance(v, str) else v
            )

    # Replace common NA-like strings with actual NaN
    na_patterns = {"", "n/a", "na", "null", "none", "-", "--", "N/A", "NA", "NULL", "NONE"}
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].map(
                lambda v: np.nan if isinstance(v, str) and v.strip().lower() in na_patterns else v
            )

    # Drop rows that are now entirely NaN
    df = df.dropna(how="all")

    # Drop columns that are entirely NaN
    df = df.dropna(axis=1, how="all")

    # Reset index
    df = df.reset_index(drop=True)

    return df


# ---------------------------------------------------------------------------
# Main parsing entry point
# ---------------------------------------------------------------------------

def parse_dataset_bytes(file_name: str, data: bytes) -> pd.DataFrame:
    """Parse an uploaded file into a cleaned pandas DataFrame.

    The function:
    1. Detects the actual header row (handles title/metadata rows above the table).
    2. For Excel, selects the best sheet when multiple sheets exist.
    3. Normalises and deduplicates column names.
    4. Drops empty rows and columns.
    5. Strips whitespace and replaces common NA-like strings.
    """
    ext = os.path.splitext(file_name)[1].lower()

    if ext == ".csv":
        raw = _read_csv(data)
    else:
        # Excel (.xlsx / .xls)
        raw = _pick_best_sheet(io.BytesIO(data))

    if isinstance(raw, tuple):
        raw = raw[0]

    # Drop fully empty rows/cols early
    raw = _drop_completely_empty_rows_cols(raw)

    if raw.empty:
        raise ValueError("The file contains no data")

    # Convert to list-of-lists for header detection (fast enough for the
    # first ~30 rows).
    max_rows_to_scan = min(len(raw), 40)
    raw_values = raw.head(max_rows_to_scan).values.tolist()

    header_idx = _detect_header_row(raw_values)

    # Extract the header row
    header_row = raw_values[header_idx]
    columns_raw = [
        str(v).strip() if not _is_empty_cell(v) else "" for v in header_row
    ]

    # Normalise column names
    columns = [_normalise_column_name(c) for c in columns_raw]

    # Handle empty column names — give them a placeholder so we can detect
    # them later and potentially drop them.
    columns = [c if c else f"_col_{i}" for i, c in enumerate(columns)]

    # Deduplicate
    columns = _deduplicate_columns(columns)

    # Build the data portion (everything after the header row)
    data_rows = raw.iloc[header_idx + 1:].reset_index(drop=True)

    # Assign column names
    # If the data has more columns than our header, add extra cols
    n_data_cols = data_rows.shape[1]
    if n_data_cols > len(columns):
        for i in range(len(columns), n_data_cols):
            columns.append(f"_col_{i}")
    elif n_data_cols < len(columns):
        columns = columns[:n_data_cols]

    data_rows.columns = columns

    # Clean the dataframe
    data_rows = _clean_dataframe(data_rows)

    # Drop columns that are entirely placeholder-named AND entirely NaN
    # (these are usually artefacts of ragged rows in the source file)
    cols_to_drop = []
    for col in data_rows.columns:
        if col.startswith("_col_") and data_rows[col].isna().all():
            cols_to_drop.append(col)
    if cols_to_drop:
        data_rows = data_rows.drop(columns=cols_to_drop)

    # Final check
    if data_rows.empty:
        raise ValueError("No usable data rows found after cleaning")

    logger.info(
        "Parsed %s -> %d rows x %d columns (header at row %d)",
        file_name, len(data_rows), len(data_rows.columns), header_idx,
    )

    return data_rows
