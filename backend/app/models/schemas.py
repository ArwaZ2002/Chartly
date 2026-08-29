from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# Auth
class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "viewer"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


# Dataset
class ColumnProfileResponse(BaseModel):
    name: str
    type: str
    unique_count: int
    missing_count: int
    sample_values: list[str]


class DatasetResponse(BaseModel):
    id: str
    name: str
    display_name: Optional[str] = None
    file_name: str
    columns: list[ColumnProfileResponse]
    row_count: int
    uploaded_at: datetime
    uploaded_by: str

    class Config:
        from_attributes = True


# Chart Specification
class ChartSpecification(BaseModel):
    chart_type: str  # bar, line, pie, scatter
    dimension: str
    metric: str
    aggregation: str  # sum, average, count, min, max
    sorting: str = "none"  # asc, desc, none
    time_granularity: Optional[str] = None
    title: Optional[str] = None
    colors: Optional[list[str]] = None
    font_family: Optional[str] = None
    orientation: Optional[str] = "vertical"  # vertical, horizontal


class ChartGenerateRequest(BaseModel):
    dataset_id: str
    specification: ChartSpecification


class ChartResponse(BaseModel):
    id: str
    dataset_id: str
    specification: ChartSpecification
    created_at: datetime
    created_by: str
    current_version_id: Optional[str] = None
    versions: list[dict] = []

    class Config:
        from_attributes = True


class ChartRecommendation(BaseModel):
    chart_type: str
    reason: str


# Template
class TemplateCreateRequest(BaseModel):
    chart_id: str
    name: str


class TemplateApplyRequest(BaseModel):
    template_id: str
    dataset_id: str


class TemplateApplyResponse(BaseModel):
    template_id: str
    template_name: str
    specification: ChartSpecification


class TemplateResponse(BaseModel):
    id: str
    name: str
    chart_type: str
    specification: ChartSpecification
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# Theme Template (chart styling: colors + font)
class ThemeTemplateCreate(BaseModel):
    name: str
    colors: list[str]
    font_family: Optional[str] = None


class ThemeTemplateResponse(BaseModel):
    id: str
    name: str
    colors: list[str]
    font_family: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# Audit
class AuditEntryResponse(BaseModel):
    id: str
    chart_id: str
    action: str
    user_id: str
    user_name: str
    timestamp: datetime
    specification: ChartSpecification

    class Config:
        from_attributes = True
