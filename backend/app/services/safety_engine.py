
from collections import Counter


class PPESafetyEngine:

    PPE_CLASSES = {
        "helmet",
        "gloves",
        "vest",
        "boots",
        "goggles"
    }

    VIOLATION_MAPPING = {
        "no_helmet": "helmet",
        "no_gloves": "gloves",
        "no_vest": "vest",
        "no_boots": "boots",
        "no_goggle": "goggles"
    }

    def analyze(self, detections):

        class_counts = Counter()
        violations = Counter()
        ppe_detected = Counter()

        people_count = 0
        equipment_count = 0

        for detection in detections:

            class_name = detection["class_name"].strip().lower()

            class_counts[class_name] += 1

            if class_name == "person":
                people_count += 1

            elif class_name == "forklift":
                equipment_count += 1

            elif class_name in self.PPE_CLASSES:
                ppe_detected[class_name] += 1

            elif class_name in self.VIOLATION_MAPPING:
                violations[class_name] += 1

        total_violations = sum(violations.values())

        # Risk assessment based on detected violation instances.
        # This is an initial screening score, not a worker-level
        # compliance percentage.
        if total_violations == 0:
            risk_level = "LOW"
            risk_score = 0

        elif total_violations <= 2:
            risk_level = "MEDIUM"
            risk_score = 50

        else:
            risk_level = "HIGH"
            risk_score = 100

        if total_violations > 0:
            inspection_status = "Potential PPE violations detected"

        elif people_count > 0:
            inspection_status = "No missing-PPE detections found"

        else:
            inspection_status = "Inspection inconclusive"

        return {
            "inspection_status": inspection_status,

            "risk_assessment": {
                "risk_level": risk_level,
                "risk_score": risk_score,
                "potential_violation_count": total_violations
            },

            "summary": {
                "total_detections": len(detections),
                "people_detected": people_count,
                "equipment_detected": equipment_count,
                "ppe_detections": sum(ppe_detected.values()),
                "potential_violations": total_violations
            },

            "class_counts": dict(class_counts),

            "ppe_detected": dict(ppe_detected),

            "violations": {
                name: {
                    "count": count,
                    "missing_equipment": self.VIOLATION_MAPPING[name]
                }
                for name, count in violations.items()
            }
        }
