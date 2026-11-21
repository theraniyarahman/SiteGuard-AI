
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Request,
    UploadFile,
    Depends
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inspection import Inspection, Detection


router = APIRouter(
    prefix="/api",
    tags=["SiteGuard Inspection"]
)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIR = PROJECT_ROOT / "backend" / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/inspect")
async def inspect_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Validate file extension
    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are supported."
        )

    # Read uploaded image
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB."
        )

    # Decode image
    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or unreadable image."
        )

    # Get initialized services
    detector = request.app.state.detector
    safety_engine = request.app.state.safety_engine

    original_path = None
    annotated_path = None

    try:

        # 1. Run object detection
        detections = detector.predict(image)

        # 2. Analyze PPE safety
        report = safety_engine.analyze(detections)

        # 3. Generate annotated image
        annotated_image = detector.annotate(image, detections)

        # 4. Generate unique filenames
        file_id = str(uuid4())

        original_filename = f"{file_id}{extension}"
        annotated_filename = f"{file_id}_annotated.jpg"

        original_path = UPLOAD_DIR / original_filename
        annotated_path = UPLOAD_DIR / annotated_filename

        # 5. Save images
        if not cv2.imwrite(str(original_path), image):
            raise RuntimeError("Could not save uploaded image.")

        if not cv2.imwrite(str(annotated_path), annotated_image):
            raise RuntimeError("Could not save annotated image.")

        # 6. Create inspection database record
        risk = report["risk_assessment"]
        summary = report["summary"]

        inspection_record = Inspection(
            file_id=file_id,
            filename=file.filename or "uploaded_image",
            inspection_status=report["inspection_status"],
            risk_level=risk["risk_level"],
            risk_score=risk["risk_score"],
            total_detections=summary["total_detections"],
            people_detected=summary["people_detected"],
            equipment_detected=summary["equipment_detected"],
            ppe_detections=summary["ppe_detections"],
            potential_violations=summary["potential_violations"]
        )

        db.add(inspection_record)

        # Flush to generate the inspection ID
        db.flush()

        # 7. Save individual detections
        for item in detections:

            x1, y1, x2, y2 = item["box"]

            detection_record = Detection(
                inspection_id=inspection_record.id,
                class_name=item["class_name"],
                confidence=item["confidence"],
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2
            )

            db.add(detection_record)

        # 8. Commit all database records
        db.commit()

        # 9. Return existing API response
        return {
            "status": "success",
            "file_id": file_id,
            "filename": file.filename,
            "inspection": report,
            "detections": detections,
            "images": {
                "original": f"/uploads/{original_filename}",
                "annotated": f"/uploads/{annotated_filename}"
            }
        }

    except Exception as error:

        # Roll back incomplete database transaction
        db.rollback()

        # Remove images if the inspection failed
        for path in [original_path, annotated_path]:
            if path and path.exists():
                path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Inspection failed: {str(error)}"
        ) from error

@router.get("/inspections")
def get_inspections(db: Session = Depends(get_db)):

    inspections = (
        db.query(Inspection)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    results = []

    for inspection in inspections:

        results.append({
            "id": inspection.id,
            "file_id": inspection.file_id,
            "filename": inspection.filename,
            "inspection_status": inspection.inspection_status,
            "risk_level": inspection.risk_level,
            "risk_score": inspection.risk_score,
            "total_detections": inspection.total_detections,
            "people_detected": inspection.people_detected,
            "equipment_detected": inspection.equipment_detected,
            "ppe_detections": inspection.ppe_detections,
            "potential_violations": inspection.potential_violations,
            "created_at": inspection.created_at
        })

    return {
        "status": "success",
        "total_inspections": len(results),
        "inspections": results
    }


@router.get("/inspections/{file_id}")
def get_inspection_details(
    file_id: str,
    db: Session = Depends(get_db)
):

    inspection = (
        db.query(Inspection)
        .filter(Inspection.file_id == file_id)
        .first()
    )

    if inspection is None:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found."
        )

    detection_results = []

    for detection in inspection.detections:

        detection_results.append({
            "class_name": detection.class_name,
            "confidence": detection.confidence,
            "box": [
                detection.x1,
                detection.y1,
                detection.x2,
                detection.y2
            ]
        })

    extension = Path(inspection.filename).suffix.lower()

    return {
        "status": "success",

        "inspection": {
            "id": inspection.id,
            "file_id": inspection.file_id,
            "filename": inspection.filename,
            "inspection_status": inspection.inspection_status,
            "risk_assessment": {
                "risk_level": inspection.risk_level,
                "risk_score": inspection.risk_score,
                "potential_violation_count": inspection.potential_violations
            },
            "summary": {
                "total_detections": inspection.total_detections,
                "people_detected": inspection.people_detected,
                "equipment_detected": inspection.equipment_detected,
                "ppe_detections": inspection.ppe_detections,
                "potential_violations": inspection.potential_violations
            },
            "created_at": inspection.created_at
        },

        "detections": detection_results,

        "images": {
            "original": f"/uploads/{inspection.file_id}{extension}",
            "annotated": f"/uploads/{inspection.file_id}_annotated.jpg"
        }
    }
