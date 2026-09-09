-- ====================================================================
-- CONTROL F — AI Object Detection & Recovery System
-- Oracle Database 21c XE DDL Schema & Initialization Script
-- Service Name: XEPDB1
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE USERS (
    id VARCHAR2(36) PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password_hash VARCHAR2(255) NOT NULL,
    full_name VARCHAR2(100) NOT NULL,
    role VARCHAR2(20) DEFAULT 'OPERATOR' CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
    refresh_token_hash VARCHAR2(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON USERS(email);

-- 2. CAMERAS TABLE (Surveillance CCTV feeds)
CREATE TABLE CAMERAS (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(100) NOT NULL,
    location VARCHAR2(150) NOT NULL,
    rtsp_url_encrypted VARCHAR2(1000) NOT NULL,
    status VARCHAR2(20) DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'ACTIVE_SEARCH', 'ERROR')),
    last_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_cameras_user FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

CREATE INDEX idx_cameras_user_id ON CAMERAS(user_id);
CREATE INDEX idx_cameras_status ON CAMERAS(status);

-- 3. VIDEO_FILES TABLE (Uploaded video archives)
CREATE TABLE VIDEO_FILES (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    original_filename VARCHAR2(255) NOT NULL,
    storage_path VARCHAR2(500) NOT NULL,
    mime_type VARCHAR2(100) NOT NULL,
    file_size_bytes NUMBER NOT NULL,
    duration_seconds NUMBER,
    frame_rate NUMBER,
    resolution VARCHAR2(50),
    status VARCHAR2(20) DEFAULT 'READY' CHECK (status IN ('UPLOADING', 'PROCESSING', 'READY', 'ERROR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_videos_user FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

CREATE INDEX idx_videos_user_id ON VIDEO_FILES(user_id);
CREATE INDEX idx_videos_status ON VIDEO_FILES(status);

-- Backward compatibility synonym/view for VIDEOS
CREATE OR REPLACE VIEW VIDEOS AS SELECT * FROM VIDEO_FILES;

-- 4. SEARCH_SESSIONS TABLE (Core AI search operations)
CREATE TABLE SEARCH_SESSIONS (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    object_name VARCHAR2(100) NOT NULL,
    description VARCHAR2(500),
    source_type VARCHAR2(20) NOT NULL CHECK (source_type IN ('VIDEO', 'CAMERA')),
    source_id VARCHAR2(36) NOT NULL,
    status VARCHAR2(30) DEFAULT 'QUEUED' CHECK (
        status IN (
            'QUEUED',
            'INITIALIZING',
            'EXTRACTING_FRAMES',
            'ANALYZING',
            'TRACKING',
            'VERIFYING',
            'TARGET_ACQUIRED',
            'DETECTED',
            'NOT_DETECTED',
            'FAILED',
            'CANCELLED'
        )
    ),
    progress_percent NUMBER(5,2) DEFAULT 0 NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message VARCHAR2(1000),
    CONSTRAINT fk_searches_user FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

CREATE INDEX idx_searches_user_id ON SEARCH_SESSIONS(user_id);
CREATE INDEX idx_searches_status ON SEARCH_SESSIONS(status);
CREATE INDEX idx_searches_started ON SEARCH_SESSIONS(started_at);

-- 5. DETECTIONS TABLE (Optical lock evidence)
CREATE TABLE DETECTIONS (
    id VARCHAR2(36) PRIMARY KEY,
    search_id VARCHAR2(36) NOT NULL,
    found NUMBER(1) NOT NULL CHECK (found IN (0, 1)),
    confidence NUMBER(5,2) NOT NULL,
    detected_label VARCHAR2(100) NOT NULL,
    frame_timestamp_ms NUMBER,
    evidence_frame_path VARCHAR2(500),
    bounding_box_json CLOB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_detections_search FOREIGN KEY (search_id) REFERENCES SEARCH_SESSIONS(id) ON DELETE CASCADE
);

CREATE INDEX idx_detections_search_id ON DETECTIONS(search_id);

-- Backward compatibility view
CREATE OR REPLACE VIEW DETECTION_RESULTS AS SELECT * FROM DETECTIONS;

-- 6. OBJECT_TRACKS TABLE (ByteTrack persistent sequential trajectories)
CREATE TABLE OBJECT_TRACKS (
    id VARCHAR2(36) PRIMARY KEY,
    search_id VARCHAR2(36) NOT NULL,
    track_id NUMBER NOT NULL,
    class_name VARCHAR2(100) NOT NULL,
    confidence NUMBER(5,2) NOT NULL,
    frame_index NUMBER NOT NULL,
    timestamp_ms NUMBER NOT NULL,
    bbox_x NUMBER(8,2) NOT NULL,
    bbox_y NUMBER(8,2) NOT NULL,
    bbox_width NUMBER(8,2) NOT NULL,
    bbox_height NUMBER(8,2) NOT NULL,
    status VARCHAR2(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOST', 'CONFIRMED')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_tracks_search FOREIGN KEY (search_id) REFERENCES SEARCH_SESSIONS(id) ON DELETE CASCADE
);

CREATE INDEX idx_tracks_search_id ON OBJECT_TRACKS(search_id);
CREATE INDEX idx_tracks_track_id ON OBJECT_TRACKS(track_id);

-- 7. SEARCH_RESULTS TABLE (Final search outcome summary)
CREATE TABLE SEARCH_RESULTS (
    id VARCHAR2(36) PRIMARY KEY,
    search_id VARCHAR2(36) NOT NULL UNIQUE,
    target_name VARCHAR2(100) NOT NULL,
    target_found NUMBER(1) NOT NULL CHECK (target_found IN (0, 1)),
    final_confidence NUMBER(5,2) NOT NULL,
    detection_id VARCHAR2(36),
    matched_track_id NUMBER,
    summary_notes VARCHAR2(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_results_search FOREIGN KEY (search_id) REFERENCES SEARCH_SESSIONS(id) ON DELETE CASCADE
);

CREATE INDEX idx_results_search_id ON SEARCH_RESULTS(search_id);

-- 8. CAMERA_EVENTS TABLE (Timeline telemetry for WebSocket progress & audit replay)
CREATE TABLE CAMERA_EVENTS (
    id VARCHAR2(36) PRIMARY KEY,
    search_id VARCHAR2(36) NOT NULL,
    stage VARCHAR2(50) NOT NULL,
    progress NUMBER(5,2) NOT NULL,
    message VARCHAR2(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_events_search FOREIGN KEY (search_id) REFERENCES SEARCH_SESSIONS(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_search_id ON CAMERA_EVENTS(search_id);

-- Backward compatibility view
CREATE OR REPLACE VIEW SEARCH_EVENTS AS SELECT * FROM CAMERA_EVENTS;

-- 9. AUDIT_LOGS TABLE (Security and access ledger)
CREATE TABLE AUDIT_LOGS (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36),
    action VARCHAR2(100) NOT NULL,
    resource_type VARCHAR2(50) NOT NULL,
    resource_id VARCHAR2(36),
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(255),
    status VARCHAR2(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE')),
    details_json CLOB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_user_id ON AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_action ON AUDIT_LOGS(action);
CREATE INDEX idx_audit_created ON AUDIT_LOGS(created_at);

COMMIT;
