-- CONTROL F Oracle Database 21c XE Migration 004
-- Production Hardening, Security, User Lockouts, and Tamper-Evident Audit Hash Chain

-- 1. Extend USERS table with security and brute-force lockout controls
ALTER TABLE USERS ADD (
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    failed_login_attempts NUMBER(3) DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE NULL
);

-- 2. Extend AUDIT_LOGS table with cryptographic hash chain and correlation request IDs
ALTER TABLE AUDIT_LOGS ADD (
    request_id VARCHAR2(64) NULL,
    previous_hash VARCHAR2(64) NULL,
    current_hash VARCHAR2(64) NULL
);

-- 3. Create high-performance indexes for production security and query patterns
CREATE INDEX idx_audit_logs_hash ON AUDIT_LOGS(current_hash);
CREATE INDEX idx_audit_request_id ON AUDIT_LOGS(request_id);
CREATE INDEX idx_users_locked_until ON USERS(locked_until);
CREATE INDEX idx_detections_search_created ON DETECTIONS(search_id, created_at);
CREATE INDEX idx_search_jobs_composite ON SEARCH_JOBS(session_id, camera_id, job_status);

-- 4. Enforce strict check constraints
ALTER TABLE USERS ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER'));
ALTER TABLE USERS ADD CONSTRAINT chk_users_active CHECK (is_active IN (0, 1));

COMMIT;
