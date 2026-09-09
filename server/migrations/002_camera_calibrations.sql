-- CONTROL F Oracle Database 21c XE Migration 002
-- Phase 7: Camera Calibrations Schema Definition

CREATE TABLE CAMERA_CALIBRATIONS (
    id VARCHAR2(36) PRIMARY KEY,
    camera_id VARCHAR2(36) NOT NULL,
    image_width NUMBER NOT NULL,
    image_height NUMBER NOT NULL,
    fx NUMBER NOT NULL,
    fy NUMBER NOT NULL,
    cx NUMBER NOT NULL,
    cy NUMBER NOT NULL,
    distortion_model VARCHAR2(32) DEFAULT 'NONE',
    distortion_coefficients VARCHAR2(256),
    calibration_status VARCHAR2(32) DEFAULT 'UNCALIBRATED' CHECK (calibration_status IN ('CALIBRATED', 'ESTIMATED', 'UNCALIBRATED')),
    localization_mode VARCHAR2(32) DEFAULT 'RAY_ONLY' CHECK (localization_mode IN ('RAY_ONLY', 'PLANE_INTERSECTION', 'DEPTH')),
    extrinsics_status VARCHAR2(32) DEFAULT 'EXTRINSICS_UNCALIBRATED' CHECK (extrinsics_status IN ('EXTRINSICS_CALIBRATED', 'EXTRINSICS_UNCALIBRATED')),
    rotation_matrix VARCHAR2(512),
    translation_vector VARCHAR2(256),
    calibrated_at TIMESTAMP WITH TIME ZONE,
    version NUMBER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_calibrations_camera FOREIGN KEY (camera_id) REFERENCES CAMERAS(id) ON DELETE CASCADE
);

CREATE INDEX idx_camera_calibrations_camera ON CAMERA_CALIBRATIONS(camera_id);
CREATE INDEX idx_camera_calibrations_status ON CAMERA_CALIBRATIONS(calibration_status);
