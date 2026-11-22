
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.services.detection import PPEDetector
from app.services.safety_engine import PPESafetyEngine


PROJECT_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = PROJECT_ROOT / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Initializing SiteGuard AI...")

    app.state.detector = PPEDetector(
    confidence=0.40,
    iou=0.45
)

    app.state.safety_engine = PPESafetyEngine()

    print("SiteGuard AI services initialized.")

    yield

    print("SiteGuard AI shutting down.")


app = FastAPI(
    title="SiteGuard AI",
    description="Industrial PPE Safety Inspection API",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://theraniyarahman.github.io"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to SiteGuard AI",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "SiteGuard AI"
    }
