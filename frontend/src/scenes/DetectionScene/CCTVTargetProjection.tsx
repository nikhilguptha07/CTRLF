import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface CCTVTargetProjectionProps {
  visible: boolean;
  position: [number, number, number];
  objectName: string;
  trackId?: string | number | null;
  confidence?: number;
  lastSeenTime?: string;
  bboxWidth?: number;
  bboxHeight?: number;
}

export const CCTVTargetProjection: React.FC<CCTVTargetProjectionProps> = ({
  visible,
  position,
  objectName: _objectName,
  trackId: _trackId = '01',
  confidence: _confidence = 94.2,
  lastSeenTime: _lastSeenTime = '00:03',
  bboxWidth = 0.55,
  bboxHeight = 0.75,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Optical corner brackets geometry (thin, clean, futuristic, green)
  // Each corner has a horizontal line and a vertical line of length L
  const cornerLinesGeo = useMemo(() => {
    const hw = bboxWidth / 2;
    const hh = bboxHeight / 2;
    const cl = Math.min(hw, hh) * 0.35; // corner bracket arm length

    const points: THREE.Vector3[] = [];

    // Top-Left Corner
    points.push(new THREE.Vector3(-hw, hh - cl, 0), new THREE.Vector3(-hw, hh, 0));
    points.push(new THREE.Vector3(-hw, hh, 0), new THREE.Vector3(-hw + cl, hh, 0));

    // Top-Right Corner
    points.push(new THREE.Vector3(hw - cl, hh, 0), new THREE.Vector3(hw, hh, 0));
    points.push(new THREE.Vector3(hw, hh, 0), new THREE.Vector3(hw, hh - cl, 0));

    // Bottom-Right Corner
    points.push(new THREE.Vector3(hw, -hh + cl, 0), new THREE.Vector3(hw, -hh, 0));
    points.push(new THREE.Vector3(hw, -hh, 0), new THREE.Vector3(hw - cl, -hh, 0));

    // Bottom-Left Corner
    points.push(new THREE.Vector3(-hw + cl, -hh, 0), new THREE.Vector3(-hw, -hh, 0));
    points.push(new THREE.Vector3(-hw, -hh, 0), new THREE.Vector3(-hw, -hh + cl, 0));

    // Center Crosshair Tick Marks
    const ch = 0.04;
    points.push(new THREE.Vector3(-ch, 0, 0), new THREE.Vector3(ch, 0, 0));
    points.push(new THREE.Vector3(0, -ch, 0), new THREE.Vector3(0, ch, 0));

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [bboxWidth, bboxHeight]);

  // Subtle pulsing animation and billboard towards viewer camera
  useFrame(({ clock, camera }) => {
    if (!visible || !groupRef.current) return;
    const t = clock.getElapsedTime();
    if (glowMatRef.current) {
      glowMatRef.current.opacity = 0.12 + Math.sin(t * 4.0) * 0.04;
    }
    // Face the viewer camera directly so the optical box is always perfectly visible
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position} name="CCTVTargetProjection">
      {/* 1. Thin futuristic green corner brackets */}
      <lineSegments geometry={cornerLinesGeo}>
        <lineBasicMaterial color="#10b981" linewidth={2} transparent opacity={0.95} />
      </lineSegments>

      {/* 2. Thin full-frame perimeter bounding box border */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                -bboxWidth / 2, -bboxHeight / 2, 0,
                bboxWidth / 2, -bboxHeight / 2, 0,
                bboxWidth / 2, bboxHeight / 2, 0,
                -bboxWidth / 2, bboxHeight / 2, 0,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#34d399" transparent opacity={0.35} />
      </lineLoop>

      {/* 3. Subtle translucent green inner plane */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[bboxWidth, bboxHeight]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="#059669"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Subtle top bracket tab for target lock */}
      <mesh position={[0, bboxHeight / 2 + 0.015, 0]}>
        <planeGeometry args={[Math.min(0.25, bboxWidth * 0.5), 0.02]} />
        <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
