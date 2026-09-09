/**
 * REFERENCE CALIBRATION CONFIGURATION
 * Single Source of Truth for Visual Reverse-Engineering
 * Ground Truth: reference/cctv-reference.mp4
 */

export const referenceCalibration = {
  // Global 3D Perspective Camera
  camera: {
    fov: 38,
    position: [0.0, 0.0, 5.2] as [number, number, number],
    rotation: [0.0, 0.0, 0.0] as [number, number, number],
    near: 0.1,
    far: 100,
  },

  // CCTV Hardware Geometry Proportions
  cctv: {
    position: [0.35, 0.15, 0.0] as [number, number, number],
    rotation: [0.0, 0.0, 0.0] as [number, number, number],
    scale: 1.05,
    body: {
      hoodWidth: 0.52,
      hoodHeight: 0.22,
      hoodLength: 1.36,
      hoodOverhang: 0.24,
      chassisWidth: 0.48,
      chassisHeight: 0.15,
      chassisLength: 1.32,
      rearLouversCount: 5,
      colorWhite: '#e4e6ea',
      colorCharcoal: '#181b22',
      colorMetal: '#8e96a4',
    },
    mount: {
      wallPlateWidth: 0.42,
      wallPlateHeight: 0.54,
      wallPlateDepth: 0.06,
      armLength: 0.55,
      armThickness: 0.09,
      boltRadius: 0.024,
      boltOffset: 0.14,
    },
  },

  // Optical Lens System
  lens: {
    position: [0.0, 0.0, 0.62] as [number, number, number],
    radius: 0.08,
    bezelRadius: 0.12,
    glassColor: '#0a0d14',
    emissiveWhite: '#ffffff',
    emissiveGreen: '#10f070',
    emissiveRed: '#ff2233',
  },

  // Volumetric Scanning Beam Optics (strictly inherits lens transform)
  beam: {
    origin: [0.0, 0.0, 0.64] as [number, number, number],
    apexRadius: 0.075,    // Matches lens radius exactly
    baseRadius: 0.62,     // Narrow, realistic beam cone (NOT a giant projector cone)
    length: 5.6,          // Focused realistic surveillance throw distance
    angle: 0.10,          // Narrow spread
    opacity: 0.35,        // Soft translucent atmospheric cone
    intensity: 1.6,       // Subtle, never blinding or dominating
    falloff: 2.4,         // Smooth exponential edge & distance attenuation
    noise: 0.08,          // Subtle atmospheric shimmer
    colorWhite: '#e2ebf8',
    colorGreen: '#10f070',
    colorRed: '#ff2233',
  },

  // Atmospheric Dust Particles
  particles: {
    count: 120,
    size: 0.03,
    opacity: 0.22,
    speed: 0.10,
    color: '#94a3b8',
    bounds: [-4.0, 4.0, -3.0, 3.0, -2.0, 3.0] as [number, number, number, number, number, number],
  },

  // Studio Lighting (Calibrated for visible environment & crisp camera sculpting)
  lighting: {
    ambientColor: '#222f44',
    ambientIntensity: 1.35,
    keyLight: {
      position: [-2.5, 4.0, 4.2] as [number, number, number],
      color: '#f8fafc',
      intensity: 2.4,
    },
    fillLight: {
      position: [3.4, 2.0, 3.2] as [number, number, number],
      color: '#94a3b8',
      intensity: 1.6,
    },
    bottomBounce: {
      position: [0.0, -2.5, 1.8] as [number, number, number],
      color: '#1e293b',
      intensity: 0.65,
    },
  },

  // Sequence Transitions & Timeline (Ground Truth: 10.00s @ 24fps)
  transitions: {
    scene1Duration: 3.80,
    formSubmitTime: 3.50,
    scene2Start: 3.80,
    beamTurnOnTime: 4.50,
    sweepStartTime: 4.80,
    sweepEndTime: 6.40,
    greenStart: 6.60,
    greenEnd: 7.60,
    redStart: 7.60,
    demoEnd: 10.00,
  },

  // Scene 2 Specifics (Wall Spotlight Sweep) - Positive tilt pitches downward towards floor/wall
  scene2: {
    cctvPosition: [0.35, 0.15, 0.0] as [number, number, number],
    cctvScale: 1.05,
    mountSide: 'right' as const,
    restPan: -0.42,
    restTilt: 0.24,
    sweepPanLeft: -0.44,
    sweepPanRight: -1.85,
    sweepTilt: 0.18,
    wallSpotlight: {
      position: [-2.85, -0.65, -1.6] as [number, number, number],
      scale: 1.25,
      maxOpacity: 0.65,
    },
  },

  // Scene 3 Specifics (Green Monitor Screen Target) - CCTV on left, beam points down-right onto monitor
  scene3: {
    cctvPosition: [-2.35, 0.45, 0.05] as [number, number, number],
    cctvScale: 0.95,
    mountSide: 'left' as const,
    pan: 1.66,
    tilt: 0.16, // Pitched slightly downward to hit monitor face and desk
    monitorPosition: [0.65, -0.05, -0.3] as [number, number, number],
    monitorSize: [3.8, 2.3] as [number, number],
    keysPosition: [-0.15, -0.32, 0.08] as [number, number, number],
    greenColor: '#10f070',
  },

  // Scene 4 Specifics (Red Alarm & Reticle HUD) - CCTV tilted down-left towards viewer
  scene4: {
    cctvPosition: [0.38, 0.08, 0.75] as [number, number, number],
    cctvScale: 1.15,
    mountSide: 'right' as const,
    pan: -0.55,  // Yaw angled to the left
    tilt: 0.32,  // Pitch angled DOWNWARDS towards bottom-left corner
    reticleRadius: 0.46,
    colorWhite: '#ffffff',
    colorAlarmRed: '#ff2233',
    leftText: 'OBJECT NOT DETECTED',
    rightLine1: '360° Scan Complete',
    rightLine2: 'Zero Target Matches',
  },

  // Post Processing
  postProcessing: {
    bloomIntensity: 0.25,
    bloomThreshold: 0.85,
    bloomSmoothing: 0.25,
    vignetteDarkness: 0.35,
    vignetteOffset: 0.48,
  },
};

// Aliased export for compatibility
export const REFERENCE_CALIBRATION = referenceCalibration;
