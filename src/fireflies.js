import * as THREE from "three";

/** Drifting glowy fireflies rendered as a shader-driven point cloud. */
export function buildFireflies({ count = 42, area = 11, height = 5 } = {}) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const offsets = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * area;
    positions[i * 3 + 1] = 0.5 + Math.random() * height;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area;
    scales[i] = 0.6 + Math.random() * 1.2;
    offsets[i] = Math.random() * 20;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uSize: { value: 120 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSize;
      attribute float aScale;
      attribute float aOffset;
      varying float vTwinkle;

      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.6 + aOffset) * 0.35;
        p.x += cos(uTime * 0.35 + aOffset * 1.7) * 0.4;
        p.z += sin(uTime * 0.4 + aOffset * 0.9) * 0.4;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * uPixelRatio / -mv.z;

        vTwinkle = 0.55 + 0.45 * sin(uTime * 2.2 + aOffset * 3.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float glow = pow(1.0 - smoothstep(0.0, 0.5, d), 2.5);
        vec3 color = mix(vec3(1.0, 0.72, 0.35), vec3(1.0, 0.9, 0.6), vTwinkle);
        gl_FragColor = vec4(color, glow * vTwinkle * uOpacity);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    update(t) {
      material.uniforms.uTime.value = t;
    },
    setOpacity(v) {
      material.uniforms.uOpacity.value = v;
      points.visible = v > 0.02;
    },
    onResize() {
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    },
  };
}
