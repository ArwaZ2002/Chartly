import pandas as pd
from typing import Any


def profile_dataset(df: pd.DataFrame) -> list[dict[str, Any]]:
    columns = []
    for col in df.columns:
        col_data = df[col]
        dtype = col_data.dtype

        if pd.api.types.is_numeric_dtype(dtype):
            col_type = "number"
        elif pd.api.types.is_bool_dtype(dtype):
            col_type = "boolean"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_type = "date"
        else:
            non_null = col_data.dropna()
            if len(non_null) > 0:
                coerced = pd.to_datetime(non_null, errors="coerce")
                col_type = "date" if coerced.notna().mean() >= 0.9 else "string"
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
