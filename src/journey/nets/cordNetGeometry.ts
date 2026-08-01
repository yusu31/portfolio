// 平面パネルを張り合わせた「コード実体」ネットのジオメトリ生成(純粋モジュール)。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §4
// サッカー/バレーのネットはボールが接触しないため物理を持たない。そのぶんインスタンス行列を
// 毎フレーム更新する必要がないので、バスケネット(InstancedMesh)とは別方式で
// **全コードを1つのBufferGeometryにマージした静的メッシュ**にする。動きは頂点シェーダーの風だけ。
//
// コード1本 = 端面なしの角柱。半透明の板にアルファのネット模様を貼る方式を採らないのは、
// バスケネットで実証済みの理由(厚みと自己陰影が無いとチープに見える)がここでも効くため。
// サッカーゴールにはチェイスカメラがクロスバーの3.40ユニットまで接近する。
import * as THREE from 'three'

/** 四隅の双線形補間で格子を張る1枚のネット面。corners は (u,v)=(0,0),(1,0),(1,1),(0,1) の順 */
export interface CordNetPanel {
  corners: readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]
  /** u方向(corners[0]→corners[1])の分割数 */
  segU: number
  /** v方向(corners[0]→corners[3])の分割数 */
  segV: number
}

/** 風の重み計算に使うフレーム(=ネットが固定される剛体)の線分 */
export type FrameSegment = readonly [THREE.Vector3, THREE.Vector3]

export interface CordNetSpec {
  panels: readonly CordNetPanel[]
  /** コード(角柱)の半径 */
  cordRadius: number
  /** 断面の角数。6で1本あたり12三角形 */
  sides?: number
  /** 結び目位置 → 風の重み(0=フレームに固定、1=自由端) */
  windWeightAt: (p: THREE.Vector3) => number
}

/** 断面の既定角数。設計書§4.2の三角形数見積り(コード1本=12三角形)と一致する */
const DEFAULT_SIDES = 6

/**
 * パネル1枚の結び目位置。行優先((segV+1) × (segU+1))で返す。
 *
 * 四隅の双線形補間にしているのは、サッカーゴールの背面が「クロスバー上端から地面へ向かって
 * 後ろへ倒れる」台形になるため。矩形専用にすると背面パネルだけ別扱いが必要になる
 */
export function panelKnots(panel: CordNetPanel): THREE.Vector3[] {
  const [c00, c10, c11, c01] = panel.corners
  const knots: THREE.Vector3[] = []
  for (let j = 0; j <= panel.segV; j++) {
    const v = j / panel.segV
    for (let i = 0; i <= panel.segU; i++) {
      const u = i / panel.segU
      // 下辺(v=0)と上辺(v=1)をそれぞれu補間し、その2点をv補間する
      const bottom = c00.clone().lerp(c10, u)
      const top = c01.clone().lerp(c11, u)
      knots.push(bottom.lerp(top, v))
    }
  }
  return knots
}

/** 位置の量子化キー。パネル境界で共有される結び目・コードの重複検出に使う */
function knotKey(p: THREE.Vector3): string {
  return `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)},${Math.round(p.z * 1000)}`
}

/**
 * 全パネルのコード(格子の辺)を、パネル境界の重複を除いて返す。
 *
 * サッカーゴールのケージは天面・背面・側面2枚が辺を共有しており、パネルごとに素朴に
 * 辺を出すと共有辺のコードが二重に生える(完全に同じ位置なので見た目には出ないが無駄)。
 * 端点ペアのキーで一意化する。共有辺で結び目位置が一致するよう、隣接パネルの
 * 分割数は呼び出し側(goalNets.ts)で揃えている
 */
export function cordNetSegments(panels: readonly CordNetPanel[]): [THREE.Vector3, THREE.Vector3][] {
  const cords: [THREE.Vector3, THREE.Vector3][] = []
  const seen = new Set<string>()

  const push = (a: THREE.Vector3, b: THREE.Vector3) => {
    const ka = knotKey(a)
    const kb = knotKey(b)
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
    if (seen.has(key)) return
    seen.add(key)
    cords.push([a, b])
  }

  for (const panel of panels) {
    const knots = panelKnots(panel)
    const stride = panel.segU + 1
    for (let j = 0; j <= panel.segV; j++) {
      for (let i = 0; i <= panel.segU; i++) {
        const here = knots[j * stride + i]
        if (i < panel.segU) push(here, knots[j * stride + i + 1])
        if (j < panel.segV) push(here, knots[(j + 1) * stride + i])
      }
    }
  }
  return cords
}

/**
 * フレームからの距離で風の重みを決める関数を作る。
 *
 * パネルごとの(u,v)から重みを出すと**共有辺で重みが食い違ってネットが裂ける**ため、
 * 重みは必ず「位置の関数」にする。こうすると天面と側面の共有辺は同じ重みになり、
 * 風で変位しても継ぎ目が開かない
 */
export function frameDistanceWeight(
  segments: readonly FrameSegment[],
  reach: number
): (p: THREE.Vector3) => number {
  const ab = new THREE.Vector3()
  const ap = new THREE.Vector3()
  const closest = new THREE.Vector3()
  return (p: THREE.Vector3) => {
    let nearest = Infinity
    for (const [a, b] of segments) {
      ab.subVectors(b, a)
      const t = THREE.MathUtils.clamp(ap.subVectors(p, a).dot(ab) / ab.lengthSq(), 0, 1)
      const d = p.distanceTo(closest.copy(a).addScaledVector(ab, t))
      if (d < nearest) nearest = d
    }
    return THREE.MathUtils.smoothstep(nearest, 0, reach)
  }
}

/** ジオメトリ規模の内訳(パフォーマンス予算のテスト用) */
export interface CordNetStats {
  cords: number
  vertices: number
  triangles: number
}

/** 仕様からジオメトリを作らずに規模だけ求める */
export function cordNetStats(spec: CordNetSpec): CordNetStats {
  const sides = spec.sides ?? DEFAULT_SIDES
  const cords = cordNetSegments(spec.panels).length
  return { cords, vertices: cords * sides * 2, triangles: cords * sides * 2 }
}

const UP_Y = new THREE.Vector3(0, 1, 0)
const UP_X = new THREE.Vector3(1, 0, 0)

/**
 * 全コードを1本の角柱としてマージしたBufferGeometryを作る。
 *
 * 各コードは両端を半径ぶん伸ばしてある。結び目に球を置かなくても交差部の隙間が
 * 埋まるため(バスケネットは変形するので結び目球が要るが、こちらは静的なので伸ばすだけで足りる)。
 * 頂点には `windWeight` 属性を焼き込み、頂点シェーダーが変位の振幅に掛ける
 */
export function buildCordNetGeometry(spec: CordNetSpec): THREE.BufferGeometry {
  const sides = spec.sides ?? DEFAULT_SIDES
  const cords = cordNetSegments(spec.panels)

  const vertexCount = cords.length * sides * 2
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const weights = new Float32Array(vertexCount)
  const indices = new Uint32Array(cords.length * sides * 6)

  const dir = new THREE.Vector3()
  const side1 = new THREE.Vector3()
  const side2 = new THREE.Vector3()
  const startPoint = new THREE.Vector3()
  const endPoint = new THREE.Vector3()
  const offset = new THREE.Vector3()

  let vi = 0
  let ii = 0
  for (const [a, b] of cords) {
    dir.subVectors(b, a)
    const length = dir.length() || 1
    dir.divideScalar(length)
    // 軸に平行でない基準ベクトルを選んで直交基底を作る
    side1.crossVectors(dir, Math.abs(dir.y) < 0.9 ? UP_Y : UP_X).normalize()
    side2.crossVectors(dir, side1)
    // 結び目の隙間埋め: 交差する相手のコードの向こう側まで届くよう半径ぶん伸ばす
    startPoint.copy(a).addScaledVector(dir, -spec.cordRadius)
    endPoint.copy(b).addScaledVector(dir, spec.cordRadius)
    // 重みは伸ばす前の結び目位置で評価する。隣接コードと同じ値になり継ぎ目が開かない
    const wa = spec.windWeightAt(a)
    const wb = spec.windWeightAt(b)

    const base = vi / 3
    for (let k = 0; k < sides; k++) {
      const angle = (k / sides) * Math.PI * 2
      offset
        .copy(side1)
        .multiplyScalar(Math.cos(angle) * spec.cordRadius)
        .addScaledVector(side2, Math.sin(angle) * spec.cordRadius)
      const nx = offset.x / spec.cordRadius
      const ny = offset.y / spec.cordRadius
      const nz = offset.z / spec.cordRadius

      positions[vi] = startPoint.x + offset.x
      positions[vi + 1] = startPoint.y + offset.y
      positions[vi + 2] = startPoint.z + offset.z
      positions[vi + 3] = endPoint.x + offset.x
      positions[vi + 4] = endPoint.y + offset.y
      positions[vi + 5] = endPoint.z + offset.z
      normals[vi] = nx
      normals[vi + 1] = ny
      normals[vi + 2] = nz
      normals[vi + 3] = nx
      normals[vi + 4] = ny
      normals[vi + 5] = nz
      weights[base + k * 2] = wa
      weights[base + k * 2 + 1] = wb
      vi += 6
    }

    // 面の巻き方向: (A_k, A_k+1, B_k) で法線が外向き(offset方向)になる
    for (let k = 0; k < sides; k++) {
      const next = (k + 1) % sides
      const a0 = base + k * 2
      const b0 = a0 + 1
      const a1 = base + next * 2
      const b1 = a1 + 1
      indices[ii] = a0
      indices[ii + 1] = a1
      indices[ii + 2] = b0
      indices[ii + 3] = a1
      indices[ii + 4] = b1
      indices[ii + 5] = b0
      ii += 6
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('windWeight', new THREE.BufferAttribute(weights, 1))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}
