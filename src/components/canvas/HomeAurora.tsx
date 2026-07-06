// src/components/canvas/HomeAurora.tsx
// Home 背景の流体オーロラ（MINAMO / ohzi 系の「コードがリアルタイムに描く」主役演出）
// domain-warped fbm + マウス軌跡トレイル（uniform 配列・FBO なしの軽量構成）
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PLANE_Z = -6
const TRAIL_N = 8
const TRAIL_LIFE = 1.6

const auroraVert = `
varying vec2 vPos;
varying vec4 vClip;
void main() {
  vPos = position.xy;
  vClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClip;
}
`

const auroraFrag = `
uniform float uTime;
uniform vec4 uTrail[${TRAIL_N}];
varying vec2 vPos;
varying vec4 vClip;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = ROT * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  float t = uTime;

  // マウス軌跡: 各サンプルが周囲の流体を押し広げ（warp）、淡く発光させる（glow）
  vec2 warp = vec2(0.0);
  float glow = 0.0;
  for (int i = 0; i < ${TRAIL_N}; i++) {
    vec4 tp = uTrail[i];
    float fade = max(1.0 - tp.z / ${TRAIL_LIFE.toFixed(1)}, 0.0);
    vec2 d = vPos - tp.xy;
    float g = exp(-dot(d, d) / 3.2) * fade * fade * tp.w;
    warp += normalize(d + 0.0001) * g;
    glow += g;
  }

  vec2 p = vPos * 0.22 + vec2(t * 0.045, t * 0.018) + warp * 0.55;

  // domain warp 2段（流体らしい絡み）
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(
    fbm(p + 1.6 * q + vec2(1.7, 9.2) + t * 0.10),
    fbm(p + 1.6 * q + vec2(8.3, 2.8) + t * 0.083)
  );
  float f = fbm(p + 1.8 * r);

  // 塗りつぶしではなく「細いリボン + ごく淡い残り火」。チョーク的な淡さを守る
  float body   = smoothstep(0.34, 0.78, f);
  float ribbon = smoothstep(0.52, 0.575, f) * (1.0 - smoothstep(0.60, 0.70, f));

  // 大きなスケールの色相ゾーン: オレンジ単色だと炎に見えるため、寒色（鋼青）の帯を混ぜて
  // 「暗い水面に流れる光」の読みに寄せる
  float hue = vnoise(p * 0.30 + vec2(9.4, 3.1) + t * 0.012);
  float warmth = smoothstep(0.40, 0.72, hue);
  vec3 emberCol  = mix(vec3(0.05, 0.11, 0.20), vec3(0.42, 0.15, 0.05), warmth);
  vec3 ribbonCol = mix(vec3(0.28, 0.44, 0.60) * 0.7, vec3(0.976, 0.451, 0.086), warmth);

  vec3 accent = vec3(0.0);
  accent += vec3(0.085, 0.13, 0.22) * smoothstep(0.15, 0.50, f) * 0.30; // 鋼青の下地
  accent += emberCol * body * 0.28;                                      // 残り火
  accent += ribbonCol * ribbon * 0.50;                                   // 光の筋
  accent += vec3(0.984, 0.749, 0.141) * ribbon * ribbon * warmth * 0.12; // 筋の芯

  // マスクはスクリーン空間で（プレーンは可視域よりはるかに大きく、plane UV では効かない）
  vec2 suv = (vClip.xy / vClip.w) * 0.5 + 0.5;
  // エネルギーはクリスタル側（画面中央やや右下）へ寄せ、四隅は暗黒へ沈める
  float focus = 1.0 - smoothstep(0.12, 0.62, length((suv - vec2(0.56, 0.42)) * vec2(1.3, 1.0)));
  accent *= 0.15 + focus * 0.90;
  // ヒーロー文字の左上は静かに保つ
  float textQuiet = smoothstep(0.45, 0.25, suv.x) * smoothstep(0.50, 0.68, suv.y);
  accent *= 1.0 - textQuiet * 0.60;

  // マウスの通り道は流体がわずかに火照る
  accent += (vec3(0.976, 0.451, 0.086) * 0.6 + vec3(0.984, 0.749, 0.141) * 0.2) * glow * 0.25;

  // 色はsRGB感覚で設計している。Composerのリニアバッファへ渡す前に変換する
  // （これを怠ると全体が白茶けて「炎と煙」になる。#0a0a0f の暗さが基準）
  vec3 col = pow(vec3(0.039, 0.039, 0.059) + accent, vec3(2.2));
  gl_FragColor = vec4(col, 1.0);
}
`

export default function HomeAurora() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { camera } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTrail: { value: Array.from({ length: TRAIL_N }, () => new THREE.Vector4(0, 0, TRAIL_LIFE, 0)) },
  }), [])

  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const slotRef = useRef(0)
  const lastSample = useRef(new THREE.Vector2(999, 999))
  const prevPoint = useRef(new THREE.Vector2(0, 0))
  const tmpVec = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value += reducedMotion ? delta * 0.08 : delta

    const trail = matRef.current.uniforms.uTrail.value as THREE.Vector4[]
    for (const tp of trail) tp.z += delta

    if (reducedMotion) return

    // ポインタを z=PLANE_Z の平面へ投影 → ワールド座標のトレイルサンプル
    const v = tmpVec.current.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera)
    v.sub(camera.position).normalize()
    if (Math.abs(v.z) < 0.001) return
    const dist = (PLANE_Z - camera.position.z) / v.z
    const wx = camera.position.x + v.x * dist
    const wy = camera.position.y + v.y * dist

    const speed = Math.hypot(wx - prevPoint.current.x, wy - prevPoint.current.y) / (delta + 0.001)
    prevPoint.current.set(wx, wy)

    // 一定距離動くごとに ring buffer へ記録（静止中は追加しない＝軌跡として残る）
    if (lastSample.current.distanceTo(prevPoint.current) > 0.45) {
      lastSample.current.set(wx, wy)
      const strength = THREE.MathUtils.clamp(speed * 0.06, 0.3, 1.0)
      trail[slotRef.current].set(wx, wy, 0, strength)
      slotRef.current = (slotRef.current + 1) % TRAIL_N
    }
  })

  return (
    <mesh position={[0, 0, PLANE_Z]} renderOrder={-2} raycast={() => null}>
      <planeGeometry args={[80, 40]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={auroraVert}
        fragmentShader={auroraFrag}
        depthWrite={false}
      />
    </mesh>
  )
}
