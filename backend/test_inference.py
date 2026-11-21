
import sys
from pathlib import Path

import cv2

from app.services.detection import PPEDetector


def main():

    if len(sys.argv) < 2:
        print("Usage: python test_inference.py path/to/image.jpg")
        return

    image_path = Path(sys.argv[1])

    if not image_path.exists():
        print("Image not found:", image_path)
        return

    image = cv2.imread(str(image_path))

    if image is None:
        print("Could not read image")
        return

    detector = PPEDetector(confidence=0.25, iou=0.45)

    detections = detector.predict(image)

    annotated = detector.annotate(image, detections)

    output_dir = Path("test_outputs")
    output_dir.mkdir(exist_ok=True)

    output_path = output_dir / f"{image_path.stem}_annotated.jpg"

    cv2.imwrite(str(output_path), annotated)

    print("\nSITEGUARD AI - INFERENCE RESULTS")
    print("=" * 45)

    print("Total detections:", len(detections))

    for detection in detections:
        print(
            detection["class_name"],
            "| Confidence:", detection["confidence"],
            "| Box:", detection["box"]
        )

    print("\nAnnotated image saved to:", output_path.resolve())


if __name__ == "__main__":
    main()
