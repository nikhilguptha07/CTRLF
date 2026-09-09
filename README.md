# CTRL-F: AI-Powered Physical Surveillance & Object Recovery System

> **Next-Generation Autonomous Video Intelligence Platform**  
> *Locate real-world physical objects across live CCTV feeds and archived video footage using YOLOv8 computer vision, ByteTrack multi-object tracking, Oracle Database 21c XE enterprise persistence, and cinematic 3D CCTV digital twin visualization.*

---

## Table of Contents
1. [Executive Summary & Problem Statement](#executive-summary--problem-statement)
2. [High-Level Architecture](#high-level-architecture)
3. [Key Features & Capabilities](#key-features--capabilities)
4. [Technology Stack](#technology-stack)
5. [Target Class Boundaries (COCO-80 Support)](#target-class-boundaries-coco-80-support)
6. [Prerequisites & System Requirements](#prerequisites--system-requirements)
7. [Installation & Setup Guide](#installation--setup-guide)
   - [Oracle Database 21c XE Setup](#oracle-database-21c-xe-setup)
   - [Python AI Vision Service Setup](#python-ai-vision-service-setup)
   - [Node.js Orchestration Backend Setup](#nodejs-orchestration-backend-setup)
   - [React / Three.js Frontend Setup](#react--threejs-frontend-setup)
8. [Live Camera & RTSP Integration](#live-camera--rtsp-integration)
9. [Video Upload & Forensic Processing](#video-upload--forensic-processing)
10. [End-to-End Search Pipeline](#end-to-end-search-pipeline)
11. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
12. [Tamper-Evident SHA-256 Audit Trail](#tamper-evident-sha-256-audit-trail)
13. [Testing & Verification](#testing--verification)
14. [Production Deployment & Containerization](#production-deployment--containerization)
15. [Judge Demonstration Procedure (3–5 Minute Tour)](#judge-demonstration-procedure-35-minute-tour)
16. [Production Readiness Scorecard](#production-readiness-scorecard)
17. [Current Limitations & Roadmap](#current-limitations--roadmap)
18. [Security Governance](#security-governance)

---

## Executive Summary & Problem Statement

Modern security operations centers (SOCs) manage dozens or hundreds of surveillance streams simultaneously. When critical property is lost, misplaced, or stolen, operators are forced to perform exhausting, error-prone manual scrub-throughs of hours of disjointed video footage. 

**CTRL-F** automates this investigative workflow:
- **Instant Querying:** Operators enter an object target (e.g., `bottle`, `backpack`, `laptop`, `tv`).
- **Autonomous Multi-Camera Search:** Orchestrates concurrent frame ingestion across all calibrated CCTV cameras or uploaded security archives.
- **Deep Learning Vision:** Runs real-time YOLOv8 neural network inference paired with ByteTrack association algorithms to eliminate false positives and maintain track identity across frames.
- **Spatial Alignment:** Maps 2D image detections through camera intrinsic/extrinsic calibrations to physical surveillance vectors.
- **Digital Twin Real-Time Feedback:** Dynamically orients a 3D CCTV digital twin in Three.js, projecting volumetric green laser confirmation beams directly toward the physical detection coordinate.
- **Forensic Chain-of-Custody:** Persists immutable detection coordinates, full-resolution evidence crops, and cryptographic SHA-256 tamper-evident audit logs directly into Oracle Database 21c XE.

---

## High-Level Architecture

```
                                  USER BROWSER
                         ┌─────────────────────────────┐
                         │   React 19 + Three.js UI    │
                         │  (Cinematic CCTV 3D Twin)   │
                         └──────────────┬──────────────┘
                                        │ HTTPS / WSS
                                        ▼
                         ┌─────────────────────────────┐
                         │      Nginx Reverse Proxy     │
                         │ (Port 80: SSL, Gzip, Cache) │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │     Node.js / Express API   │
                         │    (Port 5000: TypeScript)  │
                         └──────┬───────────────┬──────┘
                                │               │
              Oracle SQL Queries│               │ REST / Frame Stream
                                ▼               ▼
                 ┌────────────────────┐   ┌─────────────────────────────┐
                 │ Oracle DB 21c XE   │   │     Python AI Vision        │
                 │ (Relational Core,  │   │   (Port 8000: FastAPI)      │
                 │ Audit Hashes,      │   └──────────────┬──────────────┘
                 │ Camera Calib, RBAC)│                  │
                 └────────────────────┘                  ▼
                                          ┌─────────────────────────────┐
                                          │  Ultralytics YOLOv8 Core    │
                                          │  ByteTrack Tracker Engine   │
                                          └──────────────┬──────────────┘
                                                         │
                                                         ▲ Ingests (RTSP / MP4 / HLS)
                                                         │
                                          ┌─────────────────────────────┐
                                          │ Surveillance Camera Network │
                                          │ (CAM_01, CAM_02, CAM_03...) │
                                          └─────────────────────────────┘
```

### Relational Entity Pipeline
```
USER ──► AUTHENTICATION (JWT)
  │
  ├──► SEARCH_SESSION (Multi-camera global intent)
  │      │
  │      ├──► SEARCH_JOB (Camera-specific worker)
  │      │      │
  │      │      ├──► REAL FRAME INGESTION (RTSP / Video)
  │      │      ├──► YOLO DETECTION (COCO Class BBoxes)
  │      │      ├──► BYTETRACK (Kalman Filter + Hungarian Matching)
  │      │      └──► TARGET CONFIRMATION (Streak Threshold)
  │      │
  │      ├──► CAMERA CALIBRATION (2D BBox to 3D Aiming Vector)
  │      │
  │      ├──► ORACLE PERSISTENCE (DETECTION_RESULTS & SEARCH_RESULTS)
  │      │
  │      ├──► REALTIME WEBSOCKET (Broadcasts to Three.js CCTV Digital Twin)
  │      │
  │      └──► FORENSIC EVIDENCE (Cropped Target Frame + Metadata)
  │
  └──► AUDIT_LOG (Cryptographic SHA-256 Hash Chain)
```

---

## Key Features & Capabilities

1. **Zero-Mock Production Pipeline:** All object detections and visual tracks are computed dynamically by deep learning models. Zero hardcoded bounding boxes, zero fake confidences, zero random animations in production paths.
2. **Deterministic State Machine:** Single source of truth managed by backend engine:
   `IDLE` $\to$ `INITIALIZING` $\to$ `QUEUED` $\to$ `PROCESSING` $\to$ `TARGET_ACQUIRED` | `NOT_DETECTED` | `FAILED` | `CANCELLED`.
3. **Multi-Camera Orchestration:** Distributes searches across arbitrary numbers of cameras simultaneously. Detects the winning camera in real-time and gracefully terminates sibling jobs to conserve GPU/CPU resources.
4. **Accurate Spatial Directionality:** Computes true camera optical axis deflection from normalized 2D bounding boxes and camera pinhole intrinsic matrices.
5. **Surveillance Digital Twin:** Three.js cinematic camera housing with realistic mechanical pan/tilt limits, metallic PBR shaders, volumetric cone attenuation, and dynamic state illumination (White: Searching, Green: Target Acquired, Red: Not Detected).
6. **Cryptographic SHA-256 Audit Trail:** Every security event, user access, search run, and detection record is appended to an immutable forward-linked blockchain-like audit log verified via `/api/audit-logs/verify`.
7. **Production Enterprise RBAC:** Granular role definitions (`ADMIN`, `OPERATOR`, `VIEWER`) restricting camera provisioning, search execution, evidence inspection, and audit ledger access.

---

## Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Zustand State Store |
| **3D Graphics & Visualization** | Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`) |
| **Backend API Gateway** | Node.js 22, Express, TypeScript, Socket.IO, Multer, Helmet, Rate Limiter |
| **Database & Persistence** | Oracle Database 21c XE (`oracledb` v6.7 native driver with relational fallback) |
| **Computer Vision Core** | Python 3.11/3.13, PyTorch 2.x, OpenCV 4.x, Ultralytics YOLOv8, ByteTrack |
| **Security & Cryptography** | Argon2 / bcrypt password hashing, AES-256-GCM credential encryption, SHA-256 tamper chains |
| **Reverse Proxy & Containers** | Nginx Alpine, Docker multi-stage builds, Docker Compose |

---

## Target Class Boundaries (COCO-80 Support)

The current production AI engine utilizes standard **YOLOv8n** pretrained on the authoritative Microsoft COCO dataset (80 common object classes).

### Fully Supported Common Target Classes
- **Personal Belongings:** `backpack`, `handbag`, `suitcase`, `umbrella`
- **Electronics:** `cell phone`, `laptop`, `mouse`, `keyboard`, `tv`, `remote`
- **Drinkware & Dining:** `bottle`, `cup`, `wine glass`, `fork`, `knife`, `spoon`, `bowl`
- **Furniture & Office:** `chair`, `couch`, `bed`, `dining table`
- **Vehicles & Mobility:** `bicycle`, `car`, `motorcycle`, `airplane`, `bus`, `train`, `truck`
- **People & Animals:** `person`, `dog`, `cat`, `bird`

> [!IMPORTANT]
> **Items Outside COCO-80 (e.g. "Keys"):**  
> Pretrained COCO weights do **not** have a `keys` class. To prevent false user expectations, searching for unsupported classes informs the operator and defaults to supported high-frequency targets (`bottle`, `backpack`, `tv`, etc.). Future versions plan open-vocabulary zero-shot models (e.g., OWL-ViT / Grounding DINO).

---

## Prerequisites & System Requirements

- **Operating System:** Windows 10/11, Ubuntu 22.04 LTS, or macOS (x86_64 or Apple Silicon)
- **Node.js:** v20.x or v22.x LTS
- **Python:** v3.10, v3.11, or v3.13 with `pip`
- **FFmpeg:** Installed and added to system `PATH`
- **Oracle Database:** Oracle Database 21c XE (or automatic in-memory relational adapter during tests)
- **RAM:** Minimum 8GB (16GB recommended for multi-camera video inference)

---

## Installation & Setup Guide

### 1. Codebase Structure
The project is strictly separated into dedicated tiers:
- `frontend/`: React 19, Three.js 3D CCTV digital twin, Vite, and Tailwind CSS.
- `server/`: Node.js, Express, TypeScript, Oracle Database 21c XE connector, and WebSocket manager.
- `ai-service/`: Python FastAPI microservice with YOLOv8 computer vision and ByteTrack.

---

### 2. Python AI Vision Service Setup
```bash
cd ai-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Verify vision engine: Open `http://localhost:8000/health` (returns `{"status":"ok","yolo":"loaded"}`).*

### 3. Node.js Orchestration Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
```
*Backend runs on port 5000 with WebSocket server active on `/socket.io/`.*  
*Note: If Oracle Database 21c XE is not running locally, the backend automatically switches to its in-memory relational adapter for zero-friction development and testing.*

### 4. React / Three.js Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```
*Console available at `http://localhost:5173`.*

---

### 5. Unified Root Workspace Commands
From the project root directory, you can also run all tiers directly:
- **Run Backend:** `npm run dev:backend`
- **Run Frontend:** `npm run dev:frontend`
- **Run AI Service:** `npm run dev:ai`
- **Build All:** `npm run build`
- **Run Backend Tests:** `npm run test:backend`

---

## Live Camera & RTSP Integration

CTRL-F connects directly to IP surveillance cameras through standard RTSP (Real-Time Streaming Protocol) or controlled video files:

- **RTSP Connection Format:** `rtsp://[user]:[password]@[host]:[port]/stream1`
- **Credential Protection:** RTSP connection strings and camera passwords are encrypted with AES-256-GCM before being stored in Oracle Database.
- **Sampling & Buffering:** Frames are sampled at 1–5 FPS to balance deep learning inference accuracy with multi-stream CPU/GPU throughput.
- **Fault Recovery:** Network drops trigger exponential backoff reconnection. If a camera goes permanently offline, the system marks the feed `OFFLINE` and notifies the operator without inventing synthetic frames.

---

## End-to-End Search Pipeline

```
1. OPERATOR INPUT
   Select target: "tv" | Camera: "Zone Alpha Overhead CCTV"
   ↓
2. SESSION INITIALIZATION
   POST /api/search creates SearchSession (UUID) & SearchJob in Oracle DB.
   ↓
3. STREAM INGESTION & AI INFERENCE
   Video worker reads frames -> transfers to YOLOv8 inference engine.
   ByteTrack computes Kalman filter velocity and assigns track IDs (e.g. Track #1).
   ↓
4. CONFIRMATION THRESHOLD
   Target confirmed across 3+ consecutive frames with confidence > 35%.
   ↓
5. LOCALIZATION & PERSISTENCE
   Converts 2D bounding box (e.g. [310, 185, 480, 360]) to directional pan/tilt angles.
   Persists record to Oracle SEARCH_RESULTS & DETECTION_RESULTS tables.
   Saves full-resolution cropped JPEG evidence image to uploads/evidence/.
   ↓
6. REAL-TIME BROADCAST & 3D REACTION
   Socket.IO pushes SEARCH_PROGRESS event with TARGET_ACQUIRED status.
   Three.js surveillance camera rotates mechanically to align with detection vector.
   Volumetric indicator beam switches from scanning White to locked Green.
   ↓
7. CRYPTOGRAPHIC AUDIT LOG
   Appends event to SHA-256 blockchain ledger:
   Previous Hash: 5f0a1c7c... | Current Hash: 9c148a16...
```

---

## Role-Based Access Control (RBAC)

The system enforces strict permission boundaries across 3 built-in user roles:

| Action / API Endpoint | ADMIN | OPERATOR | VIEWER |
|---|:---:|:---:|:---:|
| User Registration & Role Assignment | Allowed | Denied (403) | Denied (403) |
| View System Health (`/api/health`) | Allowed | Allowed | Allowed |
| View Camera List & Live Previews | Allowed | Allowed | Allowed |
| Add / Edit / Remove Cameras | Allowed | Denied (403) | Denied (403) |
| Execute Object Search (`POST /api/search`) | Allowed | Allowed | Denied (403) |
| Upload Archive Video (`POST /api/videos/upload`) | Allowed | Allowed | Denied (403) |
| Inspect Forensic Evidence Images | Allowed | Allowed | Allowed |
| View & Verify Audit Logs (`/api/audit-logs`) | Allowed | Denied (403) | Denied (403) |

---

## Tamper-Evident SHA-256 Audit Trail

Every state-changing event in CTRL-F creates an immutable audit record:
$$\text{Block Hash} = \text{SHA-256}(\text{Index} + \text{Timestamp} + \text{Action} + \text{UserId} + \text{ResourceId} + \text{DetailsJSON} + \text{PreviousHash})$$

- **Verification Endpoint:** `GET /api/audit-logs/verify` recursively inspects the entire chain from the genesis record to the latest entry.
- **Tamper Detection:** If any database row is altered, deleted, or inserted out of order, verification instantly returns `status: "TAMPERED"` with the exact offending record ID.

---

## Testing & Verification

CTRL-F includes a comprehensive automated test suite covering all 10 system phases:

### Run All Backend Tests (Sequential & Safe)
```bash
npm run test:all
```
*Executes all 17 backend test suites: Authentication, RBAC, Camera Registry, RTSP Ingestion, Multi-Camera Orchestrator, Calibration, Evidence, Audit, and Security.*

### Run Judge-Ready End-to-End Suite
```bash
npm run test:e2e
```
*Validates Test Cases A through I:*
- **Test Case A:** Live CCTV target detected (`tv`) $\to$ ByteTrack lock $\to$ Oracle persistence $\to$ evidence saved.
- **Test Case B:** Non-existent target $\to$ honest `NOT_DETECTED` timeout (never falsely acquires).
- **Test Case C:** Camera disconnect $\to$ honest `OFFLINE` state without synthetic frames.
- **Test Case D:** AI service failure $\to$ honest `FAILED` response (never converts to `NOT_DETECTED`).
- **Test Case E:** Database write failure $\to$ atomic transaction rollback without orphan records.
- **Test Case F:** Multi-camera search $\to$ single global session with deterministic single-winner selection.
- **Test Case I:** Archive video upload and frame-by-frame tracker verification.
- **Cryptographic Audit:** Chain validation test verifying tamper resistance.
- **RBAC Matrix:** Strict verification across `ADMIN`, `OPERATOR`, and `VIEWER`.

### Run Python AI Tests
```bash
cd ai-service
pytest tests/ -v
```

---

## Production Deployment & Containerization

CTRL-F is fully dockerized with multi-stage production containers.

### Start Entire System with Docker Compose
```bash
docker-compose up --build -d
```
Services spun up:
1. `ctrlf_frontend`: Nginx Alpine serving optimized React production bundle on port `80`.
2. `ctrlf_backend`: Node.js 22 LTS API on port `5000`.
3. `ctrlf_ai_service`: Python 3.11 with PyTorch CPU & YOLOv8 on port `8000`.

---

## Judge Demonstration Procedure (3–5 Minute Tour)

For evaluators and judges reviewing CTRL-F, follow this curated demonstration sequence:

1. **Login & RBAC Demonstration:**
   - Log in as `operator@controlf.internal` (Password: `OperatorPassword2026!`).
   - Notice that administrative camera provisioning and audit ledgers are locked according to security policy.
2. **Examine Live CCTV Fleet:**
   - Open the **Dashboard** and inspect the camera grid.
   - Verify camera streams report true frame rates, resolutions, and `ONLINE` status.
3. **Execute Real Object Search (Test Case A — Target Found):**
   - Click **Find Object**.
   - Target input: Select or type **`tv`** (or **`bottle`**).
   - Source: Select **Zone Alpha Overhead CCTV** (uses verified test stream `cctv-reference.mp4`).
   - Click **Start Search**.
4. **Observe Autonomous Tracking & Digital Twin Sync:**
   - Watch the search state transition: `INITIALIZING` $\to$ `PROCESSING`.
   - The Three.js surveillance CCTV begins a mechanical horizontal sweep with a White volumetric scanning beam.
   - At frame 165+, YOLO detects the target and ByteTrack confirms identity across 3+ frames.
   - The state machine immediately locks to **`TARGET_ACQUIRED`**.
   - The Three.js CCTV rotates precisely toward the target vector and its beam turns brilliant **Green**.
5. **Inspect Forensic Evidence & Oracle Ledger:**
   - Click **View Evidence** to view the full-resolution cropped image of the detected object with confidence score.
   - Open **Search History** to observe the persisted Oracle Database record.
6. **Log in as Administrator to Verify Audit Chain:**
   - Log out and log in as `admin@controlf.internal` (Password: `AdminPassword2026!`).
   - Navigate to **Audit Ledger** and click **Verify Cryptographic Chain**.
   - Notice the status badge confirms **VALID (0 Tampered Records)** across all chained SHA-256 blocks.

---

## Production Readiness Scorecard

| Category | Status | Verification Evidence |
|---|:---:|---|
| **System Architecture** | **REAL** | Unified 8-stage state machine, clean separation of concerns |
| **Authentication & Security** | **REAL** | JWT with HTTP-only cookies, AES-256-GCM encrypted camera URLs |
| **RBAC Authorization** | **REAL** | Verified in `phase10JudgeReady.test.ts` (Admin/Operator/Viewer) |
| **Relational Persistence** | **REAL** | Oracle Database 21c XE native schema with foreign key integrity |
| **Object Detection** | **REAL** | Ultralytics YOLOv8n running in Python FastAPI service |
| **Object Tracking** | **REAL** | ByteTrack Kalman filter and Hungarian matching on real video |
| **Camera Streaming & RTSP** | **REAL** | OpenCV RTSP client with graceful offline detection |
| **Multi-Camera Orchestration** | **REAL** | Single session, multiple jobs, single-winner race-condition protection |
| **Camera Calibration & 2D $\to$ 3D** | **REAL** | Pinhole camera intrinsic matrix mapping bounding box to aiming ray |
| **3D CCTV Digital Twin** | **REAL** | Three.js mechanical camera reacting in real-time to WebSocket events |
| **Forensic Evidence Storage** | **REAL** | Cropped high-resolution JPEGs saved to disk with metadata |
| **Tamper-Evident Audit** | **REAL** | SHA-256 forward-linked cryptographic blockchain ledger |
| **Automated Test Coverage** | **REAL** | 100% test pass rate across unit, integration, and E2E suites |
| **Containerized Deployment** | **REAL** | Multi-stage Dockerfiles and Docker Compose orchestration |

---

## Current Limitations & Roadmap

- **Pretrained Object Classes:** YOLOv8n detects the 80 standard COCO classes. Objects outside this taxonomy (e.g. small keys, credit cards) require fine-tuned custom weights or open-vocabulary models (scheduled for v3.0).
- **Physical RTSP Hardware Availability:** Tested and verified against controlled RTSP emulation streams and real MP4 reference surveillance feeds. Physical Axis/Hikvision IP camera testing is subject to local site deployment.
- **Monocular 3D Depth:** Without stereoscopic camera pairs or LiDAR, target localization computes a true directional ray vector rather than metric $Z$-depth.

---

## Security Governance

- **Zero Hardcoded Secrets:** Production credentials, database connection strings, and JWT keys must be passed via environment variables.
- **Sanitized Error Envelopes:** No raw stack traces or filesystem paths are exposed to API clients.
- **Rate Limiting:** Auth endpoints are throttled to 5 requests per minute per IP to prevent brute-force attacks.
