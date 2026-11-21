
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)

    file_id = Column(String(100), unique=True, nullable=False, index=True)
    filename = Column(String(255), nullable=False)

    inspection_status = Column(String(100), nullable=False)

    risk_level = Column(String(20), nullable=False)
    risk_score = Column(Float, nullable=False)

    total_detections = Column(Integer, default=0)
    people_detected = Column(Integer, default=0)
    equipment_detected = Column(Integer, default=0)
    ppe_detections = Column(Integer, default=0)
    potential_violations = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    detections = relationship(
        "Detection",
        back_populates="inspection",
        cascade="all, delete-orphan"
    )


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)

    inspection_id = Column(
        Integer,
        ForeignKey("inspections.id"),
        nullable=False
    )

    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)

    x1 = Column(Integer)
    y1 = Column(Integer)
    x2 = Column(Integer)
    y2 = Column(Integer)

    inspection = relationship(
        "Inspection",
        back_populates="detections"
    )
