import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { referenceCalibration } from '../../config/referenceCalibration';

interface VolumetricDustParticlesProps {
  beamApex?: [number, number, number];
}

export const VolumetricDustParticles: React.FC<VolumetricDustParticlesProps> = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { count, size, opacity } = referenceCalibration.particles;

  // Generate subtle atmospheric dust particles
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 8.0;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6.0;
    }

    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.012;
    pointsRef.current.position.y = Math.sin(t * 0.35) * 0.06;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color="#e2e8f0"
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
