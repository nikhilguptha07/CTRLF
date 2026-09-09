-- ============================================================================
-- Seed Data Script
-- System: CONTROL F — AI Object Detection & Recovery System
-- Database: Oracle Database 21c XE
-- Target Schema: CONTROLF_APP
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK;

-- 1. Insert Test Operator User
-- BCrypt digest for sample password 'DevOperator2026!' (Cost factor 12)
INSERT INTO APP_USERS (
    USER_ID, FULL_NAME, EMAIL, PASSWORD_HASH, ROLE, STATUS, LAST_LOGIN_AT
) VALUES (
    1,
    'Surveillance Investigator',
    'operator@controlf.internal',
    '$2a$12$K1rO2r3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r.',
    'ADMIN',
    'ACTIVE',
    SYSTIMESTAMP
);

-- 2. Insert Active Session
INSERT INTO USER_SESSIONS (
    SESSION_ID, USER_ID, REFRESH_TOKEN_HASH, EXPIRES_AT, IP_ADDRESS, USER_AGENT
) VALUES (
    1,
    1,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    SYSTIMESTAMP + INTERVAL '7' DAY,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ControlF-Client/1.0'
);

-- 3. Insert 2 Sample CCTV Cameras (Encrypted Credentials)
INSERT INTO CAMERAS (
    CAMERA_ID, USER_ID, CAMERA_NAME, LOCATION_NAME, STREAM_URL,
    ENCRYPTED_USERNAME, ENCRYPTED_PASSWORD, STATUS, LAST_CONNECTED_AT
) VALUES (
    1,
    1,
    'Main Lobby Cam 01',
    'Headquarters Ground Floor Entrance',
    'rtsp://192.168.1.101:554/live/ch0',
    '7a4f91b2c3d4e5f6', -- AES-256-GCM sample ciphertext
    '8b5a02c3d4e5f6a7',
    'ONLINE',
    SYSTIMESTAMP - INTERVAL '5' MINUTE
);

INSERT INTO CAMERAS (
    CAMERA_ID, USER_ID, CAMERA_NAME, LOCATION_NAME, STREAM_URL,
    ENCRYPTED_USERNAME, ENCRYPTED_PASSWORD, STATUS, LAST_CONNECTED_AT
) VALUES (
    2,
    1,
    'Loading Dock Cam 04',
    'Warehouse Logistics Bay 3',
    'rtsp://192.168.1.104:554/live/ch0',
    '1c2d3e4f5a6b7c8d',
    '9e8d7c6b5a4f3e2d',
    'ONLINE',
    SYSTIMESTAMP - INTERVAL '12' MINUTE
);

-- 4. Insert 2 Sample Uploaded Video Files
INSERT INTO VIDEO_FILES (
    VIDEO_ID, USER_ID, ORIGINAL_FILENAME, STORED_FILENAME, FILE_PATH,
    MIME_TYPE, FILE_SIZE, DURATION_SECONDS, WIDTH, HEIGHT, FPS, STATUS
) VALUES (
    1,
    1,
    'parking_lot_incident_20260904.mp4',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
    'uploads/videos/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
    'video/mp4',
    42859210,
    124.50,
    1920,
    1080,
    30.00,
    'READY'
);

INSERT INTO VIDEO_FILES (
    VIDEO_ID, USER_ID, ORIGINAL_FILENAME, STORED_FILENAME, FILE_PATH,
    MIME_TYPE, FILE_SIZE, DURATION_SECONDS, WIDTH, HEIGHT, FPS, STATUS
) VALUES (
    2,
    1,
    'cafeteria_afternoon_clip.mp4',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901.mp4',
    'uploads/videos/b2c3d4e5-f6a7-8901-bcde-f12345678901.mp4',
    'video/mp4',
    28410984,
    88.20,
    1920,
    1080,
    25.00,
    'READY'
);

-- 5. Insert Sample Object Queries
INSERT INTO OBJECT_QUERIES (
    QUERY_ID, USER_ID, OBJECT_NAME, OBJECT_DESCRIPTION
) VALUES (
    1,
    1,
    'House Keys',
    'Silver brass house keys attached to a red woven lanyard'
);

INSERT INTO OBJECT_QUERIES (
    QUERY_ID, USER_ID, OBJECT_NAME, OBJECT_DESCRIPTION
) VALUES (
    2,
    1,
    'Black Backpack',
    'Matte black nylon SwissGear laptop backpack with reflective strip'
);

INSERT INTO OBJECT_QUERIES (
    QUERY_ID, USER_ID, OBJECT_NAME, OBJECT_DESCRIPTION
) VALUES (
    3,
    1,
    'Water Bottle',
    'Metallic cyan insulated thermos flask with black lid'
);

-- 6. Insert 3 Search Sessions (1 DETECTED, 1 NOT_DETECTED, 1 ANALYZING in-progress)

-- Session 1: DETECTED on Video 1
INSERT INTO SEARCH_SESSIONS (
    SEARCH_ID, USER_ID, QUERY_ID, SOURCE_TYPE, VIDEO_ID, CAMERA_ID,
    STATUS, PROGRESS_PERCENT, STARTED_AT, COMPLETED_AT
) VALUES (
    1,
    1,
    1,
    'VIDEO',
    1,
    NULL,
    'DETECTED',
    100,
    SYSTIMESTAMP - INTERVAL '45' MINUTE,
    SYSTIMESTAMP - INTERVAL '44' MINUTE
);

-- Session 2: NOT_DETECTED on Video 2
INSERT INTO SEARCH_SESSIONS (
    SEARCH_ID, USER_ID, QUERY_ID, SOURCE_TYPE, VIDEO_ID, CAMERA_ID,
    STATUS, PROGRESS_PERCENT, STARTED_AT, COMPLETED_AT
) VALUES (
    2,
    1,
    2,
    'VIDEO',
    2,
    NULL,
    'NOT_DETECTED',
    100,
    SYSTIMESTAMP - INTERVAL '30' MINUTE,
    SYSTIMESTAMP - INTERVAL '29' MINUTE
);

-- Session 3: ANALYZING on Camera 1 (In-progress)
INSERT INTO SEARCH_SESSIONS (
    SEARCH_ID, USER_ID, QUERY_ID, SOURCE_TYPE, VIDEO_ID, CAMERA_ID,
    STATUS, PROGRESS_PERCENT, STARTED_AT, COMPLETED_AT
) VALUES (
    3,
    1,
    3,
    'CAMERA',
    NULL,
    1,
    'ANALYZING',
    55,
    SYSTIMESTAMP - INTERVAL '2' MINUTE,
    NULL
);

-- 7. Insert Search Events for Telemetry History
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (1, 'INITIALIZING', 'Initialized video reader and loaded vision model.', 10);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (1, 'EXTRACTING_FRAMES', 'Extracted 120 keyframes at 1 frame per second.', 35);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (1, 'ANALYZING', 'Analyzing visual feature embeddings against target query.', 65);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (1, 'VERIFYING', 'Temporal consistency check passed with 94.2% confidence.', 90);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (1, 'DETECTED', 'Target object recovered successfully at offset 00:01:14.', 100);

INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (2, 'INITIALIZING', 'Initialized video reader.', 10);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (2, 'ANALYZING', 'Scanned all frames. No candidate exceeded confidence threshold.', 85);
INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
VALUES (2, 'NOT_DETECTED', 'Search completed. Target object not detected in footage.', 100);

-- 8. Insert Detection Result for Session 1 (Positive Detection Evidence)
INSERT INTO DETECTION_RESULTS (
    DETECTION_ID, SEARCH_ID, OBJECT_NAME, CONFIDENCE_SCORE, VIDEO_ID, CAMERA_ID,
    FRAME_NUMBER, FRAME_TIMESTAMP_MS, BOUNDING_BOX_X, BOUNDING_BOX_Y,
    BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT, IMAGE_PATH, VERIFIED
) VALUES (
    1,
    1,
    'House Keys',
    0.9420,
    1,
    NULL,
    74,
    74000,
    0.3420,
    0.6120,
    0.0840,
    0.1150,
    'uploads/evidence/search_1_frame_74.jpg',
    1
);

-- 9. Insert Detection Frames
INSERT INTO DETECTION_FRAMES (
    FRAME_ID, SEARCH_ID, FRAME_NUMBER, FRAME_TIMESTAMP_MS, IMAGE_PATH, ANALYSIS_STATUS
) VALUES (
    1, 1, 74, 74000, 'uploads/evidence/search_1_frame_74.jpg', 'MATCH_FOUND'
);
INSERT INTO DETECTION_FRAMES (
    FRAME_ID, SEARCH_ID, FRAME_NUMBER, FRAME_TIMESTAMP_MS, IMAGE_PATH, ANALYSIS_STATUS
) VALUES (
    2, 2, 30, 30000, 'uploads/evidence/search_2_frame_30.jpg', 'PROCESSED'
);

-- 10. Insert Audit Logs
INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
VALUES (1, 'USER_LOGIN', 'USER', '1', JSON_OBJECT('ip' VALUE '127.0.0.1', 'auth' VALUE 'PASSWORD'));

INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
VALUES (1, 'SEARCH_INITIATED', 'SEARCH_SESSION', '1', JSON_OBJECT('query' VALUE 'House Keys', 'source' VALUE 'VIDEO'));

INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
VALUES (1, 'DETECTION_FOUND', 'DETECTION_RESULT', '1', JSON_OBJECT('confidence' VALUE 0.942, 'frame' VALUE 74));

COMMIT;

PROMPT Seed data inserted successfully.
