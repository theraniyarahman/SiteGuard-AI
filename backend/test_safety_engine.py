
from pathlib import Path
import cv2

from app.services.detection import PPEDetector
from app.services.safety_engine import PPESafetyEngine


# Initialize detector
detector = PPEDetector(
    confidence=0.40,
    iou=0.45
)

engine = PPESafetyEngine()

# Load test image
image_path = Path("test_images/2.jpg")
image = cv2.imread(str(image_path))

if image is None:
    raise FileNotFoundError(
        f"Image not found: {image_path}"
    )

# Run detection
detections = detector.predict(image)

print("\n--- ALL DETECTIONS ---")

for detection in detections:
    print(
        f"{detection['class_name']} | "
        f"Confidence: {detection['confidence']} | "
        f"Box: {detection['box']}"
    )

# Generate inspection report
report = engine.analyze(detections)

print("\n--- SITEGUARD AI INSPECTION ---")
print("Inspection Status:", report["inspection_status"])
print("Risk Assessment:", report["risk_assessment"])
print("Detection Summary:", report["summary"])
print("Detected PPE:", report["ppe_detected"])
print("Potential Violations:", report["violations"])

# Generate annotated image
annotated = detector.annotate(
    image,
    detections
)

output_path = Path("test_outputs/debug_result.jpg")
output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

cv2.imwrite(str(output_path), annotated)

print("\nAnnotated image saved:", output_path)
