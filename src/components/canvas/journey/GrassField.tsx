import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, MathUtils, ShaderMaterial, DoubleSide } from 'three'

interface GrassFieldProps {
  count?: number
  spreadX?: number
  spreadZ?: number
  position?: [number, number, number]
}

const vertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float windPhase = uTime * 2.0 + (instanceMatrix[3][0] + instanceMatrix[3][2]) * 0.5;
    float bend = sin(windPhase) * 0.15 * uv.y;
    pos.x += bend;
    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
  }
`

const fragmentShader = `
  varying vec2 vUv;
  void main() {
    vec3 base = mix(vec3(0.05, 0.18, 0.06), vec3(0.25, 0.55, 0.2), vUv.y);
    gl_FragColor = vec4(base, 1.0);
  }
`

export default function GrassField({
  count = 6000,
  spreadX = 18,
  spreadZ = 36,
  position = [0, -1.8, -10],
}: GrassFieldProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader,
        fragmentShader,
        side: DoubleSide,
      }),
    [],
  )

  // useMemoはマウント前（refアタッチ前）に実行されるため、
  // ref経由でメッシュに書き込む初期化はuseEffectで行う（マウント後に1回だけ実行）。
  // 注意: InstancedMeshのバッファサイズはargsのcountでマウント時に固定されるため、
  // count propを後から変更してもバッファは再確保されない（呼び出し側でkeyを変えて再マウントする必要がある）。
  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        MathUtils.randFloatSpread(spreadX),
        0,
        MathUtils.randFloatSpread(spreadZ),
      )
      dummy.rotation.y = Math.random() * Math.PI
      dummy.scale.setScalar(MathUtils.randFloat(0.6, 1.1))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count, spreadX, spreadZ, dummy])

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={position}>
      <planeGeometry args={[0.05, 0.35]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
