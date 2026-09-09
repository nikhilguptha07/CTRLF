import * as THREE from 'three';

export const ScannerEffectShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#ef4444') },
    uTime: { value: 0.0 },
    uRadius: { value: 3.5 },
    uRings: { value: 3.0 },
    uSpeed: { value: 1.5 },
    uOpacity: { value: 0.8 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uRadius;
    uniform float uRings;
    uniform float uSpeed;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      // Center coordinates (-1 to 1)
      vec2 centered = (vUv - 0.5) * 2.0;
      float dist = length(centered);

      // Discard outside unit circle
      if (dist > 1.0) {
        discard;
      }

      // Expanding rings wave
      float wave = fract(dist * uRings - uTime * uSpeed);
      float ring = smoothstep(0.0, 0.08, wave) * (1.0 - smoothstep(0.08, 0.22, wave));
      
      // Outer perimeter border
      float outerBorder = smoothstep(0.92, 0.98, dist) * (1.0 - smoothstep(0.98, 1.0, dist));

      // Rotating radar sweep arm
      float angle = atan(centered.y, centered.x);
      float sweepAngle = mod(angle + uTime * 2.0, 6.2831853);
      float sweep = smoothstep(0.0, 1.2, sweepAngle) * (1.0 - dist);

      // Distance falloff from center to edge
      float edgeFalloff = 1.0 - smoothstep(0.7, 1.0, dist);

      float intensity = (ring * 1.2 + outerBorder * 1.5 + sweep * 0.4) * edgeFalloff;
      
      gl_FragColor = vec4(uColor, intensity * uOpacity);
    }
  `,
};

export function createScannerMaterial(color = '#ef4444', opacity = 0.85) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0.0 },
      uRadius: { value: 3.5 },
      uRings: { value: 3.0 },
      uSpeed: { value: 1.2 },
      uOpacity: { value: opacity },
    },
    vertexShader: ScannerEffectShader.vertexShader,
    fragmentShader: ScannerEffectShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
