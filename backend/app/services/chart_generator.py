import pandas as pd
import plotly.express as px
import plotly.io as pio
import json
from typing import Any


AGGREGATION_MAP = {
    "sum": "sum",
    "average": "mean",
    "count": "count",
    "min": "min",
    "max": "max",
}

GRANULARITY_FREQ = {
    "day": "D",
    "week": "W",
    "month": "MS",
    "quarter": "QS",
    "year": "YS",
}

CHART_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
]

# Chart types that plot raw values and ignore aggregation
RAW_TYPES = {"histogram", "box", "violin"}


def _resolve_colors(spec: dict[str, Any]) -> list[str]:
    colors = spec.get("colors")
    if isinstance(colors, list):
        cleaned = [c for c in colors if isinstance(c, str) and c.strip()]
        if cleaned:
            return cleaned[:8]
    return CHART_COLORS


def generate_chart(
    df: pd.DataFrame,
    spec: dict[str, Any],
) -> str:
    chart_type = spec["chart_type"]
    dimension = spec["dimension"]
    metric = spec["metric"]
    aggregation = spec.get("aggregation", "sum")
    sorting = spec.get("sorting", "none")
    title = spec.get("title", f"{metric} by {dimension}")
    colors = _resolve_colors(spec)
    orientation = spec.get("orientation", "vertical")

    if chart_type in RAW_TYPES:
        if chart_type == "histogram":
            fig = px.histogram(
                df,
                x=dimension,
                title=title,
                nbins=min(40, max(10, int(df.shape[0] / 10) or 10)),
                color_discrete_sequence=colors,
            )
        elif chart_type == "box":
            fig = px.box(
                df,
                x=dimension,
                y=metric,
                title=title,
                color_discrete_sequence=colors,
            )
        else:  # violin
            fig = px.violin(
                df,
                x=dimension,
                y=metric,
                title=title,
                box=True,
                points=False,
                color_discrete_sequence=colors,
            )
        return _finalize(fig, spec)

    agg_func = AGGREGATION_MAP.get(aggregation, "sum")

    granularity = spec.get("time_granularity")
    if granularity:
        df = df.copy()
        df[dimension] = pd.to_datetime(df[dimension], errors="coerce")
        df = df.dropna(subset=[dimension])
        grouper = pd.Grouper(key=dimension, freq=GRANULARITY_FREQ.get(granularity, "MS"))
        chart_df = df.groupby(grouper, as_index=False).agg(**{metric: (metric, agg_func)})
    elif aggregation == "count":
        chart_df = df.groupby(dimension, as_index=False).agg(**{metric: (metric, "count")})
    else:
        chart_df = df.groupby(dimension, as_index=False).agg(**{metric: (metric, agg_func)})

    if sorting == "asc":
        chart_df = chart_df.sort_values(metric, ascending=True)
    elif sorting == "desc":
        chart_df = chart_df.sort_values(metric, ascending=False)

    if chart_type == "bar":
        if orientation == "horizontal":
            fig = px.bar(
                chart_df,
                x=metric,
                y=dimension,
                orientation="h",
                title=title,
                color_discrete_sequence=colors,
            )
        else:
            fig = px.bar(
                chart_df,
                x=dimension,
                y=metric,
                title=title,
                color_discrete_sequence=colors,
            )
    elif chart_type == "line":
        fig = px.line(
            chart_df,
            x=dimension,
            y=metric,
            title=title,
            markers=True,
            color_discrete_sequence=colors,
        )
    elif chart_type == "area":
        fig = px.area(
            chart_df,
            x=dimension,
            y=metric,
            title=title,
            color_discrete_sequence=colors,
        )
    elif chart_type == "pie":
        fig = px.pie(
            chart_df,
            names=dimension,
            values=metric,
            title=title,
            color_discrete_sequence=colors,
        )
    elif chart_type == "scatter":
        fig = px.scatter(
            chart_df,
            x=dimension,
            y=metric,
            title=title,
            color_discrete_sequence=colors,
        )
    elif chart_type == "treemap":
        fig = px.treemap(
            chart_df,
            path=[dimension],
            values=metric,
            title=title,
            color_discrete_sequence=colors,
        )
    elif chart_type == "funnel":
        fig = px.funnel(
            chart_df,
            x=metric,
            y=dimension,
            title=title,
            color_discrete_sequence=colors,
        )
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    return _finalize(fig, spec)


def _finalize(fig, spec: dict[str, Any]) -> str:
    font_family = spec.get("font_family")
    fig.update_layout(
        template="plotly_white",
        font=dict(family=font_family or "system-ui, sans-serif"),
        margin=dict(l=40, r=40, t=60, b=40),
    )

    return pio.to_json(fig)


def chart_to_html(chart_json: str) -> str:
    fig = pio.from_json(chart_json)
    return pio.to_html(fig, full_html=False, include_plotlyjs="cdn")
