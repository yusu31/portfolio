// 路面と路面マーキング。`proto/b/roadSurface.ts` の移植(§5.3)。**地面に情報を乗せる**の実装。
//
// 道は**曲がるうえに傾く**ので、平らな地面に Canvas で描いてテクスチャに焼く手は使えない。
// 路面そのものを道に沿ったリボンとして生成し、白線・マンホールも道の座標系(`t`, `lateral`)で
// 持って、四角形をその場で解いて1つのジオメトリに合流させる。
// 道の式(`route.ts` の `elevationAt` / `lateralAt`)を変えても配置データを作り直さなくてよい。
//
// B から変えたのは2点:
//
//   1. **遠景の地面(`ground`)を STRIPS の一員として足した**。B は建物が常に両側にあったので
//      歩道の外を作る必要が無かったが、/city は敷地フェーズで街の壁が消える(§1.2 装置1)ので
//      歩道の外が見える。フォグに完全に溶ける位置まで伸ばす
//   2. 横断歩道・停止線を置く位置を `LEGS` の境界から **章の境界**へ
//
// ⚠ **縁石の高さを `t` 依存にする(0.16 → 0 を導入フェーズで smootherstep)のは §1.2 装置2 で、
//   担当は PR 3。** ここではまだ定数。段差が消えることが「敷地に入った」の合図になるので、
//   フェンス・上部構造の差し替えと**同時に**入れないと鈍い(§1.2 の「4装置の同時発火」)
import { CHAPTERS, FACADE_X, ROAD_END, ROAD_HALF, ROAD_START, chapterStart, roadPoint } from './route'

/** 縁石の高さ。歩道をこのぶん持ち上げて、道との段差を作る */
export const CURB_HEIGHT = 0.16

/**
 * 歩道の外側の縁。建物(壁面 `FACADE_X` + setback 最大 1.2)が歩道から落ちない幅にしてある
 */
export const WALK_OUTER = FACADE_X + 1.5

/**
 * 遠景の地面の半幅。フォグに完全に溶ける位置まで伸ばして、
 * **横方向の切れ端が地平に見えない**ようにする
 * (最大 `fogFar` は Noon の 220 で、そこでの画面端は 0.8329 × 220 = 183)
 */
export const GROUND_HALF = 200

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
 * 帯の巻き順を反転させるか。**負の横位置へ伸びる帯(道の左側)は反転が必要**。
 *
 * ⚠ **B のバグを実測で見つけて直した箇所**(2026-08-08)。
 *   `buildStrip` は「内側 → 外側」の順で頂点を吐くので、外側が負の方向にある左側の帯は
 *   三角形が裏向きになる。B は `side: DoubleSide` で描いていたため消えずに描画されたが、
 *   **two-sided では three.js が裏面の法線を反転させる**(`normal *= faceDirection`)ので、
 *   左側の帯だけ法線が下を向き、キーライトが当たらなくなっていた。
 *
 *   実測(`?leg=0&ph=open`、Morning、1280×800): 開口の地面が
 *   **左 `#3f5263` / 右 `#bdbcb5`** と左右で別物になっていた。
 *   B では建物が常に両側にあって歩道の外が見えなかったので露出しなかった。
 *
 *   縁石(垂直面)も同じ理由で反転が要る。こちらは**道の中心を向く面が見える面**なので、
 *   法線も内向き(B は外向きだった)に取る
 */
export function shouldFlipWinding(innerOffset: number, outerOffset: number): boolean {
  if (Math.abs(outerOffset - innerOffset) < 1e-6) return innerOffset < 0
  return outerOffset < innerOffset
}

/**
 * 道に沿った帯(リボン)のジオメトリを作る。
 * 車道・左右の歩道・縁石の立ち上がり・遠景の地面を、すべてこの1つの関数で作れるように
 * 内側と外側それぞれに「横位置」と「持ち上げ量」を取る。
 *
 * **巻き順は左右どちらの帯でも表向き(平らな帯なら上向き、縁石なら道の中心向き)に揃える**。
 * 揃えておけば `side: FrontSide` で描けて、巻き順を間違えたときに「暗くなる」ではなく
 * 「消える」という気づける壊れ方になる(§ `shouldFlipWinding`)
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
    // 道は曲がるのでワールドX固定にはできず、その地点の横方向を実際に測って使う。
    //
    // **向きは道の中心側(内向き)**。カメラは道の上にいるので、見えるのは道に面した側。
    // B は外向きに取っていて、`DoubleSide` の裏面反転にたまたま救われていた
    const vertical = Math.abs(outerOffset - innerOffset) < 1e-6
    let nx = 0
    let ny = 1
    let nz = 0
    if (vertical) {
      const center = sampler(t, 0)
      const dx = a[0] - center[0]
      const dz = a[2] - center[2]
      const len = Math.hypot(dx, dz) || 1
      nx = -dx / len
      ny = 0
      nz = -dz / len
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

  const flip = shouldFlipWinding(innerOffset, outerOffset)
  for (let i = 0; i < n; i++) {
    const v = i * 2
    const o = i * 6
    if (flip) {
      indices[o] = v
      indices[o + 1] = v + 2
      indices[o + 2] = v + 1
      indices[o + 3] = v + 1
      indices[o + 4] = v + 2
      indices[o + 5] = v + 3
    } else {
      indices[o] = v
      indices[o + 1] = v + 1
      indices[o + 2] = v + 2
      indices[o + 3] = v + 1
      indices[o + 4] = v + 3
      indices[o + 5] = v + 2
    }
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
 * 間隔は B のままなので、経路が 280 → 368 に伸びたぶん件数は自動で増える
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

  // マンホール。参考例①で名指しされていた要素。左右交互に置いて規則性を消す
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
    // (B は最初そうなっていて、路肩の外に白くない板が乗った)
    const limit = ROAD_HALF - width / 2
    const raw = ((i * 2.7) % (ROAD_HALF * 1.6)) - ROAD_HALF * 0.8
    marks.push({ t, lateral: Math.min(Math.max(raw, -limit), limit), length: 2.6 + (i % 3) * 0.8, width, kind: 'patch' })
  }

  // 章の変わり目に横断歩道と停止線。**街の切り替わりが路面からも読める**。
  // 章の境界は次の街区の始まりなので、開口(敷地)ではなく街の中に落ちる
  for (let i = 1; i < CHAPTERS.length; i++) {
    const base = chapterStart(i)
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
    // まるごと背面カリングで消える(B で実際にこれで白線が1本も出なかった)。
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

/**
 * 道の帯の定義。車道 → 縁石の立ち上がり → 歩道 → 遠景の地面 の順に並ぶ。
 *
 * **路面と遠景の地面を分けているのは影のため**。キーライトのシャドウカメラは主役の周り ±34
 * しか覆っていないのに対し、地面は ±200 まで伸びる。覆われていない範囲でシャドウマップを
 * 引くと縁のテクセルを拾うだけで得るものが無い。**球の影が要るのは路面と歩道の上だけ**
 */
export const STRIPS: ReadonlyArray<{
  id: string
  innerOffset: number
  innerLift: number
  outerOffset: number
  outerLift: number
  /** 描画側の色分けに使う */
  surface: 'road' | 'curb' | 'sidewalk' | 'ground'
  /** 球の影を受けるか。シャドウカメラが覆っている範囲だけ true */
  receiveShadow: boolean
}> = [
  {
    id: 'road',
    innerOffset: -ROAD_HALF,
    innerLift: 0,
    outerOffset: ROAD_HALF,
    outerLift: 0,
    surface: 'road',
    receiveShadow: true,
  },
  // 縁石の垂直面。内外の横位置が同じで持ち上げ量だけ違う = 立ち上がり
  {
    id: 'curb-l',
    innerOffset: -ROAD_HALF,
    innerLift: 0,
    outerOffset: -ROAD_HALF,
    outerLift: CURB_HEIGHT,
    surface: 'curb',
    receiveShadow: true,
  },
  {
    id: 'curb-r',
    innerOffset: ROAD_HALF,
    innerLift: 0,
    outerOffset: ROAD_HALF,
    outerLift: CURB_HEIGHT,
    surface: 'curb',
    receiveShadow: true,
  },
  {
    id: 'walk-l',
    innerOffset: -ROAD_HALF,
    innerLift: CURB_HEIGHT,
    outerOffset: -WALK_OUTER,
    outerLift: CURB_HEIGHT,
    surface: 'sidewalk',
    receiveShadow: true,
  },
  {
    id: 'walk-r',
    innerOffset: ROAD_HALF,
    innerLift: CURB_HEIGHT,
    outerOffset: WALK_OUTER,
    outerLift: CURB_HEIGHT,
    surface: 'sidewalk',
    receiveShadow: true,
  },
  // 遠景の地面。歩道と同じ高さから続けるので、境目に段差の線が出ない
  {
    id: 'ground-l',
    innerOffset: -WALK_OUTER,
    innerLift: CURB_HEIGHT,
    outerOffset: -GROUND_HALF,
    outerLift: CURB_HEIGHT,
    surface: 'ground',
    receiveShadow: false,
  },
  {
    id: 'ground-r',
    innerOffset: WALK_OUTER,
    innerLift: CURB_HEIGHT,
    outerOffset: GROUND_HALF,
    outerLift: CURB_HEIGHT,
    surface: 'ground',
    receiveShadow: false,
  },
]
