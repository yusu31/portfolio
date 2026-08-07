// 道そのもの。**PR 1 の暫定実装**で、B の `roadSurface.ts`(白線・マンホール・横断歩道を
// 150件以上置く本体)は PR 2 で移植する。ここでは「下り坂が読めること」だけを引き受ける。
//
// 作り方の要点は**色を頂点に焼くこと**(B の設計判断2)。
// パレットは `t` の関数なので、リボンの各断面で `paletteAt(t)` を引いて頂点色に入れておけば、
// 毎フレーム材質を書き換えなくても「道を進むと朝から夜へ空間的に移り変わる」が成立する。
//
// ⚠ 縁石(`CURB_HEIGHT = 0.16` → 0 へ導入フェーズで smootherstep)は §1.2 装置2 の本体だが、
//   フェーズごとの出し分けは PR 3(開口)の担当。ここではまだ平坦。
import { useMemo } from 'react'
import * as THREE from 'three'
import { FACADE_X, ROAD_END, ROAD_HALF, ROAD_START, roadPoint } from './route'
import { paletteAt, shadeHex } from './palette'

/** 断面の刻み。カーブとうねりを折らずに拾える程度に細かく取る */
const SEGMENT = 2

/**
 * 地面リボンの半幅。フォグに完全に溶ける位置まで伸ばして、
 * **横方向の切れ端が地平に見えない**ようにする(最大 `fogFar` は Noon の 220 で、
 * そこでの画面端は 0.8329 × 220 = 183)
 */
const GROUND_HALF = 200

type Tone = 'ground' | 'sidewalk' | 'road'

type Lane = { from: number; to: number; tone: Tone }

/**
 * 道の断面。内側から外側へ、色の変わる境界で分ける(境界を跨いで頂点色を混ぜないため)。
 *
 * **路面と地面を別メッシュに分けているのは影のため**。キーライトのシャドウカメラは
 * 主役の周り ±34 しか覆っていないのに対し、地面は ±200 まで伸びる。
 * 覆われていない範囲でシャドウマップを引くと縁のテクセルを拾うだけで、得るものが無い。
 * **球の影が要るのは路面の上だけ**なので、地面は `receiveShadow` を外す
 */
const SURFACE_LANES: readonly Lane[] = [
  { from: -FACADE_X, to: -ROAD_HALF, tone: 'sidewalk' },
  { from: -ROAD_HALF, to: ROAD_HALF, tone: 'road' },
  { from: ROAD_HALF, to: FACADE_X, tone: 'sidewalk' },
]

const GROUND_LANES: readonly Lane[] = [
  { from: -GROUND_HALF, to: -FACADE_X, tone: 'ground' },
  { from: FACADE_X, to: GROUND_HALF, tone: 'ground' },
]

function toneColor(tone: Tone, t: number): THREE.Color {
  const p = paletteAt(t)
  // 地面はパレットの色から導出する。別の色を持ち込まないので画面の色数が増えない
  if (tone === 'ground') return new THREE.Color(shadeHex(p.sidewalk, -0.14))
  return new THREE.Color(tone === 'road' ? p.road : p.sidewalk)
}

function buildRibbon(lanes: readonly Lane[]): THREE.BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const steps = Math.ceil((ROAD_END - ROAD_START) / SEGMENT)

  for (const lane of lanes) {
    const base = positions.length / 3
    for (let i = 0; i <= steps; i++) {
      const t = ROAD_START + i * SEGMENT
      const left = roadPoint(t, lane.from)
      const right = roadPoint(t, lane.to)
      positions.push(left[0], left[1], left[2], right[0], right[1], right[2])

      const c = toneColor(lane.tone, t)
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
    }
    for (let i = 0; i < steps; i++) {
      const a = base + i * 2
      // 上向き法線になる巻き方(路面を上から見て反時計回り)
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export default function CityRoad() {
  // 世界は静的なので1回だけ作る。パレットは頂点に焼いてあるので毎フレームの更新が要らない
  const surface = useMemo(() => buildRibbon(SURFACE_LANES), [])
  const ground = useMemo(() => buildRibbon(GROUND_LANES), [])
  return (
    <>
      {/* 車道と歩道。球の影が落ちるのはここだけ */}
      <mesh geometry={surface} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {/* 遠くまで伸びる地面。シャドウマップの縁を拾わないよう影は受けない */}
      <mesh geometry={ground}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
    </>
  )
}
