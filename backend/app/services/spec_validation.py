from typing import Any, Optional

SUPPORTED_CHART_TYPES = {"bar", "line", "area", "pie", "scatter", "histogram", "box", "violin", "treemap", "funnel"}
SUPPORTED_AGGREGATIONS = {"sum", "average", "count", "min", "max"}
SUPPORTED_SORTING = {"none", "asc", "desc"}
SUPPORTED_GRANULARITIES = {"day", "week", "month", "quarter", "year"}
SUPPORTED_ORIENTATIONS = {"vertical", "horizontal"}
TIME_CHART_TYPES = {"bar", "line", "area"}


def validate_specification(columns: list[dict[str, Any]], spec: dict[str, Any]) -> Optional[str]:
    """Return an error message if the specification is invalid, else None."""
    chart_type = spec.get("chart_type")
    if chart_type not in SUPPORTED_CHART_TYPES:
        return f"Unsupported chart type: {chart_type}"

    dimension = spec.get("dimension")
    metric = spec.get("metric")
    aggregation = spec.get("aggregation", "sum")

    col_by_name = {c["name"]: c for c in columns}

    if not dimension:
        return "A dimension (X-axis) column is required"
    if dimension not in col_by_name:
        return f"Column '{dimension}' does not exist in this dataset"

    if chart_type != "histogram" and not metric:
        return "A metric (Y-axis) column is required"
    if metric and metric not in col_by_name:
        return f"Column '{metric}' does not exist in this dataset"

    if chart_type != "histogram" and metric:
        met_col = col_by_name[metric]
        if met_col["type"] != "number" and aggregation != "count":
            return f"Column '{metric}' is not numeric — use Count aggregation or pick a numeric metric"

    if aggregation not in SUPPORTED_AGGREGATIONS:
        return f"Unsupported aggregation: {aggregation}"

    sorting = spec.get("sorting", "none")
    if sorting not in SUPPORTED_SORTING:
        return f"Unsupported sorting: {sorting}"

    orientation = spec.get("orientation", "vertical")
    if orientation not in SUPPORTED_ORIENTATIONS:
        return f"Unsupported orientation: {orientation}"

    granularity = spec.get("time_granularity")
    if granularity:
        if granularity not in SUPPORTED_GRANULARITIES:
            return f"Unsupported time granularity: {granularity}"
        if chart_type not in TIME_CHART_TYPES:
            return f"Time granularity is only supported for {', '.join(sorted(TIME_CHART_TYPES))} charts"
        dim_col = col_by_name.get(dimension)
        if not dim_col or dim_col["type"] != "date":
            return "Time granularity requires a date column as the dimension"

    return None