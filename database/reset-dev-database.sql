-- ============================================================================
-- Development Database Reset Script
-- System: CONTROL F — AI Object Detection & Recovery System
-- Database: Oracle Database 21c XE
-- WARNING: FOR LOCAL DEVELOPMENT USE ONLY. DO NOT EXECUTE IN PRODUCTION.
-- ============================================================================

WHENEVER SQLERROR CONTINUE;

PROMPT ========================================================================
PROMPT Initiating CONTROL F Development Schema Teardown...
PROMPT ========================================================================

-- 1. Drop Views
DROP VIEW V_USER_SEARCH_HISTORY;
DROP VIEW V_RECENT_DETECTIONS;
DROP VIEW V_CAMERA_HEALTH;
DROP VIEW V_SEARCH_SUMMARY;

-- 2. Drop Stored Procedures
DROP PROCEDURE CREATE_SEARCH_SESSION;
DROP PROCEDURE COMPLETE_SEARCH_SESSION;
DROP PROCEDURE RECORD_DETECTION;

-- 3. Drop Tables with Cascade Constraints in Reverse Dependency Order
DROP TABLE AUDIT_LOGS CASCADE CONSTRAINTS PURGE;
DROP TABLE DETECTION_RESULTS CASCADE CONSTRAINTS PURGE;
DROP TABLE DETECTION_FRAMES CASCADE CONSTRAINTS PURGE;
DROP TABLE SEARCH_EVENTS CASCADE CONSTRAINTS PURGE;
DROP TABLE SEARCH_SESSIONS CASCADE CONSTRAINTS PURGE;
DROP TABLE OBJECT_QUERIES CASCADE CONSTRAINTS PURGE;
DROP TABLE VIDEO_FILES CASCADE CONSTRAINTS PURGE;
DROP TABLE CAMERAS CASCADE CONSTRAINTS PURGE;
DROP TABLE USER_SESSIONS CASCADE CONSTRAINTS PURGE;
DROP TABLE APP_USERS CASCADE CONSTRAINTS PURGE;

WHENEVER SQLERROR EXIT FAILURE ROLLBACK;

PROMPT ========================================================================
PROMPT Schema successfully cleared. Re-applying migrations...
PROMPT ========================================================================

@@migrations/001_create_users.sql
@@migrations/002_create_sessions.sql
@@migrations/003_create_cameras.sql
@@migrations/004_create_videos.sql
@@migrations/005_create_queries.sql
@@migrations/006_create_search_sessions.sql
@@migrations/007_create_events.sql
@@migrations/008_create_detections.sql
@@migrations/009_create_audit.sql
@@migrations/010_create_indexes.sql
@@migrations/011_create_views.sql
@@migrations/012_create_procedures.sql
@@seed-data.sql

PROMPT ========================================================================
PROMPT Development database reset, migration, and seed completed successfully!
PROMPT ========================================================================
