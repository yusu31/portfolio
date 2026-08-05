// 路面と路面マーキング。共通原則3「地面に情報を乗せる」の実装。
//
// A では地面が平らな正方形だったので Canvas に描いてテクスチャとして焼けたが、
// B の道は**曲がるうえに傾く**ので同じ手は使えない。
// そこで路面そのものを道に沿ったリボンとして生成し、白線・マンホールも
// 道の座標系(`t`, `lateral`)で持って、四角形をその場で解いて1つのジオメトリに合流させる。
// 道の式(`route.ts` の `elevationAt` / `lateralAt`)を変えても配置データを作り直さなくてよい。
//
// 参考例①で地面に乗っていたのは「道路の白線・マンホール」。そのまま項目にしてある。
import { FACADE_X, LEGS, ROAD_END, ROAD_HALF, ROAD_START, legStart, roadPoint } from './route'

/** 縁石の高さ。歩道をこのぶん持ち上げて、道との段差を作る */
export const CURB_HEIGHT = 0.16

/** 道の座標から3D座標を解く関数の型。テストで平坦なダミーに差し替えられるようにしてある */
export type RoadSampler = (t: number, lateral: number) => [number, number, number]

const defaultSampler: RoadSampler = (t, lateral) => roadPoint(t, lateral)

export type StripGeometryData = {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

/**
 * 道に沿った帯(リボン)のジオメトリを作る。
 * 車道・左右の歩道・縁石の立ち上がりを、すべてこの1つの関数で作れるように
 * 内側と外側それぞれに「横位置」と「持ち上げ量」を取る
 */
export function buildStrip(
  innerOffset: number,
  innerLift: number,
  outerOffset: number,
  outerLift: number,
  segments: number,
  start: number = ROAD_START,
  end: number = ROAD_END,
  sampler: RoadSampler = defaultSampler
): StripGeometryData {
  const n = Math.max(1, Math.floor(segments))
  const span = end - start
  const rows = n + 1
  const positions = new Float32Array(rows * 2 * 3)
  const normals = new Float32Array(rows * 2 * 3)
  const uvs = new Float32Array(rows * 2 * 2)
  const indices = new Uint32Array(n * 6)

  for (let i = 0; i < rows; i++) {
    const t = start + (i / n) * span
    const a = sampler(t, innerOffset)
    const b = sampler(t, outerOffset)
    const base = i * 6
    positions[base] = a[0]
    positions[base + 1] = a[1] + innerLift
    positions[base + 2] = a[2]
    positions[base + 3] = b[0]
    positions[base + 4] = b[1] + outerLift
    positions[base + 5] = b[2]

    // 縁石の立ち上がりだけは垂直面なので法線を横向きにする。
    // 上向きのままだと段差に光が当たらず、段があることが読めない。
    // 道は曲がるのでワールドX固定にはできず、その地点の横方向を実際に測って使う
    const vertical = Math.abs(outerOffset - innerOffset) < 1e-6
    let nx = 0
    let ny = 1
    let nz = 0
    if (vertical) {
      const center = sampler(t, 0)
      const dx = a[0] - center[0]
      const dz = a[2] - center[2]
      const len = Math.hypot(dx, dz) || 1
      nx = dx / len
      ny = 0
      nz = dz / len
    }
    for (const o of [base, base + 3]) {
      normals[o] = nx
      normals[o + 1] = ny
      normals[o + 2] = nz
    }

    const uvBase = i * 4
    uvs[uvBase] = 0
    uvs[uvBase + 1] = t
    uvs[uvBase + 2] = 1
    uvs[uvBase + 3] = t
  }

  for (let i = 0; i < n; i++) {
    const v = i * 2
    const o = i * 6
    indices[o] = v
    indices[o + 1] = v + 1
    indices[o + 2] = v + 2
    indices[o + 3] = v + 1
    indices[o + 4] = v + 3
    indices[o + 5] = v + 2
  }

  return { positions, normals, uvs, indices }
}

/** 路面マーキング1つ。すべて道の座標系で持つので、坂でもカーブでも追従する */
export type RoadMark = {
  /** 道に沿った中心位置 */
  t: number
  /** 道の中心からの符号つき横位置 */
  lateral: number
  /** 道に沿った長さ */
  length: number
  /** 横幅 */
  width: number
  kind: 'dash' | 'edge' | 'crosswalk' | 'stop' | 'manhole' | 'patch'
}

/** 暗いマーキング(マンホール・補修跡)かどうか。描画側で色を分けるための判定 */
export function isDarkMark(kind: RoadMark['kind']): boolean {
  return kind === 'manhole' || kind === 'patch'
}

/**
 * 路面マーキングを全部生成する。
 *
 * **件数がそのまま「地面の情報量」**なので、`roadSurface.test.ts` で下限を縛っている。
 * A で地面のマークを80件以上に縛ったのと同じ考え方
 */
export function buildRoadMarks(start: number = ROAD_START, end: number = ROAD_END): RoadMark[] {
  const marks: RoadMark[] = []

  // センターラインの破線。一定間隔で奥へ続くので、一点透視のリズムを一番強く作る要素
  for (let t = start + 4; t < end; t += 5) {
    marks.push({ t, lateral: 0, length: 2.2, width: 0.18, kind: 'dash' })
  }

  // 路側帯。長い破線として置く(完全な実線にすると1枚の板になって件数で密度を測れない)
  for (let t = start + 2; t < end; t += 8.6) {
    for (const side of [-1, 1]) {
      marks.push({ t, lateral: side * (ROAD_HALF - 0.45), length: 8, width: 0.16, kind: 'edge' })
    }
  }

  // マンホール。①で名指しされていた要素。左右交互に置いて規則性を消す
  for (let i = 0; ; i++) {
    const t = start + 11 + i * 17.5
    if (t >= end) break
    marks.push({ t, lateral: (i % 2 === 0 ? 1 : -1) * 1.9, length: 1.15, width: 1.15, kind: 'manhole' })
  }

  // 補修跡。白線ほど目立たないが、面が単色でなくなるだけで「使われている道」に見える
  for (let i = 0; ; i++) {
    const t = start + 6 + i * 9.3
    if (t >= end) break
    const width = 1.8 + (i % 2) * 0.7
    // **幅を出してから横位置を詰める**。先に横位置を決めると幅のぶんだけ車道からはみ出す
    // (最初はそうなっていて、路肩の外に白くない板が乗った)
    const limit = ROAD_HALF - width / 2
    const raw = ((i * 2.7) % (ROAD_HALF * 1.6)) - ROAD_HALF * 0.8
    marks.push({ t, lateral: Math.min(Math.max(raw, -limit), limit), length: 2.6 + (i % 3) * 0.8, width, kind: 'patch' })
  }

  // 区間の変わり目に横断歩道と停止線。**街の切り替わりが路面からも読める**
  for (let i = 1; i < LEGS.length; i++) {
    const base = legStart(i)
    marks.push({ t: base - 4.2, lateral: 0, length: 0.5, width: ROAD_HALF * 2 - 0.6, kind: 'stop' })
    for (let s = 0; s < 6; s++) {
      const lateral = -ROAD_HALF + 0.9 + s * ((ROAD_HALF * 2 - 1.8) / 5)
      marks.push({ t: base, lateral, length: 3.2, width: 0.55, kind: 'crosswalk' })
    }
  }

  return marks
}

/**
 * マーキングを1つのジオメトリに合流させる。四隅を `sampler` で解くので、
 * 曲がった道でも傾いた坂でも路面に貼り付く
 */
export function buildMarkGeometry(
  marks: readonly RoadMark[],
  lift: number = 0.02,
  sampler: RoadSampler = defaultSampler
): StripGeometryData {
  const positions = new Float32Array(marks.length * 4 * 3)
  const normals = new Float32Array(marks.length * 4 * 3)
  const uvs = new Float32Array(marks.length * 4 * 2)
  const indices = new Uint32Array(marks.length * 6)

  marks.forEach((mark, i) => {
    const t0 = mark.t - mark.length / 2
    const t1 = mark.t + mark.length / 2
    const l0 = mark.lateral - mark.width / 2
    const l1 = mark.lateral + mark.width / 2
    const corners = [sampler(t0, l0), sampler(t0, l1), sampler(t1, l0), sampler(t1, l1)]

    corners.forEach((c, k) => {
      const o = (i * 4 + k) * 3
      positions[o] = c[0]
      positions[o + 1] = c[1] + lift
      positions[o + 2] = c[2]
      normals[o] = 0
      normals[o + 1] = 1
      normals[o + 2] = 0
      const u = (i * 4 + k) * 2
      uvs[u] = k % 2
      uvs[u + 1] = k < 2 ? 0 : 1
    })

    // **巻き順は上向き(反時計回り)でなければならない**。
    // カリングを決めるのは法線属性ではなく巻き順なので、逆にすると路面マーキングが
    // まるごと背面カリングで消える(実際にこれで白線が1本も出なかった)。
    // roadSurface.test.ts で三角形の法線が +Y であることを確認している
    const v = i * 4
    const o = i * 6
    indices[o] = v
    indices[o + 1] = v + 1
    indices[o + 2] = v + 2
    indices[o + 3] = v + 1
    indices[o + 4] = v + 3
    indices[o + 5] = v + 2
  })

  return { positions, normals, uvs, indices }
}

/** 道の帯の定義。車道 → 縁石の立ち上がり → 歩道 の順に並ぶ */
export const STRIPS: ReadonlyArray<{
  id: string
  innerOffset: number
  innerLift: number
  outerOffset: number
  outerLift: number
  /** 'road' | 'curb' | 'sidewalk' — 描画側の色分けに使う */
  surface: 'road' | 'curb' | 'sidewalk'
}> = [
  { id: 'road', innerOffset: -ROAD_HALF, innerLift: 0, outerOffset: ROAD_HALF, outerLift: 0, surface: 'road' },
  // 縁石の垂直面。内外の横位置が同じで持ち上げ量だけ違う = 立ち上がり
  { id: 'curb-l', innerOffset: -ROAD_HALF, innerLift: 0, outerOffset: -ROAD_HALF, outerLift: CURB_HEIGHT, surface: 'curb' },
  { id: 'curb-r', innerOffset: ROAD_HALF, innerLift: 0, outerOffset: ROAD_HALF, outerLift: CURB_HEIGHT, surface: 'curb' },
  {
    id: 'walk-l',
    innerOffset: -ROAD_HALF,
    innerLift: CURB_HEIGHT,
    outerOffset: -(FACADE_X + 1.5),
    outerLift: CURB_HEIGHT,
    surface: 'sidewalk',
  },
  {
    id: 'walk-r',
    innerOffset: ROAD_HALF,
    innerLift: CURB_HEIGHT,
    outerOffset: FACADE_X + 1.5,
    outerLift: CURB_HEIGHT,
    surface: 'sidewalk',
  },
]
