import React, { Suspense, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { CinematicCCTVCamera } from './CinematicCCTVCamera';
import { VolumetricDustParticles } from './VolumetricDustParticles';
import { CinematicResultsView } from './CinematicResultsView';
import { SurveillanceMonitor } from './SurveillanceMonitor';
import { useExperienceStore } from '../../store/useExperienceStore';
import { searchExperienceController } from '../../services/searchExperienceController';
import { referenceCalibration } from '../../config/referenceCalibration';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// Ambient 4-pointed sparkle star in bottom right corner (from reference video)
const AmbientBrandingStar: React.FC<{ position?: [number, number, number] }> = ({
  position = [3.65, -1.85, 0.5],
}) => {
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[0.07, 0.42]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.42, 0.07]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Studio Ground Floor & Architectural Wall (Authentic Dark Surveillance Room)
const StudioRoomEnvironment: React.FC = () => {
  return (
    <group name="StudioEnvironment">
      {/* Ground Studio Floor with Subtle Matte Finish */}
      <mesh position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color="#141a24" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Studio Floor Grid Lines for Spatial Depth */}
      <gridHelper
        args={[24, 24, '#1e293b', '#0f172a']}
        position={[0, -1.14, 0]}
      />

      {/* Back Industrial Surveillance Wall */}
      <group position={[0, 0, -2.4]}>
        <mesh receiveShadow>
          <planeGeometry args={[24, 16]} />
          <meshStandardMaterial color="#161f2c" roughness={0.75} metalness={0.25} />
        </mesh>
        {/* Architectural vertical panel seams */}
        {[-4.8, -2.4, 0, 2.4, 4.8].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.01]}>
            <planeGeometry args={[0.015, 16]} />
            <meshBasicMaterial color="#233144" transparent opacity={0.8} />
          </mesh>
        ))}
        {/* Horizontal baseboard trim line */}
        <mesh position={[0, -1.10, 0.02]}>
          <planeGeometry args={[24, 0.06]} />
          <meshStandardMaterial color="#2a3b50" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

interface DetectionSceneProps {
  timelineTime?: number;
}

export const DetectionScene: React.FC<DetectionSceneProps> = ({ timelineTime }) => {
  const { 
    stage, 
    setStage, 
    setActiveFeedTab,
    searchQuery, 
    searchSession,
    showResultsView,
    setShowResultsView,
    setRotationProgress,
    progressDetails,
  } = useExperienceStore();

  const { camera, lighting, postProcessing } = referenceCalibration;

  // Local display angle and sweep count for the HUD text
  const [displayDeg, setDisplayDeg] = useState<number>(0);
  const [sweepCount, setSweepCount] = useState<number>(1);

  // Visual states
  const isSearching = stage === 'SEARCHING';
  const isTargetAcquired = stage === 'TARGET_ACQUIRED';
  const isDetected = stage === 'DETECTED';
  const isNotDetected = stage === 'NOT_DETECTED';
  const isError = stage === 'ERROR';

  // Beam and LED color: WHITE during scan, GREEN on found, RED on not found, OFF on error
  const beamColor: 'white' | 'green' | 'red' | 'off' = useMemo(() => {
    if (timelineTime !== undefined) {
      if (timelineTime < referenceCalibration.transitions.greenStart) return 'white';
      if (timelineTime < referenceCalibration.transitions.redStart) return 'green';
      return 'red';
    }
    if (isTargetAcquired || isDetected) return 'green';
    if (isNotDetected) return 'red';
    if (isError) return 'off';
    return 'white';
  }, [timelineTime, isTargetAcquired, isDetected, isNotDetected, isError]);

  // Target query details
  const targetClass = searchSession.targetClass || searchQuery || 'bottle';
  const targetColor = searchSession.targetColor || '';


  // CCTV Rig Mount Position:
  // For all real searches, the CCTV rig stays anchored at its physical studio mount [0.35, 0.15, 0.0].
  // Only the 10-second reference demo mode (timelineTime !== undefined) switches camera positions.
  const isDemoMode = timelineTime !== undefined;
  const isDemoScene3 = isDemoMode && timelineTime >= 6.60 && timelineTime < 7.60;
  const isDemoScene4 = isDemoMode && timelineTime >= 7.60;

  // Surveillance Monitor positioning: In Demo Scene 3, positioned on the right per reference calibration.
  // In real search (TARGET_ACQUIRED / DETECTED), the CCTV camera is mounted on the right [0.35, 0.15, 0.0],
  // so the monitor sits in the left/center field of view where the green tracking beam illuminates it.
  const monitorConfig = useMemo(() => {
    if (isDemoScene3) {
      return {
        position: referenceCalibration.scene3.monitorPosition,
        rotation: [0, 0, 0] as [number, number, number],
        scale: 1.0,
      };
    }
    return {
      position: [-1.20, -0.05, -0.5] as [number, number, number],
      rotation: [0, 0.14, 0] as [number, number, number],
      scale: 0.85,
    };
  }, [isDemoScene3]);

  const cctvConfig = useMemo(() => {
    if (isDemoScene3) {
      return {
        position: referenceCalibration.scene3.cctvPosition,
        mountSide: 'left' as const,
        scale: referenceCalibration.scene3.cctvScale,
      };
    }
    if (isDemoScene4) {
      return {
        position: referenceCalibration.scene4.cctvPosition,
        mountSide: 'right' as const,
        scale: referenceCalibration.scene4.cctvScale,
      };
    }
    return {
      position: referenceCalibration.scene2.cctvPosition,
      mountSide: 'right' as const,
      scale: referenceCalibration.scene2.cctvScale,
    };
  }, [isDemoScene3, isDemoScene4]);

  // Calibrate 3D Tracking Beam towards target on surveillance monitor
  const targetAngles = useMemo(() => {
    if (!isTargetAcquired && !isDetected) return null;

    const cctvPos = cctvConfig.position;
    const monPos = monitorConfig.position;

    // Offset aiming position based on real detection bounding box on monitor screen
    const det = searchSession?.detection;
    const bbox = det?.boundingBox;
    let targetX = monPos[0];
    let targetY = monPos[1];
    let targetZ = monPos[2];

    if (bbox) {
      const bx = bbox.x ?? bbox.x1 ?? 0;
      const by = bbox.y ?? bbox.y1 ?? 0;
      const bw = bbox.width ?? (bbox.x2 != null && bbox.x1 != null ? bbox.x2 - bbox.x1 : 0);
      const bh = bbox.height ?? (bbox.y2 != null && bbox.y1 != null ? bbox.y2 - bbox.y1 : 0);
      const cx = bx + bw / 2;
      const cy = by + bh / 2;

      // Normalize coordinates against standard 1920x1080 (-0.5 to +0.5)
      const normX = (cx / 1920) - 0.5;
      const normY = (cy / 1080) - 0.5;

      // Monitor screen quad width is ~1.19m, height is ~0.68m
      targetX += normX * 1.1;
      targetY -= normY * 0.6;
    }

    const dx = targetX - cctvPos[0];
    const dy = targetY - cctvPos[1];
    const dz = targetZ - cctvPos[2];

    // Compute mechanical yaw (pan) and pitch (tilt) in Three.js coordinate system
    const yawRad = Math.atan2(dx, dz);
    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const pitchRad = Math.atan2(-dy, distXZ);

    return {
      yawRad,
      pitchRad,
    };
  }, [isTargetAcquired, isDetected, cctvConfig.position, monitorConfig.position, searchSession?.detection]);

  // Demo pan/tilt overrides for 10-second offline reference timeline
  const demoAngles = useMemo(() => {
    if (timelineTime === undefined) return null;
    if (timelineTime < referenceCalibration.transitions.greenStart) {
      const p = Math.min(1.0, Math.max(0, (timelineTime - 4.5) / 2.0));
      const pan = THREE.MathUtils.lerp(
        referenceCalibration.scene2.sweepPanLeft,
        referenceCalibration.scene2.sweepPanRight,
        p
      );
      return { pan, tilt: referenceCalibration.scene2.sweepTilt };
    }
    if (timelineTime < referenceCalibration.transitions.redStart) {
      return { pan: referenceCalibration.scene3.pan, tilt: referenceCalibration.scene3.tilt };
    }
    return { pan: referenceCalibration.scene4.pan, tilt: referenceCalibration.scene4.tilt };
  }, [timelineTime]);

  const handleRotationProgress = (deg: number, isMinSatisfied: boolean, count: number) => {
    const rounded = Math.round(deg);
    setDisplayDeg(rounded);
    setSweepCount(count);
    setRotationProgress(rounded, rounded / 360, isMinSatisfied);
  };

  const isAnalysisComplete =
    searchExperienceController.isAnalysisComplete() ||
    Boolean(searchSession.completedAt) ||
    searchSession.status === 'DETECTED' ||
    searchSession.status === 'NOT_DETECTED' ||
    searchSession.status === 'ERROR';

  return (
    <div className="relative w-full h-full bg-[#0d121a] overflow-hidden select-none font-sans">
      <Canvas
        camera={{ position: camera.position, fov: camera.fov }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
      >
        <Suspense fallback={null}>
          <fogExp2 attach="fog" args={['#0d121a', 0.022]} />

          {/* Studio Lighting Setup */}
          <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
          <directionalLight
            position={lighting.keyLight.position}
            intensity={lighting.keyLight.intensity}
            color={lighting.keyLight.color}
          />
          <directionalLight
            position={lighting.fillLight.position}
            intensity={lighting.fillLight.intensity}
            color={lighting.fillLight.color}
          />
          <directionalLight
            position={lighting.bottomBounce.position}
            intensity={lighting.bottomBounce.intensity}
            color={lighting.bottomBounce.color}
          />
          <directionalLight position={[2.8, 3.2, -1.8]} intensity={2.0} color="#cbd5e1" />

          {/* Physical Studio Environment */}
          <StudioRoomEnvironment />
          <AmbientBrandingStar />
          <VolumetricDustParticles beamApex={cctvConfig.position} />

          {/* CCTV RIG: Anchored in physical surveillance space */}
          <group name="CCTVRig" position={cctvConfig.position}>
            <CinematicCCTVCamera
              mountSide={cctvConfig.mountSide}
              beamColor={beamColor}
              beamIntensity={
                beamColor === 'white'
                  ? referenceCalibration.beam.intensity
                  : beamColor === 'green'
                  ? referenceCalibration.beam.intensity * 1.25
                  : referenceCalibration.beam.intensity * 1.35
              }
              beamProgress={beamColor === 'off' ? 0 : 1.0}
              panAngle={demoAngles?.pan}
              tiltAngle={demoAngles?.tilt}
              isScanning={isSearching}
              isAnalysisComplete={isAnalysisComplete}
              isTargetLocked={isTargetAcquired || isDetected}
              targetYawRad={targetAngles?.yawRad}
              targetPitchRad={targetAngles?.pitchRad}
              onRotationProgress={handleRotationProgress}
              position={[0, 0, 0]}
              scale={cctvConfig.scale}
              showHologramHUD={isNotDetected || isDemoScene4}
            />
          </group>

          {/* Surveillance Monitor: Active during Demo Scene 3 or real TARGET_ACQUIRED / DETECTED */}
          {(isDemoScene3 || isTargetAcquired || isDetected) && (
            <SurveillanceMonitor
              position={monitorConfig.position}
              rotation={monitorConfig.rotation}
              scale={monitorConfig.scale}
              objectName={targetClass}
              colorName={targetColor || 'GREEN'}
            />
          )}

          {/* Post-Processing: Bloom and Vignette */}
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={postProcessing.bloomIntensity}
              luminanceThreshold={postProcessing.bloomThreshold}
              luminanceSmoothing={postProcessing.bloomSmoothing}
            />
            <Vignette
              eskil={false}
              offset={postProcessing.vignetteOffset}
              darkness={postProcessing.vignetteDarkness}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* ====================================================================
          MINIMAL IN-SCENE STATUS HUD (Primary Search Experience - Requirement 11)
          Only minimal status text: SCANNING / ANALYZING / TARGET ACQUIRED / NOT DETECTED
          ==================================================================== */}
      
      {/* 1. Top Center Status Pill during SCANNING & ANALYZING */}
      {isSearching && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in">
          <div className="bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl px-6 py-2.5 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#38bdf8] font-bold tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] border border-[#38bdf8] animate-pulse shadow-[0_0_8px_#38bdf8]" />
              <span>
                {sweepCount > 1
                  ? `CAMERA 01 · 360° SCANNING · SWEEP ${sweepCount} · ${displayDeg}° / 360°`
                  : `CAMERA 01 · 360° SCANNING · ${displayDeg}° / 360°`}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5 tracking-wider">
              SCANNING FOR: <span className="font-bold text-white uppercase">{targetClass}</span>
              {targetColor ? <> • <span className="text-[#38bdf8] uppercase">{targetColor}</span></> : null}
              {progressDetails?.processedFrames ? (
                <span className="text-[#38bdf8] text-[10px] ml-2">
                  • ANALYZING ({progressDetails.processedFrames}/{progressDetails.totalFrames || '?'} frames)
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 2. IN-SCENE TARGET ACQUIRED HUD (Green Mode - Requirement 6) */}
      {(isTargetAcquired || isDetected) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in">
          <div className="bg-black/85 backdrop-blur-md border border-emerald-500/50 rounded-2xl px-7 py-3 shadow-[0_0_25px_rgba(16,240,112,0.25)] text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-mono text-emerald-400 font-extrabold tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>TARGET ACQUIRED</span>
            </div>
            <div className="text-xs font-mono text-slate-200 mt-1">
              <span className="font-bold text-white uppercase">{searchSession.detection?.objectName || targetClass}</span>
              {searchSession.detection?.confidence ? (
                <span className="text-emerald-400 font-bold ml-2">
                  {searchSession.detection.confidence.toFixed(1)}% CONFIDENCE
                </span>
              ) : null}
              {searchSession.detection?.lastSeenTimestamp ? (
                <span className="text-slate-400 ml-2">
                  @ {searchSession.detection.lastSeenTimestamp}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80 mt-0.5 tracking-wider">
              OPTICAL TRACKING LOCK ENGAGED • AIMING TO LAST KNOWN POSITION
            </div>
          </div>
        </div>
      )}

      {/* 3. IN-SCENE NOT DETECTED HUD (Red Mode - Requirement 6) */}
      {isNotDetected && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in">
          <div className="bg-black/85 backdrop-blur-md border border-rose-500/50 rounded-2xl px-7 py-3 shadow-[0_0_25px_rgba(255,34,51,0.25)] text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-mono text-rose-400 font-extrabold tracking-wider">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>NOT DETECTED</span>
            </div>
            <div className="text-xs font-mono text-slate-300 mt-1">
              No visual match found for <span className="font-bold text-white uppercase">{targetClass}</span>
            </div>
            <div className="text-[10px] font-mono text-rose-400/80 mt-0.5 tracking-wider">
              360° SURVEILLANCE SCAN EXHAUSTED • 0 TARGET OBSERVATIONS
            </div>
          </div>
        </div>
      )}

      {/* 4. IN-SCENE ERROR HUD (Requirement 10) */}
      {isError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in">
          <div className="bg-black/90 backdrop-blur-md border border-rose-500/80 rounded-2xl px-7 py-3 shadow-2xl text-center max-w-md">
            <div className="flex items-center justify-center gap-2 text-sm font-mono text-rose-400 font-extrabold tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>SEARCH OPERATION FAILED</span>
            </div>
            <div className="text-xs font-mono text-slate-300 mt-1">
              {searchSession.error || 'Video analysis pipeline encountered an unexpected error.'}
            </div>
          </div>
        </div>
      )}

      {/* Ambient Diamond Sparkle Star (Bottom Right UI Accent) */}
      <div className="absolute bottom-6 right-8 pointer-events-none z-20 text-slate-400 text-lg opacity-70">
        ✦
      </div>

      {/* 5. Bottom Action Bar */}
      {timelineTime === undefined && !showResultsView && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 z-30 animate-fade-in">
          <button
            type="button"
            onClick={() => {
              searchExperienceController.reset();
              setActiveFeedTab('home');
              setStage('HOME');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </button>

          {isSearching && (
            <button
              type="button"
              onClick={() => {
                searchExperienceController.reset();
                setActiveFeedTab('home');
                setStage('HOME');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#450a0a]/80 hover:bg-[#7f1d1d]/80 text-[#fca5a5] text-xs font-semibold backdrop-blur-md border border-[#ef4444]/30 hover:border-[#ef4444]/60 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" />
              <span>Cancel Scan</span>
            </button>
          )}

          {(isTargetAcquired || isDetected || isNotDetected) && (
            <button
              type="button"
              onClick={() => setShowResultsView(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold backdrop-blur-md border border-emerald-400/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Detailed Forensic Report &rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* 6. Comprehensive Full-Screen Evidence & Forensic Drawer */}
      {showResultsView && <CinematicResultsView />}
    </div>
  );
};
