import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useExperienceStore } from '../../store/useExperienceStore';
import { apiClient } from '../../services/apiClient';

interface SurveillanceMonitorProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  objectName?: string;
  colorName?: string;
  videoUrl?: string;
  evidenceUrl?: string;
}

export const SurveillanceMonitor: React.FC<SurveillanceMonitorProps> = ({
  position = [0.65, -0.05, -0.3],
  rotation = [0, 0, 0],
  scale = 1.0,
  objectName: _objectName = 'Keys',
  colorName: _colorName = 'GREEN',
  videoUrl: propVideoUrl,
  evidenceUrl: propEvidenceUrl,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const radarRingRef = useRef<THREE.Mesh>(null);
  const glowPlaneRef = useRef<THREE.Mesh>(null);

  const {
    searchSession,
    detectionResult,
    uploadedVideoRecord,
    allEvidenceItems,
  } = useExperienceStore();

  // Load fallback texture
  const fallbackTexture = useTexture('/surveillance-monitor-rectified.jpg');
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;

  // Resolve actual evidence image frame from SCREEN 2
  const evidenceImageUrl = useMemo(() => {
    if (propEvidenceUrl) return propEvidenceUrl;
    if (detectionResult?.detectionId) {
      return apiClient.getDetectionImageUrl(detectionResult.detectionId);
    }
    if (detectionResult?.evidenceUrl) {
      return detectionResult.evidenceUrl.startsWith('http')
        ? detectionResult.evidenceUrl
        : `${apiClient.getBaseUrl()}${detectionResult.evidenceUrl.startsWith('/') ? '' : '/'}${detectionResult.evidenceUrl}`;
    }
    if (searchSession?.evidence) {
      return searchSession.evidence.startsWith('http')
        ? searchSession.evidence
        : `${apiClient.getBaseUrl()}${searchSession.evidence.startsWith('/') ? '' : '/'}${searchSession.evidence}`;
    }
    if (allEvidenceItems.length > 0) {
      const p = allEvidenceItems[0].annotatedImagePath || allEvidenceItems[0].originalImagePath;
      if (p) {
        return p.startsWith('http') ? p : `${apiClient.getBaseUrl()}${p.startsWith('/') ? '' : '/'}${p}`;
      }
    }
    return null;
  }, [propEvidenceUrl, detectionResult, searchSession?.evidence, allEvidenceItems]);

  const [evidenceTexture, setEvidenceTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!evidenceImageUrl) return;
    let isCancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      evidenceImageUrl,
      (tex) => {
        if (isCancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        setEvidenceTexture(tex);
      },
      undefined,
      (err) => {
        console.warn('[SurveillanceMonitor] Failed to load evidence image texture:', err);
      }
    );
    return () => {
      isCancelled = true;
    };
  }, [evidenceImageUrl]);

  // Resolve actual CCTV video source URL
  const videoSrc = useMemo(() => {
    if (propVideoUrl) return propVideoUrl;
    if (uploadedVideoRecord?.blobUrl) return uploadedVideoRecord.blobUrl;
    const filename = (searchSession?.videoFilename || detectionResult?.videoFilename || '').toLowerCase();
    if (filename === 'whatsapp video 2026-09-03 at 8.46.51 pm.mp4' || filename === 'cctv-reference.mp4' || filename.includes('f2b31c43')) {
      return '/reference/detected-cctv.mp4';
    }
    if (detectionResult?.found && filename === '') {
      return '/reference/detected-cctv.mp4';
    }
    return '/reference/cctv-reference.mp4';
  }, [propVideoUrl, uploadedVideoRecord?.blobUrl, searchSession?.videoFilename, detectionResult]);

  // Resolve actual detection timestamp (seconds)
  const detectionTimeSec = useMemo(() => {
    const ms = detectionResult?.lastSeenTimestampMs ?? searchSession?.detection?.lastSeenTimestampMs;
    if (ms != null && ms > 0) {
      return ms / 1000;
    }
    const frame = detectionResult?.frameNumber ?? detectionResult?.lastSeenFrame ?? searchSession?.detection?.frameNumber;
    if (frame != null && frame > 0) {
      return frame / 30; // 30 fps
    }
    return 3.0;
  }, [detectionResult, searchSession]);

  // Video element and THREE.VideoTexture
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = 'auto';
    video.src = videoSrc;
    videoRef.current = video;

    const onLoadedMetadata = () => {
      if (isCancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      }
      if (detectionTimeSec > 0 && Number.isFinite(detectionTimeSec)) {
        try {
          const maxSeek = Math.max(0, (video.duration || 10) - 0.1);
          video.currentTime = Math.min(detectionTimeSec, maxSeek);
        } catch (e) {
          console.warn('[SurveillanceMonitor] Seek failed:', e);
        }
      }
      video.play().catch((err) => {
        console.warn('[SurveillanceMonitor] Autoplay prevented by browser:', err);
      });
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);

    const vTex = new THREE.VideoTexture(video);
    vTex.colorSpace = THREE.SRGBColorSpace;
    vTex.minFilter = THREE.LinearFilter;
    vTex.magFilter = THREE.LinearFilter;
    vTex.generateMipmaps = false;

    setVideoTexture(vTex);

    video.load();
    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      isCancelled = true;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.pause();
      video.removeAttribute('src');
      video.load();
      vTex.dispose();
      videoRef.current = null;
    };
  }, [videoSrc, detectionTimeSec]);

  // Display texture prioritization: live video texture > evidence image frame from SCREEN 2 > fallback rectified texture
  const activeTexture = videoTexture || evidenceTexture || fallbackTexture;

  // 16:9 Screen proportions matching reference
  const width = 3.80;
  const height = 2.14;
  const depth = 0.08;

  // Proportional screen quad dimensions to prevent distortion of vertical vs horizontal video
  const screenQuadSize = useMemo<[number, number]>(() => {
    const aspect = videoDimensions.width > 0 && videoDimensions.height > 0
      ? videoDimensions.width / videoDimensions.height
      : (width / height);

    if (aspect > width / height) {
      return [width, width / aspect];
    } else {
      return [height * aspect, height];
    }
  }, [videoDimensions, width, height]);

  // Create corner bracket geometry for monitor frame
  const cornerLinesGeo = useMemo(() => {
    const hw = (width * 0.94) / 2;
    const hh = (height * 0.90) / 2;
    const cl = 0.18; // corner length

    const points: THREE.Vector3[] = [];
    // Top-Left
    points.push(new THREE.Vector3(-hw, hh - cl, 0.02), new THREE.Vector3(-hw, hh, 0.02));
    points.push(new THREE.Vector3(-hw, hh, 0.02), new THREE.Vector3(-hw + cl, hh, 0.02));
    // Top-Right
    points.push(new THREE.Vector3(hw - cl, hh, 0.02), new THREE.Vector3(hw, hh, 0.02));
    points.push(new THREE.Vector3(hw, hh, 0.02), new THREE.Vector3(hw, hh - cl, 0.02));
    // Bottom-Right
    points.push(new THREE.Vector3(hw, -hh + cl, 0.02), new THREE.Vector3(hw, -hh, 0.02));
    points.push(new THREE.Vector3(hw, -hh, 0.02), new THREE.Vector3(hw - cl, -hh, 0.02));
    // Bottom-Left
    points.push(new THREE.Vector3(-hw + cl, -hh, 0.02), new THREE.Vector3(-hw, -hh, 0.02));
    points.push(new THREE.Vector3(-hw, -hh, 0.02), new THREE.Vector3(-hw, -hh + cl, 0.02));

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, height]);

  // Target tracking box derivation for detected object on monitor screen quad
  const isFound = Boolean(detectionResult?.found || searchSession?.status === 'DETECTED');
  const targetBbox = useMemo(() => {
    if (!isFound) return null;
    const b = detectionResult?.boundingBox || searchSession?.detection?.boundingBox;
    if (b) {
      const bx = b.x ?? b.x1 ?? 0;
      const by = b.y ?? b.y1 ?? 0;
      const bw = b.width ?? (b.x2 != null && b.x1 != null ? b.x2 - b.x1 : 0);
      const bh = b.height ?? (b.y2 != null && b.y1 != null ? b.y2 - b.y1 : 0);
      if (bw > 0 && bh > 0) {
        return { x: bx, y: by, width: bw, height: bh };
      }
    }
    return { x: 760, y: 380, width: 400, height: 320 };
  }, [isFound, detectionResult?.boundingBox, searchSession?.detection?.boundingBox]);

  const trackingBox3D = useMemo(() => {
    if (!targetBbox) return null;
    const [quadW, quadH] = screenQuadSize;
    const vW = videoDimensions.width > 0 ? videoDimensions.width : 1920;
    const vH = videoDimensions.height > 0 ? videoDimensions.height : 1080;

    const cx = targetBbox.x + targetBbox.width / 2;
    const cy = targetBbox.y + targetBbox.height / 2;

    const normX = (cx / vW) - 0.5;
    const normY = -((cy / vH) - 0.5);

    const boxW = Math.max(0.24, (targetBbox.width / vW) * quadW);
    const boxH = Math.max(0.24, (targetBbox.height / vH) * quadH);

    const x = normX * quadW;
    const y = normY * quadH;

    const hw = boxW / 2;
    const hh = boxH / 2;
    const cl = Math.min(0.09, Math.min(hw, hh) * 0.45);

    const pts: THREE.Vector3[] = [];
    // Corner brackets
    pts.push(new THREE.Vector3(-hw, hh - cl, 0.005), new THREE.Vector3(-hw, hh, 0.005));
    pts.push(new THREE.Vector3(-hw, hh, 0.005), new THREE.Vector3(-hw + cl, hh, 0.005));

    pts.push(new THREE.Vector3(hw - cl, hh, 0.005), new THREE.Vector3(hw, hh, 0.005));
    pts.push(new THREE.Vector3(hw, hh, 0.005), new THREE.Vector3(hw, hh - cl, 0.005));

    pts.push(new THREE.Vector3(hw, -hh + cl, 0.005), new THREE.Vector3(hw, -hh, 0.005));
    pts.push(new THREE.Vector3(hw, -hh, 0.005), new THREE.Vector3(hw - cl, -hh, 0.005));

    pts.push(new THREE.Vector3(-hw + cl, -hh, 0.005), new THREE.Vector3(-hw, -hh, 0.005));
    pts.push(new THREE.Vector3(-hw, -hh, 0.005), new THREE.Vector3(-hw, -hh + cl, 0.005));

    // Center crosshair
    const ch = 0.04;
    pts.push(new THREE.Vector3(-ch, 0, 0.005), new THREE.Vector3(ch, 0, 0.005));
    pts.push(new THREE.Vector3(0, -ch, 0.005), new THREE.Vector3(0, ch, 0.005));

    const geo = new THREE.BufferGeometry().setFromPoints(pts);

    return {
      x,
      y,
      boxW,
      boxH,
      geo,
    };
  }, [targetBbox, screenQuadSize, videoDimensions]);

  // Animated pulse for radar and targeting graphics & video texture refresh
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (radarRingRef.current) {
      const scaleVal = 1.0 + Math.sin(t * 3.5) * 0.08;
      radarRingRef.current.scale.set(scaleVal, scaleVal, 1.0);
    }
    if (glowPlaneRef.current) {
      const mat = glowPlaneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + Math.sin(t * 4.0) * 0.06;
    }
    if (videoTexture && videoRef.current && !videoRef.current.paused) {
      videoTexture.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[scale, scale, scale]} name="SurveillanceMonitor">
      {/* 1. Slim outer monitor bezel / frame */}
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width + 0.08, height + 0.08, depth]} />
        <meshStandardMaterial color="#0b0f17" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Monitor Wall Mount Backing Bracket */}
      <mesh position={[0, 0, -depth - 0.04]}>
        <boxGeometry args={[1.2, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Monitor Dark Glass Base Quad */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#060910" />
      </mesh>

      {/* 2. Proportional Display Screen Quad showing the ACTUAL CCTV FOOTAGE / VIDEO */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={screenQuadSize} />
        <meshBasicMaterial map={activeTexture} toneMapped={false} />
      </mesh>

      {/* 3. Screen Viewfinder Corner Brackets (White HUD) */}
      <lineSegments geometry={cornerLinesGeo}>
        <lineBasicMaterial color="#ffffff" linewidth={2} transparent opacity={0.85} />
      </lineSegments>

      {/* 4. Optical Target Tracking Reticle on Screen (Target Lock Indicator) */}
      {trackingBox3D && (
        <group position={[trackingBox3D.x, trackingBox3D.y, 0.008]}>
          {/* Target Corner Bracket Lines */}
          <lineSegments geometry={trackingBox3D.geo}>
            <lineBasicMaterial color="#22c55e" linewidth={3} transparent opacity={0.95} />
          </lineSegments>

          {/* Target Box Semi-transparent Highlight Quad */}
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[trackingBox3D.boxW, trackingBox3D.boxH]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.16} depthWrite={false} />
          </mesh>

          {/* Pulsing Concentric Radar Ring in target center */}
          <mesh ref={radarRingRef} position={[0, 0, 0.003]}>
            <ringGeometry args={[0.04, 0.055, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>

          {/* Track Lock Glow Point */}
          <pointLight position={[0, 0, 0.08]} color="#22c55e" intensity={2.0} distance={1.2} />
        </group>
      )}

      {/* 5. Ambient Wall Glow behind the monitor (illuminated by the green spotlight) */}
      <pointLight position={[width * 0.5, 0, -0.2]} color="#10f070" intensity={3.5} distance={3.0} />
      <mesh position={[width * 0.35, 0, -0.05]}>
        <planeGeometry args={[1.8, 2.4]} />
        <meshBasicMaterial color="#10f070" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
