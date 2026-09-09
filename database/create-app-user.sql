-- ============================================================================
-- CONTROL F — AI Object Detection & Recovery System
-- Database User Provisioning Script
-- Target: Oracle Database 21c XE (PDB: XEPDB1)
-- ============================================================================
-- RUN THIS SCRIPT AS SYSDBA OR SYSTEM
-- Example: sqlplus sys/YourSysPassword@localhost:1521/XEPDB1 as sysdba
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK;

-- 1. Ensure execution context is within the Pluggable Database (XEPDB1)
ALTER SESSION SET CONTAINER = XEPDB1;

-- 2. Optional: Create Dedicated Tablespace for Application Data & Indexes
DECLARE
    v_ts_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_ts_count FROM v$tablespace WHERE name = 'CONTROLF_DATA';
    IF v_ts_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE BIGFILE TABLESPACE CONTROLF_DATA DATAFILE ''controlf_data01.dbf'' SIZE 500M AUTOEXTEND ON NEXT 100M MAXSIZE 10G';
    END IF;
END;
/

-- 3. Create Application User CONTROLF_APP (Principle of Least Privilege)
DECLARE
    v_user_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM all_users WHERE username = 'CONTROLF_APP';
    IF v_user_count > 0 THEN
        EXECUTE IMMEDIATE 'DROP USER CONTROLF_APP CASCADE';
    END IF;
END;
/

CREATE USER CONTROLF_APP IDENTIFIED BY "ControlF_Strong_Pass_2026#"
    DEFAULT TABLESPACE CONTROLF_DATA
    TEMPORARY TABLESPACE TEMP
    QUOTA UNLIMITED ON CONTROLF_DATA
    ACCOUNT UNLOCK;

-- 4. Grant Minimum Required Privileges (Strictly NO DBA)
GRANT CREATE SESSION TO CONTROLF_APP;
GRANT CREATE TABLE TO CONTROLF_APP;
GRANT CREATE VIEW TO CONTROLF_APP;
GRANT CREATE SEQUENCE TO CONTROLF_APP;
GRANT CREATE PROCEDURE TO CONTROLF_APP;
GRANT CREATE TRIGGER TO CONTROLF_APP;
GRANT CREATE TYPE TO CONTROLF_APP;

-- Allow execution of standard utility packages
GRANT EXECUTE ON DBMS_CRYPTO TO CONTROLF_APP;

PROMPT ========================================================================
PROMPT CONTROLF_APP user successfully provisioned on XEPDB1 with least privilege.
PROMPT Connect string: CONTROLF_APP/ControlF_Strong_Pass_2026#@localhost:1521/XEPDB1
PROMPT ========================================================================
