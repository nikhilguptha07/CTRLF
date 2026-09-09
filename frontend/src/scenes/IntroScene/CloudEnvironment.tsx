import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CloudClusterProps {
  position: [number, number, number];
  scale: [number, number, number];
  speed?: number;
}

// Organic puffy cloud cluster made of overlapping soft spheres
const CloudCluster: React.FC<CloudClusterProps> = ({
  position,
  scale,
  speed = 0.25,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const initialPos = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * speed;
    groupRef.current.position.y = initialPos.y + Math.sin(t) * 0.08;
    groupRef.current.position.x = initialPos.x + Math.cos(t * 0.7) * 0.05;
  });

  const puffData = useMemo(() => [
    { pos: [0, 0, 0], r: 1.0 },
    { pos: [-0.65, -0.1, 0.1], r: 0.75 },
    { pos: [0.7, -0.12, 0.1], r: 0.78 },
    { pos: [-0.25, 0.45, -0.1], r: 0.68 },
    { pos: [0.35, 0.4, -0.05], r: 0.72 },
    { pos: [0.1, -0.25, 0.2], r: 0.65 },
  ], []);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {puffData.map((puff, i) => (
        <mesh key={i} position={puff.pos as [number, number, number]} castShadow receiveShadow>
          <sphereGeometry args={[puff.r, 32, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.92}
            metalness={0.02}
          />
        </mesh>
      ))}
    </group>
  );
};

// Standing Neon Rounded-Rectangle Tube Frame
const StandingNeonFrame: React.FC<{ position: [number, number, number]; scale: [number, number, number] }> = ({ position, scale }) => {
  const points = useMemo(() => {
    // Generate rounded rectangle path
    const w = 1.6;
    const h = 2.6;
    const r = 0.35;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const pts = shape.getPoints(50);
    return pts.map(p => new THREE.Vector3(p.x, p.y, 0));
  }, []);

  const tubeCurve = useMemo(() => new THREE.CatmullRomCurve3(points, true), [points]);

  return (
    <group position={position} scale={scale}>
      <mesh>
        <tubeGeometry args={[tubeCurve, 64, 0.038, 12, true]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={2.6}
          roughness={0.1}
        />
      </mesh>
      {/* Outer soft glow tube */}
      <mesh>
        <tubeGeometry args={[tubeCurve, 64, 0.08, 12, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// Curved Frosted Glass Panel in Foreground
const ForegroundGlassPanel: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; size?: [number, number] }> = ({
  position,
  rotation = [0, 0, 0],
  size = [1.5, 1.8],
}) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[size[0], size[1]]} />
        <meshPhysicalMaterial
          color="#e6eef8"
          roughness={0.12}
          metalness={0.05}
          transmission={0.88}
          thickness={0.6}
          transparent
          opacity={0.65}
          ior={1.5}
        />
      </mesh>
      {/* Subtle beveled border highlight */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(size[0], size[1])]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.6} linewidth={2} />
      </lineSegments>
    </group>
  );
};

// Floating Beveled Glass Plate in background
const FloatingGlassPlate: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; size?: [number, number, number] }> = ({
  position,
  rotation = [0, 0, 0],
  size = [1.2, 1.2, 0.08],
}) => {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshPhysicalMaterial
        color="#f0f5ff"
        roughness={0.1}
        metalness={0.05}
        transmission={0.85}
        thickness={0.8}
        transparent
        opacity={0.6}
        ior={1.52}
      />
    </mesh>
  );
};

// Hexagonal / Polygonal Elevated Floor Podium Slab
const StudioPodium: React.FC<{ position: [number, number, number]; scale?: [number, number, number] }> = ({
  position,
  scale = [1, 1, 1],
}) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[4.8, 5.2, 0.35, 6]} />
        <meshStandardMaterial
          color="#f4f7fb"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* Subtle top border inset */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[4.4, 4.6, 0.04, 6]} />
        <meshStandardMaterial
          color="#e8eef6"
          roughness={0.75}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
};

// Subtle 4-pointed Star Sparkle
const SparkleStar: React.FC<{ position: [number, number, number]; scale?: number; color?: string; opacity?: number }> = ({
  position,
  scale = 0.25,
  color = '#ffffff',
  opacity = 0.7,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const s = scale * (0.85 + Math.sin(t * 3.0) * 0.15);
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Vertical diamond */}
      <mesh>
        <planeGeometry args={[0.2, 1.0]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      {/* Horizontal diamond */}
      <mesh>
        <planeGeometry args={[1.0, 0.2]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      {/* Center glowing core */}
      <mesh>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 1.2} />
      </mesh>
    </group>
  );
};

export const CloudEnvironment: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetRotX = mouse.y * 0.03;
    const targetRotY = mouse.x * 0.04;
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 3, delta);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3, delta);
  });

  return (
    <group ref={groupRef}>
      {/* Soft Studio Lighting */}
      <ambientLight intensity={1.9} color="#f8fafc" />
      <directionalLight
        position={[4, 6, 5]}
        intensity={2.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-5, -2, 3]}
        intensity={0.9}
        color="#e0e7ff"
      />
      <pointLight position={[0, 1, 3]} intensity={0.6} color="#f1f5f9" />

      {/* 1. Standing Neon Rounded Frame in Left Background */}
      <StandingNeonFrame position={[-4.2, 0.8, -3.2]} scale={[1.65, 1.7, 1]} />

      {/* 2. Floating Beveled Glass Plate in Right Background */}
      <FloatingGlassPlate position={[4.6, 2.2, -3.0]} rotation={[0.1, -0.2, 0.1]} size={[1.1, 1.1, 0.06]} />

      {/* 3. Studio Podium Slab beneath the dashboard */}
      <StudioPodium position={[0, -2.45, -0.5]} scale={[1.3, 0.8, 1.2]} />

      {/* 4. Clay Cloud Clusters (left, right, top-center) */}
      <CloudCluster position={[-4.6, 0.45, -1.2]} scale={[1.4, 1.1, 1.1]} speed={0.2} />
      <CloudCluster position={[4.5, 0.75, -1.1]} scale={[1.5, 1.15, 1.15]} speed={0.18} />
      <CloudCluster position={[2.6, 2.5, -3.8]} scale={[1.8, 1.2, 1.3]} speed={0.15} />
      <CloudCluster position={[-5.8, 2.0, -4.5]} scale={[1.6, 1.1, 1.1]} speed={0.22} />

      {/* 5. Curved Frosted Glass Foreground Shields (Left & Right) */}
      <ForegroundGlassPanel position={[-4.4, -1.25, 1.8]} rotation={[0, 0.25, 0]} size={[1.7, 1.8]} />
      <ForegroundGlassPanel position={[4.2, -1.3, 1.8]} rotation={[0, -0.25, 0]} size={[1.7, 1.8]} />

      {/* 6. Subtle Star Sparkles */}
      <SparkleStar position={[5.2, -1.8, 1.2]} scale={0.22} opacity={0.65} />
      <SparkleStar position={[-5.4, 2.8, -2.5]} scale={0.18} opacity={0.45} />
    </group>
  );
};
