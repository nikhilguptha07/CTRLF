export type CalibrationStatus = 'CALIBRATED' | 'ESTIMATED' | 'UNCALIBRATED';

export type LocalizationMode = 'RAY_ONLY' | 'PLANE_INTERSECTION' | 'DEPTH';

export type DistortionModel = 'NONE' | 'RADIAL_TANGENTIAL' | 'OPENCV_FISHEYE';

export interface CameraIntrinsics {
  imageWidth: number;
  imageHeight: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  distortionModel: DistortionModel;
  distortionCoefficients?: number[];
}

export interface CameraExtrinsics {
  status: 'EXTRINSICS_CALIBRATED' | 'EXTRINSICS_UNCALIBRATED';
  position: [number, number, number];    // Translation T [x, y, z] in world coordinates
  rotationMatrix: [                       // 3x3 Rotation matrix R
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ];
  yawDeg?: number;
  pitchDeg?: number;
  rollDeg?: number;
}

export interface CameraCalibrationRecord {
  id: string;
  cameraId: string;
  imageWidth: number;
  imageHeight: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  distortionModel: DistortionModel;
  distortionCoefficients?: number[];
  calibrationStatus: CalibrationStatus;
  localizationMode: LocalizationMode;
  calibratedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ViewingRay {
  origin: Vector3D;
  direction: Vector3D;
}

export interface ScenePlane {
  name: string;
  normal: Vector3D | [number, number, number];
  pointOnPlane?: Vector3D | [number, number, number];
  constant?: number;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
  };
}

export type PlaneIntersectionStatus = 'INTERSECTED' | 'NO_INTERSECTION' | 'OUT_OF_BOUNDS';

export interface PlaneIntersectionResult {
  status: PlaneIntersectionStatus;
  point?: Vector3D | null;
  distance?: number | null;
  planeName?: string;
}

export interface BoundingBox2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  height?: number;
}

export interface Detection2DInput {
  bbox: BoundingBox2D;
  imageWidth: number;
  imageHeight: number;
  className?: string;
  confidence?: number;
  trackId?: number | string | null;
  frameIndex?: number;
}

export interface VisualizationTarget {
  sessionId?: string;
  cameraId: string;
  trackId: number | string | null;
  className: string;
  confidence: number;
  
  imagePoint: {
    x: number;
    y: number;
  };
  
  normalizedPoint: {
    u: number;
    v: number;
  };
  
  ray: ViewingRay;
  
  desiredAngles: {
    yaw: number;
    pitch: number;
    yawRad: number;
    pitchRad: number;
    yawDeg: number;
    pitchDeg: number;
  };
  
  localizationMode: LocalizationMode;
  calibrationStatus: CalibrationStatus;
  
  // Explicitly null when localizationMode is RAY_ONLY (Technically honest - no fake 3D)
  worldPosition: Vector3D | null;
  worldPoint?: Vector3D; // convenience alias
  planeIntersection?: PlaneIntersectionResult | null;
}

