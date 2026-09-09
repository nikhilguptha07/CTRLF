# CONTROL F — AI Object Detection & Recovery System Backend API

Production-grade RESTful API and real-time surveillance streaming backend built with **Node.js**, **TypeScript**, **Express**, **Oracle Database 21c XE**, **node-oracledb**, **Socket.IO**, and **FFmpeg**.

---

## 🏗️ Architecture Overview

The backend follows a strict enterprise layered architecture:
```
Client (HTTP/REST / WebSocket)
   ↓
Middleware (Helmet, CORS, RateLimiter, JWT Auth, Zod Validation)
   ↓
Controllers (HTTP Input Parsing, Parameter Sanitization)
   ↓
Services (Business Logic, Vision Providers, Frame Extraction, Auditing)
   ↓
Repositories (Oracle SQL Execution with Bind Variables)
   ↓
Oracle Database 21c XE (Connection Pool)
```

> [!NOTE]
> **Controllers never contain SQL**. All database access is encapsulated inside repositories using Oracle bind variables (`:param`) to prevent SQL injection.

---

## ⚙️ Environment Variables (`.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP and WebSocket server listening port |
| `NODE_ENV` | `development` | Application runtime environment (`development`, `production`, `test`) |
| `API_PREFIX` | `/api` | Root path prefix for all REST endpoints |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS and WebSocket frontend origin |
| `ORACLE_USER` | `controlf_admin` | Oracle XE database username |
| `ORACLE_PASSWORD` | `ControlF2026_SecurePass` | Oracle XE database password |
| `ORACLE_HOST` | `localhost` | Oracle Database server hostname/IP |
| `ORACLE_PORT` | `1521` | Oracle Database listener port |
| `ORACLE_SERVICE_NAME` | `XEPDB1` | Oracle Database pluggable database (PDB) service name |
| `ORACLE_POOL_MIN` | `2` | Minimum pooled database connections |
| `ORACLE_POOL_MAX` | `10` | Maximum pooled database connections |
| `JWT_ACCESS_SECRET` | *32+ char secret* | Secret key for signing 15-minute JWT access tokens |
| `JWT_REFRESH_SECRET` | *32+ char secret* | Secret key for signing 7-day refresh tokens |
| `ENCRYPTION_KEY` | *64-character hex* | 32-byte key for AES-256-GCM RTSP credential encryption |
| `UPLOAD_DIR` | `./uploads` | Local directory for storing video files and evidence frames |
| `MAX_FILE_SIZE_BYTES`| `524288000` | Maximum upload size (500 MB) |

---

## 🗄️ Oracle Database 21c XE Setup Instructions

### 1. Connect as SYSDBA and Create User
Connect using SQL*Plus or Oracle SQL Developer:
```sql
sqlplus sys/YourSysPassword@localhost:1521/XEPDB1 as sysdba
```

Run user creation commands:
```sql
CREATE USER controlf_admin IDENTIFIED BY ControlF2026_SecurePass;
GRANT CONNECT, RESOURCE, DBA TO controlf_admin;
ALTER USER controlf_admin QUOTA UNLIMITED ON USERS;
```

### 2. Initialize Schema DDL
Execute the schema initialization script:
```sql
sqlplus controlf_admin/ControlF2026_SecurePass@localhost:1521/XEPDB1 @scripts/init-oracle-db.sql
```

Tables created:
1. `USERS` — User identity, bcrypt hashes, refresh tokens, role permissions
2. `CAMERAS` — Surveillance CCTV streams with encrypted RTSP credentials
3. `VIDEOS` — Uploaded surveillance footage archives and video metadata
4. `SEARCH_SESSIONS` — Core search operations and 9-stage state machine
5. `DETECTION_RESULTS` — Verified optical lock coordinates and evidence frames
6. `SEARCH_EVENTS` — Step-by-step progress telemetry and audit timestamps
7. `AUDIT_LOGS` — Immutable security ledger tracking all system operations

---

## 📡 REST API Reference

### 1. Authentication
- `POST /api/auth/register` — Register a new operator/admin account
- `POST /api/auth/login` — Authenticate and receive access + refresh tokens
- `POST /api/auth/refresh` — Rotate refresh token and issue new access token
- `POST /api/auth/logout` — Invalidate user session and revoke refresh token
- `GET /api/auth/me` — Retrieve current authenticated user profile

### 2. Cameras (CCTV Management)
- `POST /api/cameras` — Register a CCTV camera (RTSP URL is AES-256-GCM encrypted)
- `GET /api/cameras` — List all registered cameras
- `GET /api/cameras/:cameraId` — Retrieve camera metadata
- `PUT /api/cameras/:cameraId` — Update camera name, location, or parameters
- `DELETE /api/cameras/:cameraId` — Remove camera stream
- `POST /api/cameras/:cameraId/test` — Test network connectivity and ping latency
- `POST /api/cameras/:cameraId/connect` — Initiate live streaming handshake

### 3. Video Archives
- `POST /api/videos/upload` — Upload surveillance footage (`multipart/form-data`, field: `video`)
- `GET /api/videos` — List uploaded footage archives
- `GET /api/videos/:videoId` — Get video metadata (resolution, duration, fps)
- `DELETE /api/videos/:videoId` — Delete video and file storage

### 4. AI Object Search & Recovery
- `POST /api/searches` — Initiate an AI object search
  ```json
  {
    "objectName": "keys",
    "description": "small silver house keys on carabiner",
    "sourceType": "VIDEO",
    "sourceId": "video-uuid-or-id"
  }
  ```
  Returns `202 Accepted`:
  ```json
  {
    "success": true,
    "data": {
      "searchId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "QUEUED"
    },
    "error": null
  }
  ```
- `GET /api/searches/:searchId` — Query search progress and result
- `GET /api/searches/:searchId/events` — Query search stage event telemetry

### 5. Detections & History
- `GET /api/detections/:searchId` — Retrieve detection result and bounding box
- `GET /api/history` — List past search sessions
- `GET /api/history/audit` — Query security audit ledger (Requires `OPERATOR` or `ADMIN`)

---

## ⚡ WebSocket Real-Time Progress Events

Connect to Socket.IO at `ws://localhost:5000`:
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { withCredentials: true });

// Subscribe to search session telemetry
socket.emit("subscribe:search", searchId);

// Listen to progress events
socket.on("search:progress", (data) => {
  console.log(`[${data.stage}] ${data.progress}%: ${data.message}`);
});

// Listen to detection lock
socket.on("search:detection", (detection) => {
  console.log("Object found:", detection.detectedLabel, detection.confidence);
});

// Listen to completion
socket.on("search:complete", (summary) => {
  console.log("Search finished:", summary.stage);
});
```

---

## 🧪 Running Tests & Build

```bash
# Typecheck TypeScript definitions
npm run typecheck

# Run unit and integration test suite
npm test

# Compile production build
npm run build

# Start production server
npm start
```
