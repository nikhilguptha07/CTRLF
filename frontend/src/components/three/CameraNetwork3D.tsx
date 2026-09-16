import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface CameraNodeData {
  id: string;
  name: string;
  location: string;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE' | 'CONFIRMED' | 'SEARCHING';
  pos: [number, number, number];
  fps: number;
  latencyMs: number | null;
  resolution: string;
}

export const DEFAULT_CAMERA_NODES: CameraNodeData[] = [
  { id: 'CAM-01', name: 'North Main Lobby', location: 'Axis Sector A', status: 'ONLINE', pos: [-3.2, 0.4, -1.8], fps: 30.0, latencyMs: 14, resolution: '1080p' },
  { id: 'CAM-02', name: 'Corridor A // PTZ', location: 'West Transit Axis', status: 'ONLINE', pos: [-1.6, 0.6, 1.2], fps: 30.0, latencyMs: 18, resolution: '1080p' },
  { id: 'CAM-03', name: 'Access Checkpoint', location: 'Personnel Gate Gamma', status: 'WARNING', pos: [-0.4, 0.3, -2.4], fps: 22.4, latencyMs: 82, resolution: '720p' },
  { id: 'CAM-04', name: 'Perimeter West', location: 'Portal Delta', status: 'OFFLINE', pos: [3.4, 0.2, -1.5], fps: 0, latencyMs: null, resolution: '1080p' },
  { id: 'CAM-07', name: 'Overhead Sector A', location: 'Workspace Alpha', status: 'ONLINE', pos: [0.8, 1.1, 0.2], fps: 29.97, latencyMs: 24, resolution: '4K UHD' },
  { id: 'CAM-12', name: 'High Mast Junction', location: 'North Corridor', status: 'ONLINE', pos: [2.2, 0.8, 1.8], fps: 30.0, latencyMs: 19, resolution: '1080p' },
  { id: 'CAM-18', name: 'Transit Concourse', location: 'Central Concourse', status: 'ONLINE', pos: [1.8, 0.5, -2.8], fps: 30.0, latencyMs: 22, resolution: '1080p' },
  { id: 'CAM-21', name: 'Dock Loading Beta', location: 'Logistics Bay 4', status: 'ONLINE', pos: [-2.6, 0.3, 2.6], fps: 29.97, latencyMs: 27, resolution: '1080p' },
];

interface CameraNetwork3DProps {
  mode?: 'intro' | 'hero' | 'search';
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
  activePath?: string[]; // e.g. ['CAM-07', 'CAM-12', 'CAM-18', 'CAM-21']
  searchProgressPercent?: number;
  activeNodeIds?: string[]; // For sequential startup activation
}

export const CameraNetwork3D: React.FC<CameraNetwork3DProps> = ({
  mode = 'hero',
  selectedCameraId,
  onSelectCamera,
  activePath = ['CAM-07', 'CAM-12', 'CAM-18'],
  searchProgressPercent = 100,
  activeNodeIds,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter nodes if sequential activation is enabled
  const visibleNodes = useMemo(() => {
    if (!activeNodeIds) return DEFAULT_CAMERA_NODES;
    return DEFAULT_CAMERA_NODES.filter((n) => activeNodeIds.includes(n.id));
  }, [activeNodeIds]);

  // Connections topology between camera nodes
  const connections = useMemo(() => {
    const raw = [
      ['CAM-01', 'CAM-02'],
      ['CAM-02', 'CAM-07'],
      ['CAM-03', 'CAM-07'],
      ['CAM-07', 'CAM-12'],
      ['CAM-12', 'CAM-18'],
      ['CAM-18', 'CAM-04'],
      ['CAM-02', 'CAM-21'],
      ['CAM-21', 'CAM-12'],
    ];
    if (!activeNodeIds) return raw;
    return raw.filter(([src, tgt]) => activeNodeIds.includes(src) && activeNodeIds.includes(tgt));
  }, [activeNodeIds]);

  // Spatial node map for fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, CameraNodeData>();
    DEFAULT_CAMERA_NODES.forEach((node) => map.set(node.id, node));
    return map;
  }, []);

  // Frame tick animation for network pulses and rotating scanning radar
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (rootGroupRef.current) {
      if (mode === 'hero') {
        // Slow subtle tactical pan
        rootGroupRef.current.rotation.y = Math.sin(elapsed * 0.12) * 0.28;
      } else if (mode === 'intro') {
        // Continuous sweep in intro mode
        rootGroupRef.current.rotation.y = elapsed * 0.35;
      }
    }

    if (pulseRingRef.current) {
      const scale = 1 + ((elapsed * 1.8) % 4.5);
      pulseRingRef.current.scale.set(scale, scale, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.45 - scale * 0.08);
      }
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* 1. Tactical Ground Plane & Radar Circles */}
      <group position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Floor grid */}
        <gridHelper
          args={[14, 28, '#00e5ff', '#142033']}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        />

        {/* Concentric radar range circles */}
        {[2.5, 4.5, 6.2].map((radius, idx) => (
          <mesh key={idx} position={[0, 0, 0.01]}>
            <ringGeometry args={[radius - 0.015, radius, 64]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.12 - idx * 0.03}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* Pulsing scanning wavefront */}
        <mesh ref={pulseRingRef} position={[0, 0, 0.02]}>
          <ringGeometry args={[0.95, 1.05, 48]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 2. Connection Beams & Light Arcs between Camera Nodes */}
      {connections.map(([sourceId, targetId], idx) => {
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);
        if (!source || !target) return null;

        const isPathActive = activePath.includes(sourceId) && activePath.includes(targetId);
        const p1 = new THREE.Vector3(...source.pos);
        const p2 = new THREE.Vector3(...target.pos);
        const mid = p1.clone().lerp(p2, 0.5);
        mid.y += 0.45; // Subtle upward arc

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(24);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: isPathActive ? '#10b981' : '#00e5ff',
          transparent: true,
          opacity: isPathActive ? 0.75 : 0.22,
        });
        const lineObj = new THREE.Line(geometry, material);

        return (
          <group key={`link-${idx}`}>
            <primitive object={lineObj} />
          </group>
        );
      })}

      {/* 3. 3D Camera Nodes */}
      {visibleNodes.map((node) => {
        const isSelected = selectedCameraId === node.id;
        const isHovered = hoveredNode === node.id;
        const isConfirmed = node.status === 'CONFIRMED' || (activePath.includes(node.id) && searchProgressPercent >= 90);
        const isWarning = node.status === 'WARNING';
        const isOffline = node.status === 'OFFLINE';

        let nodeColor = '#00e5ff'; // Default Cyan
        if (isOffline) nodeColor = '#f43f5e'; // Rose / Red
        else if (isWarning) nodeColor = '#f59e0b'; // Amber
        else if (isConfirmed) nodeColor = '#10b981'; // Emerald Green
        else if (isSelected) nodeColor = '#38bdf8'; // Sky Blue

        return (
          <group
            key={node.id}
            position={node.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredNode(node.id);
            }}
            onPointerOut={() => {
              setHoveredNode(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectCamera) onSelectCamera(node.id);
            }}
          >
            {/* Core Sensor Sphere */}
            <mesh castShadow>
              <sphereGeometry args={[isHovered || isSelected ? 0.22 : 0.16, 24, 24]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isHovered || isSelected ? 1.2 : 0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {/* Vertical Mount Stanchion to Ground */}
            <mesh position={[0, -node.pos[1] / 2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, node.pos[1], 8]} />
              <meshBasicMaterial color="#1e293b" transparent opacity={0.65} />
            </mesh>

            {/* Orbiting Surveillance Sensor Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.26, 0.29, 32]} />
              <meshBasicMaterial
                color={nodeColor}
                transparent
                opacity={isHovered || isSelected ? 0.9 : 0.4}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Detection Target Reticle Bracket for Selected or Confirmed Camera */}
            {(isSelected || isConfirmed) && (
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[0.34, 0.38, 4]} />
                <meshBasicMaterial color={nodeColor} transparent opacity={0.85} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Projected ground footprint shadow */}
            <mesh position={[0, -node.pos[1] + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.05, 0.3, 16]} />
              <meshBasicMaterial color={nodeColor} transparent opacity={0.18} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
