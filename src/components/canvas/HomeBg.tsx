// src/components/canvas/HomeBg.tsx
import { useRef, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import Effects from './Effects'
import HomeAurora from './HomeAurora'

const rippleVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const rippleFrag = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 c = vUv - 0.5;
  float d = length(c);

  float w1 = sin(d * 24.0 - uTime * 2.1)  * 1.0;
  float w2 = sin(d * 14.0 - uTime * 1.35) * 0.55;
  float w3 = sin(d *  8.0 - uTime * 0.85) * 0.35;
  float wave = (w1 + w2 + w3) / 1.9 * 0.5 + 0.5;

  float fade = smoothstep(0.5, 0.02, d);
  float alpha = wave * fade * 0.14;

  vec3 color = vec3(0.98, 0.45, 0.09);
  gl_FragColor = vec4(color, alpha);
}
`

function GroundRipple() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3.5, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={rippleVert}
        fragmentShader={rippleFrag}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default function HomeBg() {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />

      <Environment preset="sunset" resolution={64} />

      <ambientLight intensity={0.06} />
      <pointLight position={[4, 5, 5]} intensity={35} color="#fff5e0" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#fb923c" />
      <pointLight position={[0, 4, -5]} intensity={18} color="#c0d8ff" />
      <pointLight position={[2, -5, -3]} intensity={20} color="#ffd090" />

      <CameraRig />
      <HomeAurora />
      <GroundRipple />
      <Effects />
    </>
  )
}
