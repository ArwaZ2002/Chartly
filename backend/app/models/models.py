import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="viewer")  # viewer, analyst, admin
    created_at = Column(DateTime, default=datetime.utcnow)

    datasets = relationship("Dataset", back_populates="uploader")
    charts = relationship("Chart", back_populates="creator")
    audit_entries = relationship("AuditEntry", back_populates="user")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    columns_profile = Column(JSON, nullable=False)
    row_count = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)

    uploader = relationship("User", back_populates="datasets")
    charts = relationship("Chart", back_populates="dataset", cascade="all, delete-orphan")


class Chart(Base):
    __tablename__ = "charts"

    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    specification = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    dataset = relationship("Dataset", back_populates="charts")
    creator = relationship("User", back_populates="charts")
    versions = relationship(
        "ChartVersion",
        back_populates="chart",
        cascade="all, delete-orphan",
        order_by=lambda: (ChartVersion.created_at, ChartVersion.id),
    )
    audit_entries = relationship("AuditEntry", back_populates="chart", cascade="all, delete-orphan")


class ChartVersion(Base):
    __tablename__ = "chart_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    chart_id = Column(String, ForeignKey("charts.id"), nullable=False)
    specification = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    chart = relationship("Chart", back_populates="versions")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    chart_type = Column(String, nullable=False)
    specification = Column(JSON, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")


class ThemeTemplate(Base):
    __tablename__ = "theme_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    colors = Column(JSON, nullable=False, default=list)
    font_family = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")


class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id = Column(String, primary_key=True, default=generate_uuid)
    chart_id = Column(String, ForeignKey("charts.id"), nullable=False)
    action = Column(String, nullable=False)  # create, regenerate, export, save_template
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    specification = Column(JSON, nullable=False)

    chart = relationship("Chart", back_populates="audit_entries")
    user = relationship("User", back_populates="audit_entries")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti = Column(String, primary_key=True)
    expires_at = Column(DateTime, nullable=False, index=True)
