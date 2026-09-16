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
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DetectionVerificationCard } from '../../components/dashboard/DetectionVerificationCard';
import { investigationService } from '../../services/investigationService';

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
    searchParameters,
    verificationState,
    confirmDetection,
    rejectDetection,
    resetVerification,
    openInvestigation,
  } = useExperienceStore();

  const { camera, lighting, postProcessing } = referenceCalibration;

  // Local display angle and sweep count for the HUD text
  const [displayDeg, setDisplayDeg] = useState<number>(0);
  const [sweepCount, setSweepCount] = useState<number>(1);
  const [isCardMinimized, setIsCardMinimized] = useState<boolean>(false);

  const handleOpenInvestigation = () => {
    const newCase = investigationService.createFromSearch({
      objectName: searchSession.detection?.objectName || searchParameters.object || targetClass || 'Bottle',
      camera: searchSession.detection?.camera || activeCameraInfo.name,
      location: searchSession.detection?.location || activeCameraInfo.location,
      confidence: searchSession.detection?.confidence ?? 94.5,
      evidenceUrl: searchSession.detection?.evidenceUrl || searchSession.evidence || '/camera_feed_sample.jpg',
      timestamp: searchSession.detection?.lastSeenTimestamp || searchSession.detection?.timestamp || 'Just now',
    });
    openInvestigation(newCase.caseId);
  };

  // Visual states
  const isSearching = stage === 'SEARCHING';
  const isTargetAcquired = stage === 'TARGET_ACQUIRED';
  const isDetected = stage === 'DETECTED';
  const isNotDetected = stage === 'NOT_DETECTED';
  const isError = stage === 'ERROR';

  // Visual language: Searching = neutral/blue, Possible match = amber, Confirmed match = green, Offline/error = red
  const beamColor: 'white' | 'green' | 'red' | 'off' | 'blue' | 'amber' = useMemo(() => {
    if (timelineTime !== undefined) {
      if (timelineTime < 6.0) return 'blue';
      if (timelineTime < referenceCalibration.transitions.greenStart) return 'amber';
      if (timelineTime < referenceCalibration.transitions.redStart) return 'green';
      return 'red';
    }
    if (isError) return 'red';
    if (isNotDetected) return 'red';
    if (isTargetAcquired || isDetected) {
      if (verificationState.status === 'REJECTED') return 'amber';
      return 'green';
    }
    if (isSearching) {
      if ((progressDetails?.detectionsCount && progressDetails.detectionsCount > 0) || displayDeg > 220) {
        return 'amber';
      }
      return 'blue';
    }
    return 'blue';
  }, [timelineTime, isTargetAcquired, isDetected, isNotDetected, isError, isSearching, verificationState.status, progressDetails?.detectionsCount, displayDeg]);

  // Target query details
  const targetClass = searchSession.targetClass || searchParameters.object || searchQuery || 'bottle';
  const targetColor = searchSession.targetColor || '';

  // Network cameras & active location telemetry
  const totalCameras = searchParameters.cameraId === 'ALL' ? 4 : 1;
  const currentCamIndex = searchParameters.cameraId === 'ALL'
    ? Math.min(3, Math.floor((displayDeg / 360) * 4))
    : 0;

  const activeCameraInfo = useMemo(() => {
    if (searchParameters.cameraId !== 'ALL' && searchParameters.cameraId) {
      return {
        id: searchParameters.cameraId,
        name: searchParameters.cameraId,
        location: searchParameters.location || 'Desk Surface Alpha',
      };
    }
    const camList = [
      { id: 'CAM-01', name: 'CAM-01 (Overhead Sector A)', location: 'Desk Surface Alpha' },
      { id: 'CAM-02', name: 'CAM-02 (Perimeter Corridor)', location: 'West Transit Axis' },
      { id: 'CAM-03', name: 'CAM-03 (Conference Hall North)', location: 'Meeting Hall Entrance' },
      { id: 'CAM-04', name: 'CAM-04 (Loading Dock West)', location: 'Perimeter Gate Delta' },
    ];
    return camList[currentCamIndex];
  }, [searchParameters.cameraId, searchParameters.location, currentCamIndex]);

  const camerasAnalyzed = searchParameters.cameraId === 'ALL'
    ? Math.min(4, Math.max(1, currentCamIndex + 1))
    : 1;

  const framesAnalyzed = progressDetails?.processedFrames != null && progressDetails.processedFrames > 0
    ? progressDetails.processedFrames
    : Math.max(18, Math.round((displayDeg / 360) * 240) + (sweepCount - 1) * 240);

  const potentialMatchesCount = progressDetails?.detectionsCount != null
    ? progressDetails.detectionsCount
    : (displayDeg > 220 ? 1 : 0);

  const scanProgressPercent = progressDetails?.progressPercent != null
    ? Math.round(progressDetails.progressPercent)
    : Math.min(100, Math.round((displayDeg / 360) * 100));


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
        dpr={[1, 1.5]}
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
                (beamColor as string) === 'white' || beamColor === 'blue'
                  ? referenceCalibration.beam.intensity
                  : beamColor === 'green'
                  ? referenceCalibration.beam.intensity * 1.25
                  : referenceCalibration.beam.intensity * 1.35
              }
              beamProgress={(beamColor as string) === 'off' ? 0 : 1.0}
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
          1. SEARCHING CAMERA NETWORK TELEMETRY HUD (Phase 4 Specification)
          ==================================================================== */}
      {isSearching && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none animate-fade-in font-sans">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-4 shadow-[0_0_35px_rgba(56,189,248,0.18)] text-white">
            {/* Header: SEARCHING CAMERA NETWORK */}
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-2.5 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500 shadow-[0_0_8px_#38bdf8]" />
                </span>
                <span className="font-mono text-xs font-black tracking-widest text-sky-400 uppercase">
                  SEARCHING CAMERA NETWORK
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                  potentialMatchesCount > 0
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-sky-950/80 border-sky-500/40 text-sky-300'
                }`}>
                  {potentialMatchesCount > 0 ? 'POTENTIAL MATCH DETECTED' : 'MULTI-SPECTRAL SWEEP'}
                </span>
              </div>

              <div className="font-mono text-xs text-slate-300">
                <span className="text-slate-500 text-[10px] mr-1.5">TARGET:</span>
                <span className="font-bold text-white uppercase">{targetClass}</span>
                {targetColor ? <span className="text-sky-400 ml-1 uppercase">({targetColor})</span> : null}
              </div>
            </div>

            {/* 4 Core Search Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {/* Metric 1: Cameras Analyzed */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Cameras Analyzed</div>
                <div className="text-sm font-mono font-bold text-sky-300 mt-0.5">
                  {camerasAnalyzed} / {totalCameras}
                </div>
                <div className="text-[9px] font-mono text-slate-500 truncate">
                  {activeCameraInfo.name}
                </div>
              </div>

              {/* Metric 2: Frames Analyzed */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Frames Analyzed</div>
                <div className="text-sm font-mono font-bold text-sky-300 mt-0.5">
                  {framesAnalyzed.toLocaleString()}
                </div>
                <div className="text-[9px] font-mono text-slate-500">
                  @ 60 FPS INFERENCE
                </div>
              </div>

              {/* Metric 3: Potential Matches */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Potential Matches</div>
                <div className={`text-sm font-mono font-bold mt-0.5 ${potentialMatchesCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                  {potentialMatchesCount} {potentialMatchesCount > 0 ? 'CANDIDATE' : 'NONE'}
                </div>
                <div className="text-[9px] font-mono text-slate-500 truncate">
                  {potentialMatchesCount > 0 ? 'CONFIRMING RETICLE' : 'ACTIVE FOV'}
                </div>
              </div>

              {/* Metric 4: Processing Progress */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Processing Progress</div>
                <div className="text-sm font-mono font-bold text-sky-300 mt-0.5">
                  {scanProgressPercent}%
                </div>
                <div className="text-[9px] font-mono text-slate-500">
                  {displayDeg}° / 360°
                </div>
              </div>
            </div>

            {/* Progress Bar & Active Camera/Location Info */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    potentialMatchesCount > 0
                      ? 'bg-gradient-to-r from-sky-500 to-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : 'bg-gradient-to-r from-sky-500 to-cyan-400 shadow-[0_0_8px_#38bdf8]'
                  }`}
                  style={{ width: `${scanProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 truncate">
                  <Camera className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="text-slate-200 font-bold">{activeCameraInfo.name}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 truncate">{activeCameraInfo.location}</span>
                </span>
                <span className="text-sky-400 font-semibold shrink-0 ml-2">
                  SWEEP {sweepCount} • {displayDeg}°
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          2. IN-SCENE TARGET ACQUIRED TOP HUD
          ==================================================================== */}
      {(isTargetAcquired || isDetected) && !showResultsView && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in font-sans">
          <div className="bg-black/85 backdrop-blur-md border border-emerald-500/50 rounded-2xl px-6 py-2.5 shadow-[0_0_25px_rgba(16,240,112,0.25)] text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 font-extrabold tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>TARGET ACQUIRED • OPTICAL TRACKING LOCK ENGAGED</span>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. HUMAN VERIFICATION FORENSIC CARD OVERLAY (Phase 4 Core Requirement)
          ==================================================================== */}
      {(isTargetAcquired || isDetected) && !showResultsView && (
        <>
          {isCardMinimized ? (
            /* Minimized Sleek Telemetry Bar */
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[94%] max-w-xl z-40 animate-fade-in font-sans">
              <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-xs">
                    <span className="font-bold text-white uppercase">
                      {searchSession.detection?.objectName || searchParameters.object || targetClass}
                    </span>
                    <span className="text-slate-400 ml-2 font-mono">
                      ({(searchSession.detection?.confidence ?? 94.5).toFixed(1)}%)
                    </span>
                    <span className="text-emerald-400 ml-2 font-mono font-semibold">
                      • {searchSession.detection?.camera || activeCameraInfo.name}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="maximize-verification-card-btn"
                  onClick={() => setIsCardMinimized(false)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1 shadow-xs transition-all"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Verify Match</span>
                </button>
              </div>
            </div>
          ) : (
            /* Full Interactive Detection & Human Verification Card */
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-40 max-h-[75vh] overflow-y-auto animate-scale-in">
              <div className="flex justify-end mb-1.5">
                <button
                  type="button"
                  id="minimize-verification-card-btn"
                  onClick={() => setIsCardMinimized(true)}
                  className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white border border-white/10 text-[11px] font-mono flex items-center gap-1 backdrop-blur-md cursor-pointer shadow-md transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  <span>Minimize Overlay</span>
                </button>
              </div>
              <DetectionVerificationCard
                camera={searchSession.detection?.camera || activeCameraInfo.name}
                location={searchSession.detection?.location || activeCameraInfo.location}
                object={searchSession.detection?.objectName || searchParameters.object || targetClass || 'Bottle'}
                confidence={searchSession.detection?.confidence ?? 94.5}
                timestamp={searchSession.detection?.lastSeenTimestamp || searchSession.detection?.timestamp || 'Just now'}
                evidenceUrl={searchSession.detection?.evidenceUrl || searchSession.evidence || '/camera_feed_sample.jpg'}
                originalUrl={searchSession.detection?.originalUrl || '/camera_feed_sample.jpg'}
                trackId={searchSession.detection?.trackId || 104}
                verificationState={verificationState}
                onConfirm={confirmDetection}
                onReject={rejectDetection}
                onReset={resetVerification}
                onInspectEvidence={() => setShowResultsView(true)}
                onOpenInvestigation={handleOpenInvestigation}
              />
            </div>
          )}
        </>
      )}

      {/* 4. IN-SCENE NOT DETECTED HUD */}
      {isNotDetected && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in font-sans">
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

      {/* 5. IN-SCENE ERROR HUD */}
      {isError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-fade-in font-sans">
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

      {/* 6. Bottom Action Bar */}
      {timelineTime === undefined && !showResultsView && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 z-30 animate-fade-in font-sans">
          <button
            type="button"
            id="detection-return-home-btn"
            onClick={() => {
              searchExperienceController.reset();
              setActiveFeedTab('home');
              setStage('HOME');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </button>

          {isSearching && (
            <button
              type="button"
              id="cancel-scan-btn"
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
              id="view-forensic-report-btn"
              onClick={() => setShowResultsView(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold backdrop-blur-md border border-emerald-400/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Detailed Forensic Report &rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* 7. Comprehensive Full-Screen Evidence & Forensic Drawer */}
      {showResultsView && <CinematicResultsView />}
    </div>
  );
};
