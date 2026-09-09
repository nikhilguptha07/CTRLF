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
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 8.0;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6.0;

      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.0012;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0008 + 0.0004; // slow upward buoyancy
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0012;
    }

    return [pos, vel];
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    if (!posAttr) return;

    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 0] += velocities[i * 3 + 0];
      posArr[i * 3 + 1] += velocities[i * 3 + 1];
      posArr[i * 3 + 2] += velocities[i * 3 + 2];

      if (posArr[i * 3 + 0] > 4.0) posArr[i * 3 + 0] = -4.0;
      if (posArr[i * 3 + 0] < -4.0) posArr[i * 3 + 0] = 4.0;
      if (posArr[i * 3 + 1] > 2.8) posArr[i * 3 + 1] = -2.5;
      if (posArr[i * 3 + 1] < -2.5) posArr[i * 3 + 1] = 2.8;
      if (posArr[i * 3 + 2] > 3.0) posArr[i * 3 + 2] = -3.0;
      if (posArr[i * 3 + 2] < -3.0) posArr[i * 3 + 2] = 3.0;
    }

    posAttr.needsUpdate = true;
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
