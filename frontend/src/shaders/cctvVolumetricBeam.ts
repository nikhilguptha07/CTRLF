import * as THREE from 'three';

export const CCTVVolumetricBeamShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#ffffff') },
    uCoreColor: { value: new THREE.Color('#ffffff') },
    uIntensity: { value: 2.5 },
    uFalloff: { value: 1.8 },
    uTime: { value: 0.0 },
    uBeamProgress: { value: 1.0 }, // 0 to 1 for beam burst / fade
    uApexFade: { value: 0.15 },
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
      
      // In CylinderGeometry with apex at top (uv.y = 1)
      vDistance = 1.0 - uv.y;
      
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uCoreColor;
    uniform float uIntensity;
    uniform float uFalloff;
    uniform float uTime;
    uniform float uBeamProgress;
    uniform float uApexFade;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDistance;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    void main() {
      if (uBeamProgress <= 0.001 || vDistance > uBeamProgress) {
        discard;
      }

      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // 1. Fresnel Rim: soft edge halo
      float rim = 1.0 - abs(dot(viewDir, vNormal));
      rim = pow(rim, 2.2);

      // 2. Distance Falloff: smooth exponential dissipation
      float distRatio = vDistance / max(uBeamProgress, 0.001);
      float distFade = pow(clamp(1.0 - distRatio, 0.0, 1.0), uFalloff);
      
      // Soft base boundary
      float baseCutoff = smoothstep(1.0, 0.65, distRatio);

      // 3. Dense apex flare near lens
      float apexGlow = pow(clamp(1.0 - (vDistance * 4.0), 0.0, 1.0), 2.5);

      // 4. Subtle atmospheric dust shimmer
      float n = noise(vec2(vUv.x * 6.0, vUv.y * 10.0 - uTime * 0.4));
      float shimmer = 0.95 + 0.10 * n;

      // 5. Translucent Atmospheric Alpha (Capped for realism - never opaque projector beam)
      float alpha = (distFade * 0.28 + rim * 0.25 + apexGlow * 0.40) * baseCutoff * uIntensity * shimmer * uBeamProgress;
      alpha = clamp(alpha, 0.0, 0.30);

      // 6. Color blend: base beam color to subtle soft white core at lens
      vec3 finalColor = mix(uColor, uCoreColor, apexGlow * 0.5 + rim * 0.15);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createCCTVVolumetricBeamMaterial(
  color = '#ffffff',
  intensity = 2.5,
  coreColor = '#ffffff'
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uCoreColor: { value: new THREE.Color(coreColor) },
      uIntensity: { value: intensity },
      uFalloff: { value: 1.6 },
      uTime: { value: 0.0 },
      uBeamProgress: { value: 1.0 },
      uApexFade: { value: 0.15 },
    },
    vertexShader: CCTVVolumetricBeamShader.vertexShader,
    fragmentShader: CCTVVolumetricBeamShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
