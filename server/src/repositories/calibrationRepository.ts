import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import {
  CameraCalibrationRecord,
  CalibrationStatus,
  LocalizationMode,
  DistortionModel,
} from '../types/calibration';

interface CalibrationRow {
  ID: string;
  CAMERA_ID: string;
  IMAGE_WIDTH: number;
  IMAGE_HEIGHT: number;
  FX: number;
  FY: number;
  CX: number;
  CY: number;
  DISTORTION_MODEL?: string;
  DISTORTION_COEFFICIENTS?: string;
  CALIBRATION_STATUS: string;
  LOCALIZATION_MODE: string;
  CALIBRATED_AT?: Date | string | null;
  VERSION: number;
  CREATED_AT: Date | string;
  UPDATED_AT: Date | string;
}

export class CalibrationRepository {
  private mapRowToCalibration(row: CalibrationRow): CameraCalibrationRecord {
    let distortionCoefficients: number[] | undefined;
    if (row.DISTORTION_COEFFICIENTS) {
      try {
        distortionCoefficients = JSON.parse(row.DISTORTION_COEFFICIENTS);
      } catch {
        distortionCoefficients = undefined;
      }
    }

    return {
      id: row.ID,
      cameraId: row.CAMERA_ID,
      imageWidth: Number(row.IMAGE_WIDTH),
      imageHeight: Number(row.IMAGE_HEIGHT),
      fx: Number(row.FX),
      fy: Number(row.FY),
      cx: Number(row.CX),
      cy: Number(row.CY),
      distortionModel: (row.DISTORTION_MODEL as DistortionModel) || 'NONE',
      distortionCoefficients,
      calibrationStatus: row.CALIBRATION_STATUS as CalibrationStatus,
      localizationMode: (row.LOCALIZATION_MODE as LocalizationMode) || 'RAY_ONLY',
      calibratedAt: row.CALIBRATED_AT ? new Date(row.CALIBRATED_AT) : null,
      version: Number(row.VERSION || 1),
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  async findByCameraId(cameraId: string): Promise<CameraCalibrationRecord | null> {
    const sql = `
      SELECT id, camera_id, image_width, image_height, fx, fy, cx, cy,
             distortion_model, distortion_coefficients, calibration_status,
             localization_mode, calibrated_at, version, created_at, updated_at
      FROM CAMERA_CALIBRATIONS
      WHERE camera_id = :cameraId
      ORDER BY version DESC
    `;

    const result = await db.execute<CalibrationRow>(sql, { cameraId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToCalibration(result.rows[0]);
  }

  async upsert(
    record: Omit<CameraCalibrationRecord, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<CameraCalibrationRecord> {
    const existing = await this.findByCameraId(record.cameraId);

    const distJson = record.distortionCoefficients
      ? JSON.stringify(record.distortionCoefficients)
      : null;

    if (existing) {
      const sql = `
        UPDATE CAMERA_CALIBRATIONS
        SET image_width = :imageWidth,
            image_height = :imageHeight,
            fx = :fx,
            fy = :fy,
            cx = :cx,
            cy = :cy,
            distortion_model = :distortionModel,
            distortion_coefficients = :distortionCoefficients,
            calibration_status = :calibrationStatus,
            localization_mode = :localizationMode,
            calibrated_at = :calibratedAt,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE camera_id = :cameraId
      `;

      await db.execute(sql, {
        cameraId: record.cameraId,
        imageWidth: record.imageWidth,
        imageHeight: record.imageHeight,
        fx: record.fx,
        fy: record.fy,
        cx: record.cx,
        cy: record.cy,
        distortionModel: record.distortionModel,
        distortionCoefficients: distJson,
        calibrationStatus: record.calibrationStatus,
        localizationMode: record.localizationMode,
        calibratedAt: record.calibratedAt || null,
      });
    } else {
      const sql = `
        INSERT INTO CAMERA_CALIBRATIONS (
          id, camera_id, image_width, image_height, fx, fy, cx, cy,
          distortion_model, distortion_coefficients, calibration_status,
          localization_mode, calibrated_at, version
        ) VALUES (
          :id, :cameraId, :imageWidth, :imageHeight, :fx, :fy, :cx, :cy,
          :distortionModel, :distortionCoefficients, :calibrationStatus,
          :localizationMode, :calibratedAt, :version
        )
      `;

      await db.execute(sql, {
        id: record.id || uuidv4(),
        cameraId: record.cameraId,
        imageWidth: record.imageWidth,
        imageHeight: record.imageHeight,
        fx: record.fx,
        fy: record.fy,
        cx: record.cx,
        cy: record.cy,
        distortionModel: record.distortionModel,
        distortionCoefficients: distJson,
        calibrationStatus: record.calibrationStatus,
        localizationMode: record.localizationMode,
        calibratedAt: record.calibratedAt || null,
        version: record.version || 1,
      });
    }

    const saved = await this.findByCameraId(record.cameraId);
    if (!saved) {
      throw new Error(`Failed to persist camera calibration for camera: ${record.cameraId}`);
    }
    return saved;
  }
}

export const calibrationRepository = new CalibrationRepository();
