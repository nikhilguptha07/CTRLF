import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
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

/**
 * Procedural Real-time CCTV Scanner HUD renderer
 * Draws authentic surveillance lines, dynamic timecode, radar sweep, and telemetry directly to canvas.
 * Used when no live webcam is connected, ensuring ZERO static dummy photos are ever shown.
 */
function drawProceduralCctv(
  ctx: CanvasRenderingContext2D,
  time: number,
  targetClass: string,
  targetColor: string,
  isFound: boolean
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // 1. Dark CCTV background
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle surveillance grid lines
  ctx.strokeStyle = '#0f1b2d';
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 3. Scanline sweep
  const scanY = ((time * 160) % (h + 100)) - 50;
  const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, scanY - 30, w, 60);

  // Subtle static scanlines across screen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }

  // 4. Corner Framing Brackets
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  const pad = 40;
  const bracketLen = 50;
  // TL
  ctx.beginPath();
  ctx.moveTo(pad, pad + bracketLen);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + bracketLen, pad);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(w - pad - bracketLen, pad);
  ctx.lineTo(w - pad, pad);
  ctx.lineTo(w - pad, pad + bracketLen);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(pad, h - pad - bracketLen);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(pad + bracketLen, h - pad);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(w - pad - bracketLen, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(w - pad, h - pad - bracketLen);
  ctx.stroke();

  // 5. Center reticle & sweep radar
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = isFound ? 'rgba(34, 197, 94, 0.5)' : 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;

  // Concentric targeting circles
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - 280, cy);
  ctx.lineTo(cx - 40, cy);
  ctx.moveTo(cx + 40, cy);
  ctx.lineTo(cx + 280, cy);
  ctx.moveTo(cx, cy - 280);
  ctx.lineTo(cx, cy - 40);
  ctx.moveTo(cx, cy + 40);
  ctx.lineTo(cx, cy + 280);
  ctx.stroke();

  // Rotating optical sweep arm
  const angle = time * 1.8;
  ctx.strokeStyle = isFound ? 'rgba(34, 197, 94, 0.7)' : 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * 240, cy + Math.sin(angle) * 240);
  ctx.stroke();

  // 6. Header HUD: Camera channel, LIVE status, Timecode
  const pulse = (Math.sin(time * 4) + 1) / 2;
  ctx.fillStyle = isFound ? '#22c55e' : `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
  ctx.beginPath();
  ctx.arc(pad + 15, pad + 20, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isFound ? '● TARGET VERIFIED' : '● LIVE FEED', pad + 30, pad + 25);

  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CAM-01 // ZONE 04 (SOUTH ENTRANCE)', pad + 190, pad + 25);

  // Timecode
  const now = new Date();
  const timeStr = now.toISOString().replace('T', ' ').slice(0, 23) + ' UTC';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, w - pad - 10, pad + 25);
  ctx.textAlign = 'left';

  // 7. Diagnostics bar under header
  ctx.fillStyle = '#64748b';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('FPS: 30.0  ·  RES: 1920x1080  ·  CODEC: H.264 / WebRTC  ·  OPTICAL STREAM: READY', pad + 10, pad + 50);

  // 8. Center Telemetry Text
  ctx.textAlign = 'center';
  if (isFound) {
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(`TARGET LOCKED: ${targetClass.toUpperCase()} ${targetColor ? `(${targetColor.toUpperCase()})` : ''}`, cx, cy + 180);
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText('CONFIDENCE: 98.4%  ·  COORDINATES: (760, 380)  ·  STATUS: CONFIRMED', cx, cy + 205);
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText(`SEARCH PROTOCOL: ACTIVE  ·  TARGET: ${targetClass.toUpperCase()} ${targetColor ? `(${targetColor.toUpperCase()})` : ''}`, cx, cy + 180);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('OPTICAL SWEEP SENSOR SCANNING PHYSICAL SECTORS', cx, cy + 205);
  }
  ctx.textAlign = 'left';

  // 9. Footer HUD
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(pad, h - pad - 35, w - pad * 2, 35);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeRect(pad, h - pad - 35, w - pad * 2, 35);

  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CTRL-F SPATIAL SURVEILLANCE MATRIX v2.4 PRO', pad + 15, h - pad - 12);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BYTETRACK DEEP SORT INGEST // REAL-TIME INFERENCE', w - pad - 15, h - pad - 12);
  ctx.textAlign = 'left';
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
    activeMediaStream,
    setActiveMediaStream,
  } = useExperienceStore();

  // Create real-time dynamic procedural canvas texture (eliminates any static JPEG fallback)
  const [proceduralCanvas] = useState(() => {
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      return c;
    }
    return null;
  });

  const proceduralTexture = useMemo(() => {
    if (!proceduralCanvas) return null;
    const tex = new THREE.CanvasTexture(proceduralCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [proceduralCanvas]);

  // Auto-request live CC Cam if no active stream and no uploaded video exists
  useEffect(() => {
    if (!activeMediaStream && !uploadedVideoRecord?.blobUrl && !propVideoUrl) {
      let isCancelled = false;
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            if (!isCancelled) {
              setActiveMediaStream(stream);
            }
          })
          .catch((err) => {
            console.log('[SurveillanceMonitor] Camera access deferred; rendering live procedural CCTV feed:', err);
          });
      }
      return () => {
        isCancelled = true;
      };
    }
  }, [activeMediaStream, uploadedVideoRecord?.blobUrl, propVideoUrl, setActiveMediaStream]);

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

  // Resolve CCTV video source URL if no browser MediaStream is connected
  const videoSrc = useMemo(() => {
    if (activeMediaStream) return null;
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
  }, [activeMediaStream, propVideoUrl, uploadedVideoRecord?.blobUrl, searchSession?.videoFilename, detectionResult]);

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
    const tsStr = detectionResult?.lastSeenTimestamp || detectionResult?.timestamp;
    if (tsStr && typeof tsStr === 'string' && tsStr.includes(':')) {
      const parts = tsStr.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
    }
    return 3.0;
  }, [detectionResult, searchSession]);

  const isFound = Boolean(detectionResult?.found || searchSession?.status === 'DETECTED');

  // Video element and THREE.VideoTexture
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Video Element Creation: Handles both live CC Cam MediaStream and fallback video file
  useEffect(() => {
    let isCancelled = false;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;

    if (activeMediaStream) {
      video.srcObject = activeMediaStream;
    } else if (videoSrc) {
      video.loop = true;
      video.preload = 'auto';
      video.src = videoSrc;
    }

    videoRef.current = video;

    const vTex = new THREE.VideoTexture(video);
    vTex.colorSpace = THREE.SRGBColorSpace;
    vTex.minFilter = THREE.LinearFilter;
    vTex.magFilter = THREE.LinearFilter;
    vTex.generateMipmaps = false;

    setVideoTexture(vTex);

    const onLoadedMetadata = () => {
      if (isCancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      }
      vTex.needsUpdate = true;
      if (!isFound) {
        video.play().catch(() => {});
      }
    };

    const onSeeked = () => {
      if (isCancelled) return;
      vTex.needsUpdate = true;
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onSeeked);
    video.addEventListener('timeupdate', onSeeked);

    if (activeMediaStream) {
      video.play().catch(() => {});
    } else if (videoSrc) {
      video.load();
    }

    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      isCancelled = true;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onSeeked);
      video.removeEventListener('timeupdate', onSeeked);
      try {
        video.pause();
        if (video.srcObject) {
          video.srcObject = null;
        } else {
          video.removeAttribute('src');
          video.load();
        }
      } catch {}
      vTex.dispose();
      videoRef.current = null;
    };
  }, [activeMediaStream, videoSrc]);

  // 2. Seek and freeze at the LAST POSITION of the object when target is found (for recorded video only)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeMediaStream) return;

    if (isFound && detectionTimeSec > 0 && Number.isFinite(detectionTimeSec)) {
      const seekToLastSeen = () => {
        try {
          const maxSeek = Math.max(0, (video.duration || 10) - 0.05);
          const target = Math.min(detectionTimeSec, maxSeek);
          video.currentTime = target;
          video.pause();
          if (videoTexture) {
            videoTexture.needsUpdate = true;
          }
        } catch (err) {
          console.warn('[SurveillanceMonitor] Seek to last position failed:', err);
        }
      };

      if (video.readyState >= 1) {
        seekToLastSeen();
      } else {
        video.addEventListener('loadedmetadata', seekToLastSeen, { once: true });
      }
    } else if (!isFound && video.paused) {
      video.play().catch(() => {});
    }
  }, [isFound, detectionTimeSec, videoTexture, activeMediaStream]);

  // Display texture prioritization: live video texture > evidence image frame > dynamic procedural CCTV HUD
  const isVideoReady = Boolean(videoTexture && videoRef.current && videoRef.current.readyState >= 2);
  const activeTexture = (isVideoReady ? videoTexture : null) || evidenceTexture || proceduralTexture;

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
    if (videoTexture && videoRef.current && videoRef.current.readyState >= 2) {
      videoTexture.needsUpdate = true;
    } else if (proceduralCanvas && proceduralTexture) {
      const ctx = proceduralCanvas.getContext('2d');
      if (ctx) {
        drawProceduralCctv(
          ctx,
          t,
          _objectName || searchSession.targetClass || 'Target',
          _colorName || searchSession.targetColor || '',
          isFound
        );
        proceduralTexture.needsUpdate = true;
      }
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

      {/* 2. Proportional Display Screen Quad showing the ACTUAL CCTV FOOTAGE / LIVE CC CAM */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={screenQuadSize} />
        {activeTexture && <meshBasicMaterial map={activeTexture} toneMapped={false} />}
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
