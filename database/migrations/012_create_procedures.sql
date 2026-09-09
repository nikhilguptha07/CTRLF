-- ============================================================================
-- Migration 012: Create Stored Procedures
-- System: CONTROL F — AI Object Detection & Recovery System
-- Database: Oracle Database 21c XE
-- ============================================================================

-- 1. Atomically Provision an Object Query and Search Session
CREATE OR REPLACE PROCEDURE CREATE_SEARCH_SESSION (
    p_user_id            IN  APP_USERS.USER_ID%TYPE,
    p_object_name        IN  VARCHAR2,
    p_object_description IN  VARCHAR2,
    p_source_type        IN  VARCHAR2,
    p_source_id          IN  NUMBER,
    o_search_id          OUT SEARCH_SESSIONS.SEARCH_ID%TYPE,
    o_query_id           OUT OBJECT_QUERIES.QUERY_ID%TYPE
) AS
    v_video_id  NUMBER := NULL;
    v_camera_id NUMBER := NULL;
BEGIN
    -- Validate Source Exclusivity
    IF UPPER(p_source_type) = 'VIDEO' THEN
        v_video_id := p_source_id;
    ELSIF UPPER(p_source_type) = 'CAMERA' THEN
        v_camera_id := p_source_id;
    ELSE
        RAISE_APPLICATION_ERROR(-20001, 'Invalid SOURCE_TYPE. Must be VIDEO or CAMERA.');
    END IF;

    -- 1. Create target object query record
    INSERT INTO OBJECT_QUERIES (USER_ID, OBJECT_NAME, OBJECT_DESCRIPTION)
    VALUES (p_user_id, p_object_name, p_object_description)
    RETURNING QUERY_ID INTO o_query_id;

    -- 2. Create search session record in QUEUED state
    INSERT INTO SEARCH_SESSIONS (
        USER_ID, QUERY_ID, SOURCE_TYPE, VIDEO_ID, CAMERA_ID, STATUS, PROGRESS_PERCENT
    ) VALUES (
        p_user_id, o_query_id, UPPER(p_source_type), v_video_id, v_camera_id, 'QUEUED', 0
    )
    RETURNING SEARCH_ID INTO o_search_id;

    -- 3. Log initial queued search event
    INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
    VALUES (o_search_id, 'QUEUED', 'Search operation registered and queued for worker dispatch.', 0);

    -- 4. Create immutable audit entry
    INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
    VALUES (
        p_user_id, 
        'SEARCH_INITIATED', 
        'SEARCH_SESSION', 
        TO_CHAR(o_search_id),
        JSON_OBJECT(
            'object' VALUE p_object_name,
            'sourceType' VALUE p_source_type,
            'sourceId' VALUE p_source_id
        )
    );

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END CREATE_SEARCH_SESSION;
/

-- 2. Conclude a Search Session Lifecycle
CREATE OR REPLACE PROCEDURE COMPLETE_SEARCH_SESSION (
    p_search_id     IN SEARCH_SESSIONS.SEARCH_ID%TYPE,
    p_final_status  IN VARCHAR2,
    p_error_message IN VARCHAR2 DEFAULT NULL
) AS
    v_user_id NUMBER;
BEGIN
    -- Fetch session owner for auditing
    SELECT USER_ID INTO v_user_id
    FROM SEARCH_SESSIONS
    WHERE SEARCH_ID = p_search_id;

    -- Update session state to terminal
    UPDATE SEARCH_SESSIONS
    SET STATUS = UPPER(p_final_status),
        PROGRESS_PERCENT = 100,
        COMPLETED_AT = SYSTIMESTAMP,
        ERROR_MESSAGE = p_error_message
    WHERE SEARCH_ID = p_search_id;

    -- Append conclusion event
    INSERT INTO SEARCH_EVENTS (SEARCH_ID, EVENT_TYPE, MESSAGE, PROGRESS_PERCENT)
    VALUES (
        p_search_id, 
        UPPER(p_final_status), 
        NVL(p_error_message, 'Search lifecycle concluded with status: ' || UPPER(p_final_status)), 
        100
    );

    -- Append audit trail
    INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
    VALUES (
        v_user_id, 
        'SEARCH_COMPLETED', 
        'SEARCH_SESSION', 
        TO_CHAR(p_search_id),
        JSON_OBJECT(
            'status' VALUE UPPER(p_final_status),
            'errorMessage' VALUE p_error_message
        )
    );

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END COMPLETE_SEARCH_SESSION;
/

-- 3. Record a Positive AI Visual Object Detection
CREATE OR REPLACE PROCEDURE RECORD_DETECTION (
    p_search_id          IN  SEARCH_SESSIONS.SEARCH_ID%TYPE,
    p_object_name        IN  VARCHAR2,
    p_confidence_score   IN  NUMBER,
    p_frame_number       IN  NUMBER,
    p_frame_timestamp_ms IN  NUMBER,
    p_box_x              IN  NUMBER,
    p_box_y              IN  NUMBER,
    p_box_w              IN  NUMBER,
    p_box_h              IN  NUMBER,
    p_image_path         IN  VARCHAR2,
    p_verified           IN  NUMBER DEFAULT 0,
    o_detection_id       OUT DETECTION_RESULTS.DETECTION_ID%TYPE
) AS
    v_camera_id NUMBER := NULL;
    v_video_id  NUMBER := NULL;
    v_user_id   NUMBER;
BEGIN
    -- Resolve source relation from parent search session
    SELECT USER_ID, CAMERA_ID, VIDEO_ID 
    INTO v_user_id, v_camera_id, v_video_id
    FROM SEARCH_SESSIONS
    WHERE SEARCH_ID = p_search_id;

    -- Insert detection record
    INSERT INTO DETECTION_RESULTS (
        SEARCH_ID, OBJECT_NAME, CONFIDENCE_SCORE, CAMERA_ID, VIDEO_ID,
        FRAME_NUMBER, FRAME_TIMESTAMP_MS, BOUNDING_BOX_X, BOUNDING_BOX_Y,
        BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT, IMAGE_PATH, VERIFIED
    ) VALUES (
        p_search_id, p_object_name, p_confidence_score, v_camera_id, v_video_id,
        p_frame_number, p_frame_timestamp_ms, p_box_x, p_box_y,
        p_box_w, p_box_h, p_image_path, p_verified
    )
    RETURNING DETECTION_ID INTO o_detection_id;

    -- Append audit trail
    INSERT INTO AUDIT_LOGS (USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DETAILS)
    VALUES (
        v_user_id, 
        'DETECTION_RECORDED', 
        'DETECTION_RESULT', 
        TO_CHAR(o_detection_id),
        JSON_OBJECT(
            'searchId' VALUE p_search_id,
            'confidence' VALUE p_confidence_score,
            'frameTimestampMs' VALUE p_frame_timestamp_ms
        )
    );

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END RECORD_DETECTION;
/
