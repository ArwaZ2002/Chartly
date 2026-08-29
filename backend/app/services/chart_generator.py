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
        bar_labels = [_format_label_value(v, chart_type) for v in chart_df[metric]] if spec.get("show_labels") else None
        if orientation == "horizontal":
            fig = px.bar(
                chart_df,
                x=metric,
                y=dimension,
                orientation="h",
                title=title,
                color_discrete_sequence=colors,
                text=bar_labels,
            )
        else:
            fig = px.bar(
                chart_df,
                x=dimension,
                y=metric,
                title=title,
                color_discrete_sequence=colors,
                text=bar_labels,
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
        funnel_labels = [_format_label_value(v, chart_type) for v in chart_df[metric]] if spec.get("show_labels") else None
        fig = px.funnel(
            chart_df,
            x=metric,
            y=dimension,
            title=title,
            color_discrete_sequence=colors,
            text=funnel_labels,
        )
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    _apply_labels(fig, chart_type, chart_df, metric, spec)

    return _finalize(fig, spec)


def _format_label_value(value, chart_type: str) -> str:
    if isinstance(value, float):
        if value == int(value):
            return f"{int(value):,}"
        return f"{value:,.2f}"
    return str(value)


def _apply_labels(fig, chart_type: str, chart_df: pd.DataFrame, metric: str, spec: dict[str, Any]):
    if not spec.get("show_labels"):
        return

    values = chart_df[metric]
    labels = [_format_label_value(v, chart_type) for v in values]

    if chart_type == "bar":
        fig.update_traces(
            text=labels,
            textposition="outside",
            textfont=dict(size=11, color="#374151"),
            hovertemplate="%{y}: %{x}<extra></extra>",
        )
        fig.update_layout(
            uniformtext_minsize=8,
            uniformtext_mode="hide",
            margin=dict(b=80 if len(labels) > 5 else 60),
        )

    elif chart_type == "line":
        fig.update_traces(
            text=labels,
            textposition="top center",
            textfont=dict(size=11, color="#374151"),
            hovertemplate="%{x}: %{y}<extra></extra>",
        )

    elif chart_type == "area":
        fig.update_traces(
            text=labels,
            textposition="top center",
            textfont=dict(size=11, color="#374151"),
            hovertemplate="%{x}: %{y}<extra></extra>",
        )

    elif chart_type == "pie":
        fig.update_traces(
            textinfo="label+percent+value",
            texttemplate="%{label}<br>%{value:,.0f}<br>%{percent}",
            textposition="inside",
            textfont=dict(size=12, color="white"),
            hovertemplate="%{label}: %{value:,.0f} (%{percent})<extra></extra>",
        )

    elif chart_type == "scatter":
        fig.update_traces(
            text=labels,
            textposition="top center",
            textfont=dict(size=11, color="#374151"),
            hovertemplate="%{x}: %{y}<extra></extra>",
        )

    elif chart_type == "treemap":
        fig.update_traces(
            textinfo="label+value+percent parent",
            textfont=dict(size=13),
            hovertemplate="%{label}<br>Value: %{value:,.0f}<br>%{percentParent}<extra></extra>",
        )

    elif chart_type == "funnel":
        fig.update_traces(
            text=labels,
            textinfo="text+value+percent initial",
            textfont=dict(size=12, color="white"),
            hovertemplate="%{y}: %{x:,.0f}<extra></extra>",
        )


def _finalize(fig, spec: dict[str, Any]) -> str:
    font_family = spec.get("font_family")
    top_margin = 80 if spec.get("show_labels") else 60
    fig.update_layout(
        template="plotly_white",
        font=dict(family=font_family or "system-ui, sans-serif"),
        margin=dict(l=40, r=40, t=top_margin, b=40),
    )

    return pio.to_json(fig)


def chart_to_html(chart_json: str) -> str:
    fig = pio.from_json(chart_json)
    return pio.to_html(fig, full_html=False, include_plotlyjs="cdn")
