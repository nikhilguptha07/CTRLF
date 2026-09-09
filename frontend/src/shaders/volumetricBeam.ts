import * as THREE from 'three';

export const VolumetricBeamShader = {
  uniforms: {
    uColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    uIntensity: { value: 1.8 },
    uFalloff: { value: 1.6 },
    uTime: { value: 0.0 },
    uNoiseScale: { value: 2.5 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDistance;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      
      // In Three.js CylinderGeometry, uv.y is 1.0 at the apex (lens) and 0.0 at the wide base.
      // We invert it so vDistance = 0.0 at the apex and 1.0 at the floor.
      vDistance = 1.0 - uv.y;
      
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uFalloff;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDistance;

    void main() {
      // View direction in world space
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Fresnel rim: soft luminous edge along the cone boundary
      float rim = 1.0 - abs(dot(viewDir, vNormal));
      rim = pow(rim, 1.8);

      // Distance attenuation: bright at apex, smoothly diminishing to zero at base
      float distanceFade = pow(clamp(1.0 - vDistance, 0.0, 1.0), uFalloff);
      // Soft base boundary to avoid sharp circular mesh cutoff
      float baseCutoff = smoothstep(1.0, 0.7, vDistance);

      // Intense focused optical glow right at the camera lens
      float apexGlow = pow(clamp(1.0 - (vDistance * 3.5), 0.0, 1.0), 2.0);

      // Subtle atmospheric dust shimmer
      float shimmer = 0.94 + 0.06 * sin(uTime * 3.5 + vDistance * 12.0);

      // Balanced composite alpha that maintains beautiful translucency
      float beamAlpha = (distanceFade * 0.28 + rim * 0.24 + apexGlow * 0.45) * baseCutoff * uIntensity * shimmer;
      beamAlpha = clamp(beamAlpha, 0.0, 0.65);

      // White-hot core color shift at the apex
      vec3 finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), apexGlow * 0.7);

      gl_FragColor = vec4(finalColor, beamAlpha);
    }
  `,
};

export function createVolumetricBeamMaterial(color = '#ffffff', intensity = 1.8) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uFalloff: { value: 1.5 },
      uTime: { value: 0.0 },
      uNoiseScale: { value: 2.5 },
    },
    vertexShader: VolumetricBeamShader.vertexShader,
    fragmentShader: VolumetricBeamShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

