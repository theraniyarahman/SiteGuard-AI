
from pathlib import Path
import ast

import cv2
import numpy as np
import onnxruntime as ort


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "model" / "best.onnx"


class PPEDetector:

    def __init__(self, confidence=0.25, iou=0.45):

        self.confidence = confidence
        self.iou = iou
        self.input_size = 640

        # Class names from the trained model
        self.class_names = {
            0: "helmet",
            1: "gloves",
            2: "vest",
            3: "boots",
            4: "goggles",
            5: "Person",
            6: "no_helmet",
            7: "no_goggle",
            8: "no_gloves",
            9: "no_boots",
            10: "forklift",
            11: "no_vest"
        }

        # Class-specific colors (BGR format)
        self.colors = {
            "Person": (255, 140, 0),
            "helmet": (0, 200, 0),
            "gloves": (0, 165, 255),
            "vest": (255, 200, 0),
            "boots": (200, 100, 255),
            "goggles": (255, 0, 200),
            "no_helmet": (0, 0, 255),
            "no_goggle": (0, 0, 255),
            "no_gloves": (0, 0, 255),
            "no_boots": (0, 0, 255),
            "no_vest": (0, 0, 255),
            "forklift": (180, 180, 0)
        }

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"ONNX model not found: {MODEL_PATH}"
            )

        self.session = ort.InferenceSession(
            str(MODEL_PATH),
            providers=["CPUExecutionProvider"]
        )

        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

        print("SiteGuard AI ONNX model loaded successfully.")

    # -----------------------------------------
    # Image preprocessing
    # -----------------------------------------

    def preprocess(self, image):

        height, width = image.shape[:2]

        scale = min(
            self.input_size / width,
            self.input_size / height
        )

        new_width = int(round(width * scale))
        new_height = int(round(height * scale))

        resized = cv2.resize(
            image,
            (new_width, new_height)
        )

        canvas = np.full(
            (self.input_size, self.input_size, 3),
            114,
            dtype=np.uint8
        )

        pad_x = (self.input_size - new_width) // 2
        pad_y = (self.input_size - new_height) // 2

        canvas[
            pad_y:pad_y + new_height,
            pad_x:pad_x + new_width
        ] = resized

        image_rgb = cv2.cvtColor(
            canvas,
            cv2.COLOR_BGR2RGB
        )

        image_array = image_rgb.astype(np.float32) / 255.0

        image_array = np.transpose(
            image_array,
            (2, 0, 1)
        )

        image_array = np.expand_dims(
            image_array,
            axis=0
        )

        return image_array, scale, pad_x, pad_y

    # -----------------------------------------
    # ONNX prediction
    # -----------------------------------------

    def predict(self, image):

        input_tensor, scale, pad_x, pad_y = self.preprocess(image)

        outputs = self.session.run(
            [self.output_name],
            {self.input_name: input_tensor}
        )

        predictions = outputs[0][0]

        # Expected YOLO output: (16, 8400)
        if predictions.shape[0] < predictions.shape[1]:
            predictions = predictions.T

        boxes = predictions[:, :4]
        scores = predictions[:, 4:]

        class_ids = np.argmax(scores, axis=1)
        confidences = np.max(scores, axis=1)

        valid = confidences >= self.confidence

        boxes = boxes[valid]
        confidences = confidences[valid]
        class_ids = class_ids[valid]

        image_height, image_width = image.shape[:2]

        detections = []

        # Class-wise Non-Maximum Suppression
        for class_id in np.unique(class_ids):

            class_mask = class_ids == class_id

            class_boxes = boxes[class_mask]
            class_scores = confidences[class_mask]

            xywh_boxes = []

            for box in class_boxes:

                cx, cy, w, h = box

                x = cx - w / 2
                y = cy - h / 2

                xywh_boxes.append([
                    float(x),
                    float(y),
                    float(w),
                    float(h)
                ])

            indices = cv2.dnn.NMSBoxes(
                xywh_boxes,
                class_scores.tolist(),
                self.confidence,
                self.iou
            )

            if len(indices) == 0:
                continue

            indices = np.array(indices).flatten()

            for index in indices:

                x, y, w, h = xywh_boxes[index]

                # Reverse letterbox transformation
                x1 = int((x - pad_x) / scale)
                y1 = int((y - pad_y) / scale)
                x2 = int((x + w - pad_x) / scale)
                y2 = int((y + h - pad_y) / scale)

                # Keep boxes inside image boundaries
                x1 = max(0, min(x1, image_width - 1))
                y1 = max(0, min(y1, image_height - 1))
                x2 = max(0, min(x2, image_width - 1))
                y2 = max(0, min(y2, image_height - 1))

                if x2 <= x1 or y2 <= y1:
                    continue

                detections.append({
                    "class_id": int(class_id),
                    "class_name": self.class_names.get(
                        int(class_id),
                        f"class_{class_id}"
                    ),
                    "confidence": round(
                        float(class_scores[index]), 4
                    ),
                    "box": [x1, y1, x2, y2]
                })

        return detections

    # -----------------------------------------
    # Annotation helpers
    # -----------------------------------------

    def _draw_label(
        self,
        image,
        text,
        x1,
        y1,
        x2,
        y2,
        color,
        occupied
    ):

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness = 2
        padding = 6

        text_width, text_height = cv2.getTextSize(
            text,
            font,
            font_scale,
            thickness
        )[0]

        label_width = text_width + padding * 2
        label_height = text_height + padding * 2

        image_height, image_width = image.shape[:2]

        # Try above the box, then inside/below it.
        candidates = [
            (x1, y1 - label_height),
            (x1, y1),
            (x1, y2),
            (x1, y2 - label_height)
        ]

        # Add alternative positions to reduce label collisions.
        for offset in range(1, 5):
            candidates.append(
                (x1, y1 - label_height - offset * (label_height + 3))
            )

        chosen = None

        for lx, ly in candidates:

            lx = max(0, min(lx, image_width - label_width))
            ly = max(0, min(ly, image_height - label_height))

            rect = (
                lx,
                ly,
                lx + label_width,
                ly + label_height
            )

            overlaps = any(
                not (
                    rect[2] <= other[0]
                    or rect[0] >= other[2]
                    or rect[3] <= other[1]
                    or rect[1] >= other[3]
                )
                for other in occupied
            )

            if not overlaps:
                chosen = (lx, ly, rect)
                break

        if chosen is None:
            lx = max(0, min(x1, image_width - label_width))
            ly = max(0, min(y1, image_height - label_height))
            chosen = (
                lx,
                ly,
                (
                    lx,
                    ly,
                    lx + label_width,
                    ly + label_height
                )
            )

        lx, ly, rect = chosen

        occupied.append(rect)

        # Label background
        cv2.rectangle(
            image,
            (lx, ly),
            (lx + label_width, ly + label_height),
            color,
            -1
        )

        # Label text
        cv2.putText(
            image,
            text,
            (lx + padding, ly + text_height + padding // 2),
            font,
            font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA
        )

    # -----------------------------------------
    # Draw detections
    # -----------------------------------------

    def annotate(self, image, detections):

        annotated = image.copy()

        occupied_labels = []

        # Draw larger boxes first, then smaller boxes.
        ordered = sorted(
            detections,
            key=lambda item: (
                item["box"][2] - item["box"][0]
            ) * (
                item["box"][3] - item["box"][1]
            ),
            reverse=True
        )

        for detection in ordered:

            class_name = detection["class_name"]
            print("ANNOTATING:", class_name)
            confidence = detection["confidence"]

            x1, y1, x2, y2 = detection["box"]

            color = self.colors.get(
                class_name,
                (255, 255, 255)
            )

            # Bounding box
            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                color,
                3
            )

            # Readable class and confidence label
            label = (
                f"{class_name.replace('_', ' ').upper()} "
                f"| {confidence * 100:.1f}%"
            )

            self._draw_label(
                annotated,
                label,
                x1,
                y1,
                x2,
                y2,
                color,
                occupied_labels
            )

        return annotated
