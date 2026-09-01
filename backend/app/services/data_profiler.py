import warnings

import numpy as np
import pandas as pd
from typing import Any


# ---------------------------------------------------------------------------
# Type inference helpers
# ---------------------------------------------------------------------------

# Patterns that indicate a numeric value with formatting
_CURRENCY_RE = r"^[\$\u00a3\u20ac\u00a5]?\s*[\d,]+\.?\d*\s*%?$"
_PERCENT_RE = r"^[\d,]+\.?\d*\s*%$"


def _try_numeric(series: pd.Series) -> bool:
    """Return True if the series looks like it should be numeric."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return False

    sample = non_null.head(100)
    str_vals = sample.astype(str).str.strip()

    # Check if values look like formatted numbers
    formatted_count = 0
    for v in str_vals:
        if pd.isna(v):
            continue
        s = str(v).strip()
        if _is_numeric_string(s):
            formatted_count += 1
        else:
            cleaned = s.replace(",", "").replace("%", "").strip()
            coerced = pd.to_numeric(cleaned, errors="coerce")
            if pd.notna(coerced):
                formatted_count += 1

    if formatted_count / len(str_vals) >= 0.8:
        return True

    # Check if pandas can already parse it as numeric
    try:
        numeric = pd.to_numeric(non_null, errors="coerce")
        if numeric.notna().mean() >= 0.8:
            return True
    except (ValueError, TypeError):
        pass

    return False


def _is_numeric_string(val: str) -> bool:
    """Check if a string value looks like a number (with possible formatting)."""
    if not val:
        return False
    cleaned = val.replace(",", "").replace("$", "").replace("\u00a3", "").replace("\u20ac", "").replace("\u00a5", "").strip()
    if cleaned.endswith("%"):
        cleaned = cleaned[:-1]
    try:
        float(cleaned)
        return True
    except ValueError:
        return False


def _try_datetime(series: pd.Series, threshold: float = 0.8) -> bool:
    """Return True if the series looks like dates."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return False

    # If already datetime dtype
    if pd.api.types.is_datetime64_any_dtype(series.dtype):
        return True

    sample = non_null.head(100)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=UserWarning)
            coerced = pd.to_datetime(sample, errors="coerce")
        parsed_ratio = coerced.notna().mean()
        return parsed_ratio >= threshold
    except Exception:
        return False


def _try_boolean(series: pd.Series) -> bool:
    """Return True if the series is a boolean column."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return False

    unique_vals = set(str(v).strip().lower() for v in non_null.head(100))
    bool_values = {"true", "false", "yes", "no", "y", "n", "1", "0", "on", "off", "t", "f"}
    return len(unique_vals) > 0 and unique_vals.issubset(bool_values)


def _is_categorical(series: pd.Series) -> bool:
    """Return True if the series looks categorical (low-cardinality strings)."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return False

    n_unique = non_null.nunique()
    n_total = len(non_null)

    # If very few unique values relative to total, likely categorical
    if n_total > 0 and n_unique / n_total < 0.5 and n_unique <= 50:
        return True

    # If all values are short strings, likely categorical
    avg_len = non_null.astype(str).str.len().mean()
    if avg_len < 20 and n_unique <= 30:
        return True

    return False


# ---------------------------------------------------------------------------
# Main profiling
# ---------------------------------------------------------------------------

def profile_dataset(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Profile each column, inferring type as number, boolean, date, or string."""
    columns = []

    for col in df.columns:
        col_data = df[col]
        dtype = col_data.dtype

        # --- Type detection with fallback heuristics ---
        if pd.api.types.is_bool_dtype(dtype):
            col_type = "boolean"
        elif pd.api.types.is_numeric_dtype(dtype):
            col_type = "number"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_type = "date"
        else:
            # String / object column — apply heuristic chain
            non_null = col_data.dropna()

            if len(non_null) == 0:
                col_type = "string"
            elif _try_boolean(col_data):
                col_type = "boolean"
            elif _try_datetime(col_data):
                col_type = "date"
            elif _try_numeric(col_data):
                col_type = "number"
            elif _is_categorical(col_data):
                col_type = "string"  # categorical is surfaced as "string" for the UI
            else:
                col_type = "string"

        unique_count = int(col_data.nunique())
        missing_count = int(col_data.isna().sum())

        sample_values = col_data.dropna().head(5).tolist()
        sample_values = [str(v) for v in sample_values]

        columns.append({
            "name": col,
            "type": col_type,
            "unique_count": unique_count,
            "missing_count": missing_count,
            "sample_values": sample_values,
        })

    return columns


def get_numeric_columns(columns: list[dict]) -> list[str]:
    return [c["name"] for c in columns if c["type"] == "number"]


def get_categorical_columns(columns: list[dict]) -> list[str]:
    return [c["name"] for c in columns if c["type"] in ("string", "boolean")]


def get_date_columns(columns: list[dict]) -> list[str]:
    return [c["name"] for c in columns if c["type"] == "date"]


def recommend_chart_type(columns: list[dict]) -> list[dict[str, str]]:
    recommendations = []
    numeric_cols = get_numeric_columns(columns)
    categorical_cols = get_categorical_columns(columns)
    date_cols = get_date_columns(columns)

    if date_cols and numeric_cols:
        recommendations.append({
            "chart_type": "line",
            "reason": "Date column detected with numeric values - line chart shows trends over time",
        })
        recommendations.append({
            "chart_type": "area",
            "reason": "Date and numeric columns detected - area chart emphasizes volume over time",
        })

    if categorical_cols and numeric_cols:
        recommendations.append({
            "chart_type": "bar",
            "reason": "Categorical and numeric columns detected - bar chart compares categories",
        })
        recommendations.append({
            "chart_type": "box",
            "reason": "Categorical and numeric columns detected - box plot shows spread and outliers",
        })
        recommendations.append({
            "chart_type": "treemap",
            "reason": "Categories with numeric values detected - treemap shows proportion at a glance",
        })
        recommendations.append({
            "chart_type": "funnel",
            "reason": "Categorical values detected - funnel shows drop-off across stages",
        })

    if numeric_cols:
        recommendations.append({
            "chart_type": "histogram",
            "reason": "Numeric column detected - histogram shows how values are distributed",
        })

    if len(numeric_cols) >= 2:
        recommendations.append({
            "chart_type": "scatter",
            "reason": "Multiple numeric columns detected - scatter plot shows relationships",
        })

    if categorical_cols and len(categorical_cols) <= 6:
        recommendations.append({
            "chart_type": "pie",
            "reason": "Few categorical columns detected - pie chart shows composition",
        })

    if not recommendations:
        recommendations.append({
            "chart_type": "bar",
            "reason": "Default recommendation for general data",
        })

    return recommendations
