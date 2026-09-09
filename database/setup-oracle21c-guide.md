# Oracle Database 21c Express Edition (Oracle 21c XE) Setup Guide

This guide explains how to configure and run **Oracle Database 21c XE** for the **CONTROL F** Lost Object CCTV Detection system.

---

## 1. Prerequisites & Installation Options

You can run Oracle 21c XE either natively on Windows or in a lightweight Docker container.

### Option A: Docker (Recommended for rapid setup)
Run the official or community Oracle 21c XE container:
```bash
docker run -d \
  --name oracle21c-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PASSWORD=ControlF2026_SecurePass \
  -e ORACLE_DATABASE=XEPDB1 \
  gvenzl/oracle-xe:21-slim
```

### Option B: Native Windows Installation
1. Download **Oracle Database 21c Express Edition for Windows x64** from Oracle Technology Network.
2. Run `setup.exe` as Administrator.
3. Set your administrative password (e.g. `ControlF2026_SecurePass`).
4. Ensure the Windows Services `OracleServiceXE` and `OracleOraDB21Home1TNSListener` are Running.

---

## 2. Database User & Tablespace Setup

Connect using `sqlplus` as `SYSDBA`:
```bash
sqlplus sys/ControlF2026_SecurePass@localhost:1521/XEPDB1 as sysdba
```

Run the following SQL commands to provision the application user and privileges:
```sql
ALTER SESSION SET CONTAINER = XEPDB1;

-- Create Application User
CREATE USER controlf_admin IDENTIFIED BY "ControlF2026_SecurePass"
    DEFAULT TABLESPACE users
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON users;

-- Grant required database privileges
GRANT CREATE SESSION TO controlf_admin;
GRANT CREATE TABLE TO controlf_admin;
GRANT CREATE VIEW TO controlf_admin;
GRANT CREATE SEQUENCE TO controlf_admin;
GRANT CREATE TRIGGER TO controlf_admin;
GRANT CREATE PROCEDURE TO controlf_admin;

EXIT;
```

---

## 3. Run Schema and Seed Scripts

Connect as the application user:
```bash
sqlplus controlf_admin/ControlF2026_SecurePass@localhost:1521/XEPDB1
```

Execute the schema and seed scripts:
```sql
@schema-oracle21c-xe.sql
@seed-oracle21c-xe.sql
EXIT;
```

---

## 4. Backend Environment Configuration

In `backend/.env`, configure the Oracle connection variables:

```env
# Oracle 21c XE Database Configuration
ORACLE_USER=controlf_admin
ORACLE_PASSWORD=ControlF2026_SecurePass
ORACLE_CONNECTION_STRING=localhost:1521/XEPDB1

# Or alternatively via granular parameters:
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=XEPDB1
```

---

## 5. Verifying the Connection

Run the backend health checks:
```bash
curl http://localhost:5000/api/ready
```
Expected response:
```json
{
  "status": "READY",
  "database": "CONNECTED",
  "engine": "Oracle Database 21c Express Edition"
}
```

---

## 6. Seed Credentials

| Role | Username | Email | Password |
|---|---|---|---|
| Administrator | `admin` | `admin@ctrlf.local` | `Password123!` |
| Security Operator | `operator1` | `operator@ctrlf.local` | `Password123!` |
| Standard User | `johndoe` | `user@ctrlf.local` | `Password123!` |
