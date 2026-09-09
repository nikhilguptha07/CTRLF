-- ============================================================================
-- Migration 013: Add Real Object Color Detection & Search Targets Support
-- System: CONTROL F — AI Object Detection & Recovery System
-- Database: Oracle Database 21c XE
-- Phase 11: Real Object + Color Detection & Search
-- ============================================================================

-- 1. Extend DETECTION_RESULTS with real color features
ALTER TABLE DETECTION_RESULTS ADD (
    DOMINANT_COLOR          VARCHAR2(30),
    COLOR_CONFIDENCE        NUMBER(5, 4),
    SECONDARY_COLORS_JSON   VARCHAR2(500)
);

COMMENT ON COLUMN DETECTION_RESULTS.DOMINANT_COLOR IS 'Dominant classified object color (e.g. RED, BLUE, WHITE, BLACK).';
COMMENT ON COLUMN DETECTION_RESULTS.COLOR_CONFIDENCE IS 'Real pixel evidence confidence ratio from 0.0000 to 1.0000.';
COMMENT ON COLUMN DETECTION_RESULTS.SECONDARY_COLORS_JSON IS 'JSON array of secondary co-dominant or detected colors.';

-- 2. Create SEARCH_TARGETS table for structured object + color target queries
CREATE TABLE SEARCH_TARGETS (
    TARGET_ID           VARCHAR2(64) NOT NULL,
    SEARCH_ID           VARCHAR2(64) NOT NULL,
    TARGET_TEXT         VARCHAR2(200) NOT NULL,
    TARGET_CLASS        VARCHAR2(100),
    TARGET_COLOR        VARCHAR2(30),
    NORMALIZED_TARGET   VARCHAR2(200) NOT NULL,
    CREATED_AT          TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    -- Constraints
    CONSTRAINT PK_SEARCH_TARGETS PRIMARY KEY (TARGET_ID),
    CONSTRAINT FK_SEARCH_TARGETS_SEARCH FOREIGN KEY (SEARCH_ID)
        REFERENCES SEARCH_SESSIONS (ID) ON DELETE CASCADE
);

COMMENT ON TABLE SEARCH_TARGETS IS 'Parsed and normalized search targets with optional color criteria.';
COMMENT ON COLUMN SEARCH_TARGETS.TARGET_TEXT IS 'Raw search input text entered by user or system.';
COMMENT ON COLUMN SEARCH_TARGETS.TARGET_CLASS IS 'Target object class (e.g. bottle, laptop), null for color-only search.';
COMMENT ON COLUMN SEARCH_TARGETS.TARGET_COLOR IS 'Target color filter (e.g. RED, BLUE), null if any color matches.';
COMMENT ON COLUMN SEARCH_TARGETS.NORMALIZED_TARGET IS 'Canonical normalized target string.';

-- 3. Performance indexes for color filtering & search matching
CREATE INDEX IDX_DETECTION_DOMINANT_COLOR
    ON DETECTION_RESULTS (DOMINANT_COLOR);

CREATE INDEX IDX_SEARCH_TARGETS_SEARCH_ID
    ON SEARCH_TARGETS (SEARCH_ID);

CREATE INDEX IDX_SEARCH_TARGETS_CLASS_COLOR
    ON SEARCH_TARGETS (TARGET_CLASS, TARGET_COLOR);
