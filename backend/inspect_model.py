
import os
import onnxruntime as ort

# Locate the ONNX model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "best.onnx")

print("=" * 55)
print("SITEGUARD AI - ONNX MODEL INSPECTION")
print("=" * 55)

# Check model existence
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

print(f"\nModel path: {MODEL_PATH}")
print(f"Model size: {os.path.getsize(MODEL_PATH) / (1024 * 1024):.2f} MB")

# Create ONNX Runtime session
session = ort.InferenceSession(
    MODEL_PATH,
    providers=["CPUExecutionProvider"]
)

# Model execution providers
print("\nExecution Providers:")
print(session.get_providers())

# Input information
print("\nMODEL INPUTS")
for item in session.get_inputs():
    print("Name:", item.name)
    print("Shape:", item.shape)
    print("Data type:", item.type)

# Output information
print("\nMODEL OUTPUTS")
for item in session.get_outputs():
    print("Name:", item.name)
    print("Shape:", item.shape)
    print("Data type:", item.type)

# Model metadata
print("\nMODEL METADATA")
metadata = session.get_modelmeta()

print("Description:", metadata.description)
print("Producer:", metadata.producer_name)
print("Version:", metadata.version)
print("Custom Metadata:", metadata.custom_metadata_map)

print("\nInspection completed!")
