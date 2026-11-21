# SiteGuard AI – AI-Powered Industrial PPE Safety Monitoring

SiteGuard AI is an AI-powered industrial safety monitoring application that uses computer vision to detect Personal Protective Equipment (PPE) and identify potential safety violations in industrial environments.

The application analyzes uploaded workplace images, detects safety equipment and missing PPE, generates annotated images, and stores inspection results for further review through an interactive dashboard.

## Live Demo

**Website:** [Add your deployed website URL here]

**GitHub Repository:** 

## Project Overview

Workplace safety is an important concern in industrial environments. Manually monitoring PPE compliance can be time-consuming, especially in large work areas.

SiteGuard AI explores how computer vision can assist safety monitoring by automatically identifying PPE-related objects in uploaded images and highlighting potential violations.

## Key Features

- **AI-Based PPE Detection:** Detects helmets, gloves, safety vests, boots and goggles using a trained YOLO-based ONNX model.
- **Missing PPE Identification:** Identifies potential missing-PPE detections such as no helmet, no gloves and no safety vest.
- **Image Annotation:** Generates annotated images with bounding boxes, class labels and confidence scores.
- **Safety Risk Assessment:** Assigns LOW, MEDIUM or HIGH risk levels based on detected potential violations.
- **Inspection History:** Stores and retrieves previous inspection records.
- **Analytics Dashboard:** Displays inspection statistics, detection counts and risk-level summaries.
- **PDF Reports:** Generates downloadable inspection reports.
- **CSV Export:** Supports exporting inspection records.
- **REST API:** Uses FastAPI to handle image uploads, inspections and database operations.
- **Database Integration:** Stores inspection information and individual detection records in PostgreSQL.
- **Docker Support:** Uses Docker Compose to run the backend and PostgreSQL database together.

## Technology Stack

| Category | Technologies |
|---|---|
| Programming Language | Python, JavaScript |
| Frontend | HTML, CSS, JavaScript |
| Backend | FastAPI |
| Computer Vision | OpenCV, NumPy |
| AI Model | YOLO, ONNX Runtime |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| API Testing | Swagger UI |
| Containerization | Docker, Docker Compose |
| Version Control | Git, GitHub |

## AI Model

SiteGuard AI uses a trained YOLO-based object detection model exported to ONNX format.

The model is loaded using ONNX Runtime with CPU execution.

**Detected classes:**

| Category | Classes |
|---|---|
| PPE Equipment | Helmet, Gloves, Vest, Boots, Goggles |
| Person | Person |
| Missing PPE | No Helmet, No Gloves, No Vest, No Boots, No Goggles |
| Industrial Equipment | Forklift |

The detection pipeline includes:

1. Image preprocessing and resizing.
2. Model inference using ONNX Runtime.
3. Confidence threshold filtering.
4. Class-wise Non-Maximum Suppression (NMS).
5. Bounding box coordinate transformation.
6. Detection annotation and result generation.

## Safety Assessment

The application assigns a preliminary risk level based on the number of potential missing-PPE detections.

| Potential Violations | Risk Level | Risk Score |
|---|---|---|
| 0 | LOW | 0 |
| 1–2 | MEDIUM | 50 |
| More than 2 | HIGH | 100 |

**Note:** These scores are rule-based indicators, not calibrated probabilities of workplace accidents or individual worker non-compliance. The current implementation does not associate PPE detections with individual workers. Results should be reviewed by a qualified safety professional.

## Application Architecture

```text
                 SITEGUARD AI
                       |
          +------------+------------+
          |                         |
       Frontend                  Backend
   HTML, CSS, JavaScript         FastAPI
          |                         |
          |                    Image Upload
          |                         |
          |                    ONNX Model
          |                         |
          |                   PPE Detection
          |                         |
          |                  Safety Assessment
          |                         |
          |                    Annotation
          |                         |
          |                    PostgreSQL
          |                         |
          +-------------------------+
                       |
                Results Dashboard
```

## Project Structure

```text
SiteGuard-AI/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── uploads/
│   ├── requirements.txt
│   ├── create_tables.py
│   └── Dockerfile
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
│
├── model/
│   └── best.onnx
│
├── database/
├── .dockerignore
├── .gitignore
├── .env
├── docker-compose.yml
└── README.md
```

## Running the Project Locally

### Prerequisites

- Python 3.11
- PostgreSQL
- Git
- A modern web browser

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SiteGuard-AI
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/siteguard_db
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

Make sure the `siteguard_db` database exists before proceeding.

### 5. Create database tables

```bash
cd backend
python create_tables.py
```

### 6. Start the backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8004
```

Backend:

`http://127.0.0.1:8004`

API documentation:

`http://127.0.0.1:8004/docs`

### 7. Start the frontend

Open the `frontend` folder using VS Code Live Server.

The application will be available at:

`http://127.0.0.1:5500/frontend/index.html`

## Running with Docker

Docker Compose can run the backend and PostgreSQL database together.

### Prerequisites

- Docker Desktop
- Docker Compose

### 1. Configure the environment

Add the following to the root `.env` file:

```env
POSTGRES_PASSWORD=YOUR_DOCKER_PASSWORD
```

Use a strong password. Keep this file private.

### 2. Build the Docker image

```bash
docker compose build
```

### 3. Start the containers

```bash
docker compose up -d
```

### 4. Check running containers

```bash
docker compose ps
```

### 5. View backend logs

```bash
docker compose logs -f backend
```

### 6. Access the API

`http://localhost:8004/docs`

### 7. Stop the containers

```bash
docker compose down
```

To remove the containers and database volume permanently:

```bash
docker compose down -v
```

**Warning:** The `-v` option deletes the stored PostgreSQL data.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome message |
| GET | `/health` | Application health check |
| POST | `/api/inspect` | Upload and inspect an image |
| GET | `/api/inspections` | Retrieve inspection history |
| GET | `/api/inspections/{file_id}` | Retrieve inspection details |

Interactive API documentation is available through FastAPI Swagger UI at `/docs`.

## Future Improvements

- Real-time video-based PPE monitoring.
- Person-level PPE association.
- Improved risk assessment and validation.
- User authentication and role-based access.
- Cloud deployment and scalable storage.
- Model performance evaluation and reliability testing.

## Important Notes

- The model currently runs using ONNX Runtime with CPU execution.
- Detection results depend on image quality, model accuracy and confidence thresholds.
- Missing-PPE detections are potential violations and should not be treated as definitive proof of non-compliance.
- This application is a prototype intended to assist safety monitoring, not replace professional workplace safety inspections.

## Author

**Raniya Rahman**

GitHub: [@your-github-username](https://github.com/your-github-username)
Developed as a portfolio project focused on AI, computer vision and full-stack application development.
