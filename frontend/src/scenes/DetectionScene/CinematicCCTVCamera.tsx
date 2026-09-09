import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCCTVVolumetricBeamMaterial } from '../../shaders/cctvVolumetricBeam';
import { referenceCalibration } from '../../config/referenceCalibration';

export interface CinematicCCTVCameraProps {
  mountSide?: 'right' | 'left';
  beamColor?: 'white' | 'green' | 'red' | 'off';
  beamIntensity?: number;
  beamProgress?: number;
  panAngle?: number;  // manual yaw override (e.g. for offline timeline demo)
  tiltAngle?: number; // manual pitch override (e.g. for offline timeline demo)
  isScanning?: boolean;
  isAnalysisComplete?: boolean;
  isTargetLocked?: boolean;
  targetYawRad?: number;
  targetPitchRad?: number;
  onRotationProgress?: (deg: number, minRotationSatisfied: boolean, sweepCount: number) => void;
  position?: [number, number, number];
  scale?: number;
  showHologramHUD?: boolean;
}

export const CinematicCCTVCamera: React.FC<CinematicCCTVCameraProps> = ({
  mountSide = 'right',
  beamColor = 'white',
  beamIntensity,
  beamProgress = 1.0,
  panAngle,
  tiltAngle,
  isScanning = false,
  isAnalysisComplete = false,
  isTargetLocked = false,
  targetYawRad,
  targetPitchRad,
  onRotationProgress,
  position = [0.36, 0.12, 0.1],
  scale = 1.0,
  showHologramHUD = true,
}) => {
  const panGroupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const lensApertureRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const statusLedRef = useRef<THREE.MeshStandardMaterial>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const reticleRing1Ref = useRef<THREE.Group>(null);
  const reticleRing2Ref = useRef<THREE.Group>(null);

  // Initial angle: Start on the LEFT (-Math.PI / 2) so the beam turns Left-to-Right across the observer!
  const START_ANGLE = -Math.PI / 2;
  const totalRotationRef = useRef<number>(0.0);
  const minRotationSatisfiedRef = useRef<boolean>(false);
  const lastReportedDegRef = useRef<number>(-1);

  // Reset scan state when entering a new scan session
  useEffect(() => {
    if (isScanning) {
      totalRotationRef.current = 0.0;
      minRotationSatisfiedRef.current = false;
      lastReportedDegRef.current = -1;
      if (panGroupRef.current) {
        panGroupRef.current.rotation.y = START_ANGLE;
      }
      if (tiltGroupRef.current) {
        tiltGroupRef.current.rotation.x = 0.22;
      }
    }
  }, [isScanning]);

  // Active beam & lens color hex
  const colorHex = useMemo(() => {
    switch (beamColor) {
      case 'white': return referenceCalibration.beam.colorWhite;
      case 'green': return referenceCalibration.beam.colorGreen;
      case 'red':   return referenceCalibration.beam.colorRed;
      case 'off':   return '#000000';
      default:      return '#ffffff';
    }
  }, [beamColor]);

  const activeColor = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  // Soft atmospheric volumetric beam material
  const volumetricMaterial = useMemo(() => {
    const core = beamColor === 'white' ? '#ffffff' : beamColor === 'green' ? '#bbf7d0' : '#fecaca';
    const intensity = beamIntensity ?? (beamColor === 'white' 
      ? referenceCalibration.beam.intensity 
      : beamColor === 'green' 
      ? referenceCalibration.beam.intensity * 1.25 
      : referenceCalibration.beam.intensity * 1.35);
    return createCCTVVolumetricBeamMaterial(colorHex, intensity, core);
  }, [colorHex, beamColor, beamIntensity]);

  // Calibrated Volumetric Beam Cone Geometry
  const coneGeometry = useMemo(() => {
    const { apexRadius, baseRadius, length } = referenceCalibration.beam;
    const geo = new THREE.CylinderGeometry(baseRadius, apexRadius, length, 36, 1, true);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, length / 2);
    return geo;
  }, []);

  const isLeft = mountSide === 'left';
  const bracketPlateX = isLeft ? -0.54 : 0.54;

  // Heavy-duty articulated mounting conduit (Authentic hanging loop curve)
  const conduitGeometry = useMemo(() => {
    const dir = isLeft ? -1 : 1;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.06, -0.34),
      new THREE.Vector3(dir * 0.04, -0.24, -0.26),
      new THREE.Vector3(dir * 0.18, -0.24, -0.14),
      new THREE.Vector3(dir * 0.38, -0.18, -0.05),
      new THREE.Vector3(bracketPlateX - dir * 0.02, -0.10, 0),
    ]);
    return new THREE.TubeGeometry(curve, 36, 0.018, 10, false);
  }, [isLeft, bracketPlateX]);

  // Link physical spotlight target along optical axis
  useEffect(() => {
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.target = spotTargetRef.current;
    }
  }, []);

  // Concentric segmented reticle geometry for Scene 4 Red Mode
  const reticleSegments = useMemo(() => {
    const pts1: THREE.Vector3[] = [];
    const pts2: THREE.Vector3[] = [];
    const r1 = 0.38;
    const r2 = 0.54;
    const count = 36;
    for (let i = 0; i < count; i++) {
      if (i % 6 !== 0) { // gaps
        const a1 = (i / count) * Math.PI * 2;
        const a2 = ((i + 0.85) / count) * Math.PI * 2;
        pts1.push(new THREE.Vector3(Math.cos(a1) * r1, Math.sin(a1) * r1, 0));
        pts1.push(new THREE.Vector3(Math.cos(a2) * r1, Math.sin(a2) * r1, 0));
        
        const a3 = ((i + 2) / count) * Math.PI * 2;
        const a4 = ((i + 2.7) / count) * Math.PI * 2;
        pts2.push(new THREE.Vector3(Math.cos(a3) * r2, Math.sin(a3) * r2, 0));
        pts2.push(new THREE.Vector3(Math.cos(a4) * r2, Math.sin(a4) * r2, 0));
      }
    }
    return {
      geo1: new THREE.BufferGeometry().setFromPoints(pts1),
      geo2: new THREE.BufferGeometry().setFromPoints(pts2),
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const clampedDelta = Math.min(delta, 0.05);

    // =========================================================================
    // 1. CCTV ROTATION EXECUTION
    // Requirement:
    // - Minimum rotation is 1 full 360° sweep
    // - Maximum rotation is: keep rotating until AI video analysis completes
    // - Direction: turns from Left to Right for the observer
    // =========================================================================
    if (panAngle !== undefined && tiltAngle !== undefined) {
      // Manual timelineTime override mode (10-second reference demo playback)
      if (panGroupRef.current) panGroupRef.current.rotation.y = panAngle;
      if (tiltGroupRef.current) tiltGroupRef.current.rotation.x = tiltAngle;
    } else if (isScanning) {
      const isMinSatisfied = totalRotationRef.current >= Math.PI * 2;
      const shouldStopScanning = isMinSatisfied && isAnalysisComplete;

      if (!shouldStopScanning) {
        // Rotates with positive angular velocity: sweeps Left -> Front -> Right across the room
        // 1 full 360° sweep every ~4.5 seconds
        const angularVelocity = (Math.PI * 2) / 4.5;
        totalRotationRef.current += angularVelocity * clampedDelta;

        const currentBearingDeg = Math.round(
          ((totalRotationRef.current % (Math.PI * 2)) / (Math.PI * 2)) * 360
        );
        const sweepCount = Math.floor(totalRotationRef.current / (Math.PI * 2)) + 1;
        const isMinSatisfiedNow = totalRotationRef.current >= Math.PI * 2;

        if (isMinSatisfiedNow && !minRotationSatisfiedRef.current) {
          minRotationSatisfiedRef.current = true;
          onRotationProgress?.(360, true, sweepCount);
        } else if (Math.abs(currentBearingDeg - lastReportedDegRef.current) >= 4) {
          lastReportedDegRef.current = currentBearingDeg;
          onRotationProgress?.(currentBearingDeg, isMinSatisfiedNow, sweepCount);
        }
      }

      if (panGroupRef.current) {
        // Left to Right sweep: starts at START_ANGLE (-PI/2) and advances positively
        panGroupRef.current.rotation.y = START_ANGLE + totalRotationRef.current;
      }
      if (tiltGroupRef.current) {
        tiltGroupRef.current.rotation.x = 0.22;
      }
    } else if (isTargetLocked && targetYawRad !== undefined && targetPitchRad !== undefined) {
      // Smoothly pan & tilt toward real last-known target position
      if (panGroupRef.current) {
        panGroupRef.current.rotation.y = THREE.MathUtils.damp(
          panGroupRef.current.rotation.y,
          targetYawRad,
          3.2,
          clampedDelta
        );
      }
      if (tiltGroupRef.current) {
        tiltGroupRef.current.rotation.x = THREE.MathUtils.damp(
          tiltGroupRef.current.rotation.x,
          targetPitchRad,
          3.2,
          clampedDelta
        );
      }
    } else {
      // Stationary at final scan angle
      if (panGroupRef.current && totalRotationRef.current > 0) {
        panGroupRef.current.rotation.y = START_ANGLE + totalRotationRef.current;
      }
    }

    // =========================================================================
    // 2. Optical Shader & Material Uniforms
    // =========================================================================
    if (volumetricMaterial) {
      volumetricMaterial.uniforms.uColor.value.copy(activeColor);
      volumetricMaterial.uniforms.uTime.value = t;
      volumetricMaterial.uniforms.uBeamProgress.value = beamColor === 'off' ? 0 : beamProgress;
    }

    // Physical Status LED emissive pulse
    if (statusLedRef.current) {
      statusLedRef.current.emissive.copy(activeColor);
      statusLedRef.current.emissiveIntensity = beamColor === 'off' ? 0.05 : 2.8 + Math.sin(t * 5.0) * 0.4;
    }

    // Lens optical aperture reflection
    if (lensApertureRef.current) {
      if (beamColor !== 'off') {
        lensApertureRef.current.emissive.copy(activeColor);
        lensApertureRef.current.emissiveIntensity = 1.35;
      } else {
        lensApertureRef.current.emissive.set('#000000');
        lensApertureRef.current.emissiveIntensity = 0;
      }
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.copy(activeColor);
      spotLightRef.current.intensity = beamColor === 'off' ? 0 : 5.5 * beamProgress;
    }

    // Reticle HUD rotation in Scene 4 Red Alarm mode
    if (reticleRing1Ref.current) {
      reticleRing1Ref.current.rotation.z = t * 0.4;
    }
    if (reticleRing2Ref.current) {
      reticleRing2Ref.current.rotation.z = -t * 0.25;
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      
      {/* ====================================================================
          1. CCTV WALL MOUNT (Stationary wall plate, articulated L-arm, bolts)
          ==================================================================== */}
      <group name="CCTVMount">
        {/* Wall Flange Base Plate */}
        <group position={[bracketPlateX, 0, 0]}>
          <mesh position={[isLeft ? -0.025 : 0.025, 0, 0]}>
            <boxGeometry args={[0.05, 0.46, 0.34]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.35} />
          </mesh>

          {/* 4 Corner Mounting Hex Screws */}
          {[
            [-0.17, -0.12],
            [0.17, -0.12],
            [-0.17, 0.12],
            [0.17, 0.12],
          ].map(([y, z], idx) => (
            <mesh
              key={idx}
              position={[isLeft ? -0.052 : 0.052, y, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.016, 0.016, 0.012, 6]} />
              <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
            </mesh>
          ))}

          {/* Conduit gland fitting on wall plate */}
          <mesh
            position={[isLeft ? 0.01 : -0.01, -0.10, 0]}
            rotation={[0, 0, isLeft ? -Math.PI / 2 : Math.PI / 2]}
          >
            <cylinderGeometry args={[0.026, 0.030, 0.025, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>

        {/* Sculpted bracket arm extending horizontally from wall plate to pivot center */}
        <mesh position={[isLeft ? -0.27 : 0.27, -0.04, 0]}>
          <boxGeometry args={[0.52, 0.08, 0.10]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.35} />
        </mesh>

        {/* Lower diagonal support strut for industrial structural realism */}
        <mesh
          position={[isLeft ? -0.30 : 0.30, -0.13, 0]}
          rotation={[0, 0, isLeft ? 0.42 : -0.42]}
        >
          <boxGeometry args={[0.32, 0.05, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.35} />
        </mesh>

        {/* Stationary Knuckle Base Hub */}
        <group position={[0, -0.04, 0]}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.078, 0.082, 0.07, 24]} />
            <meshStandardMaterial color="#64748b" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.026, 0.030, 0.025, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>

        {/* Armored Flexible Electrical Conduit (Looping hanging cable) */}
        <mesh geometry={conduitGeometry}>
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>
      </group>

      {/* ====================================================================
          2. CCTV PAN GROUP (Motorized Swivel Yaw around Y axis)
          ==================================================================== */}
      <group ref={panGroupRef} position={[0, -0.04, 0]}>
        
        {/* Rotating Turntable Ring & Motorized Swivel Joint */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.072, 0.075, 0.06, 28]} />
          <meshStandardMaterial color="#64748b" roughness={0.28} metalness={0.8} />
        </mesh>

        {/* Motorized Knurled Lock Collar */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.076, 0.076, 0.022, 28]} />
          <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Mechanical Clevis Dual Fork Arms */}
        <mesh position={[-0.14, 0.10, 0]}>
          <boxGeometry args={[0.024, 0.12, 0.07]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0.14, 0.10, 0]}>
          <boxGeometry args={[0.024, 0.12, 0.07]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.5} />
        </mesh>

        {/* Outer Clevis Hex Pivot Bolt Caps */}
        <mesh position={[-0.155, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.014, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.25} metalness={0.85} />
        </mesh>
        <mesh position={[0.155, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.014, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* ====================================================================
            3. CCTV TILT GROUP (Motorized Pitch around X axis)
            ==================================================================== */}
        <group ref={tiltGroupRef} position={[0, 0.14, 0]}>
          
          {/* Transverse Tilt Pivot Axle Spindle */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.29, 20]} />
            <meshStandardMaterial color="#475569" roughness={0.25} metalness={0.8} />
          </mesh>

          {/* Underside Mounting Cradle Block & Clamp */}
          <group position={[0, -0.04, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.14, 0.04, 0.18]} />
              <meshStandardMaterial color="#475569" roughness={0.32} metalness={0.6} />
            </mesh>
          </group>

          {/* ==================================================================
              4. CYLINDRICAL CCTV BULLET CAMERA
              ================================================================== */}
          <group name="CylindricalCCTVCamera" position={[0, 0.04, 0]}>
            
            {/* Main Smooth White Cylindrical Barrel */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.172, 0.172, 0.78, 48]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.24} metalness={0.22} />
            </mesh>

            {/* Overhanging Top Curved Visor Canopy */}
            <mesh position={[0, 0.006, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.182, 0.182, 0.84, 48, 1, true, Math.PI * 0.54, Math.PI * 0.92]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.2} side={THREE.DoubleSide} />
            </mesh>

            {/* Top Center Adjustment Knob & Rail */}
            <group position={[0, 0.188, -0.02]}>
              <mesh>
                <boxGeometry args={[0.024, 0.015, 0.10]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
              </mesh>
              <mesh position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.014, 0.014, 0.012, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.25} metalness={0.8} />
              </mesh>
            </group>

            {/* Rear Rounded Dome End Cap */}
            <mesh position={[0, 0, -0.39]} rotation={[-Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.172, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.3} />
            </mesh>

            {/* Rear Waterproof Cable Gland */}
            <mesh position={[0, -0.04, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.028, 0.04, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
            </mesh>

            {/* ================================================================
                5. FULLY OPEN & UNOBSTRUCTED FRONT FACEPLATE & CONCENTRIC LENS
                ================================================================ */}
            <group name="FrontLensFace" position={[0, 0, 0.395]}>
              {/* Fully Open Circular Dark Faceplate */}
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.170, 0.170, 0.014, 48]} />
                <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
              </mesh>

              {/* PROMINENT WHITE / SILVER CONCENTRIC LENS RING */}
              <mesh position={[0, 0, 0.009]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.078, 0.084, 0.010, 40]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.35} />
              </mesh>

              {/* Inner Optical Lens Barrel */}
              <mesh position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.048, 0.048, 0.008, 36]} />
                <meshPhysicalMaterial
                  ref={lensApertureRef}
                  color="#020617"
                  roughness={0.03}
                  metalness={0.98}
                  clearcoat={1.0}
                  clearcoatRoughness={0.04}
                />
              </mesh>

              {/* Central Glowing Optical Core / Specular Pupil */}
              <mesh position={[0, 0, 0.023]}>
                <circleGeometry args={[0.022, 24]} />
                <meshBasicMaterial color={beamColor === 'off' ? '#0f172a' : '#ffffff'} />
              </mesh>

              {/* Glowing Status LED Dot */}
              <group position={[0, 0.108, 0.010]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.009, 0.009, 0.006, 16]} />
                  <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
                </mesh>
                <mesh position={[0, 0.004, 0]}>
                  <sphereGeometry args={[0.0075, 16, 12]} />
                  <meshStandardMaterial
                    ref={statusLedRef}
                    color="#ffffff"
                    emissive={colorHex}
                    emissiveIntensity={beamColor === 'off' ? 0.05 : 3.0}
                  />
                </mesh>
              </group>

              {/* ==============================================================
                  6. VOLUMETRIC SURVEILLANCE BEAM
                  ============================================================== */}
              {beamColor !== 'off' && (
                <group name="VolumetricBeam" position={[0, 0, 0.026]}>
                  <mesh geometry={coneGeometry} material={volumetricMaterial} />

                  <spotLight
                    ref={spotLightRef}
                    position={[0, 0, 0]}
                    angle={Math.PI / 7.5}
                    penumbra={0.8}
                    intensity={5.5 * beamProgress}
                    distance={14}
                    color={colorHex}
                  />
                  <object3D ref={spotTargetRef} position={[0, 0, 8]} />
                </group>
              )}

              {/* ==============================================================
                  7. SCENE 4 HOLOGRAPHIC HUD RETICLE (Red Alarm Mode)
                  ============================================================== */}
              {beamColor === 'red' && showHologramHUD && (
                <group name="HolographicReticle" position={[0, 0, 0.08]}>
                  <group ref={reticleRing1Ref}>
                    <lineSegments geometry={reticleSegments.geo1}>
                      <lineBasicMaterial color="#ff2233" linewidth={2} transparent opacity={0.88} />
                    </lineSegments>
                  </group>
                  <group ref={reticleRing2Ref}>
                    <lineSegments geometry={reticleSegments.geo2}>
                      <lineBasicMaterial color="#ff3344" linewidth={2} transparent opacity={0.65} />
                    </lineSegments>
                  </group>
                </group>
              )}

            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
