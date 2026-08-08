// 「地面に情報を乗せる」を件数で縛る。移植元は `proto/b/roadSurface.test.ts`。
// B から足したのは**遠景の地面**まわりの3件(歩道から段差なく続くこと・影を受けないこと)。
import { describe, expect, it } from 'vitest'
import {
  CURB_HEIGHT,
  GROUND_HALF,
  STRIPS,
  WALK_OUTER,
  buildMarkGeometry,
  buildRoadMarks,
  buildStrip,
  isDarkMark,
  shouldFlipWinding,
  type RoadSampler,
} from './roadSurface'
import { CHAPTERS, FACADE_X, ROAD_END, ROAD_HALF, ROAD_START, chapterStart, resolvePhase } from './route'

/** 平坦でまっすぐな道。ジオメトリ生成そのものを道の式から切り離して確認するため */
const flat: RoadSampler = (t, lateral) => [lateral, 0, -t]

const marks = buildRoadMarks()

describe('buildStrip', () => {
  it('セグメント数から頂点数とインデックス数が決まる', () => {
    const g = buildStrip(-1, 0, 1, 0, 10, 0, 100, flat)
    expect(g.positions.length).toBe((10 + 1) * 2 * 3)
    expect(g.indices.length).toBe(10 * 6)
    expect(g.uvs.length).toBe((10 + 1) * 2 * 2)
  })

  it('インデックスが頂点の範囲に収まる', () => {
    const g = buildStrip(-1, 0, 1, 0, 24, 0, 100, flat)
    const vertexCount = g.positions.length / 3
    for (const i of g.indices) expect(i).toBeLessThan(vertexCount)
  })

  it('指定した範囲の端から端までを覆う', () => {
    const g = buildStrip(-1, 0, 1, 0, 8, -16, 84, flat)
    expect(g.positions[2]).toBeCloseTo(16, 6)
    expect(g.positions[g.positions.length - 1]).toBeCloseTo(-84, 6)
  })

  it('持ち上げ量が高さに反映される', () => {
    const g = buildStrip(-1, 0, 1, 0.5, 2, 0, 10, flat)
    expect(g.positions[1]).toBeCloseTo(0, 6)
    expect(g.positions[4]).toBeCloseTo(0.5, 6)
  })

  // 縁石の立ち上がりは垂直面。法線が上向きのままだと段差に光が当たらず段が読めない
  it('縁石(内外が同じ横位置)の法線が横を向く', () => {
    const g = buildStrip(ROAD_HALF, 0, ROAD_HALF, CURB_HEIGHT, 4, 0, 10, flat)
    expect(Math.abs(g.normals[0])).toBe(1)
    expect(g.normals[1]).toBe(0)
  })

  it('平らな帯の法線は上向き', () => {
    const g = buildStrip(-1, 0, 1, 0, 4, 0, 10, flat)
    expect(g.normals[1]).toBe(1)
  })

  it('数値がすべて有限', () => {
    const g = buildStrip(-ROAD_HALF, 0, ROAD_HALF, 0, 60)
    expect(g.positions.every((v) => Number.isFinite(v))).toBe(true)
  })
})

/**
 * **巻き順**。ここが B から直した箇所で、実測で見つけた不具合の再発防止(§ `shouldFlipWinding`)。
 *
 * B は `side: DoubleSide` で描いていたため、巻き順が逆でも消えずに描画されたが、
 * **two-sided では three.js が裏面の法線を反転させる**ので左側の帯だけ法線が下を向き、
 * キーライトが当たらなかった。実測(`?leg=0&ph=open`、Morning、1280×800)では開口の地面が
 * **左 `#3f5263` / 右 `#bdbcb5`** と左右で別物になっていた(修正後は両方 `#bdbcb5` で一致)。
 *
 * コードを読んでも気づけない壊れ方なので、三角形の向きを実際に計算して確認する。
 * `FrontSide` で描いているので、いま同じ間違いをすれば「暗くなる」ではなく「消える」
 */
describe('巻き順(左右の帯で法線が揃う)', () => {
  const triangleNormals = (g: ReturnType<typeof buildStrip>) => {
    const at = (i: number): [number, number, number] => [
      g.positions[i * 3],
      g.positions[i * 3 + 1],
      g.positions[i * 3 + 2],
    ]
    const out: [number, number, number][] = []
    for (let tri = 0; tri < g.indices.length / 3; tri++) {
      const a = at(g.indices[tri * 3])
      const b = at(g.indices[tri * 3 + 1])
      const c = at(g.indices[tri * 3 + 2])
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      out.push([
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ])
    }
    return out
  }

  it('shouldFlipWinding が負の側の帯だけ true を返す', () => {
    expect(shouldFlipWinding(-ROAD_HALF, ROAD_HALF)).toBe(false)
    expect(shouldFlipWinding(-ROAD_HALF, -WALK_OUTER)).toBe(true)
    expect(shouldFlipWinding(ROAD_HALF, WALK_OUTER)).toBe(false)
    // 縁石(内外が同じ横位置)は左側だけ反転
    expect(shouldFlipWinding(-ROAD_HALF, -ROAD_HALF)).toBe(true)
    expect(shouldFlipWinding(ROAD_HALF, ROAD_HALF)).toBe(false)
  })

  it('平らな帯の三角形が左右どちらでも上を向く', () => {
    for (const s of STRIPS.filter((s) => s.surface !== 'curb')) {
      for (const n of triangleNormals(buildStrip(s.innerOffset, s.innerLift, s.outerOffset, s.outerLift, 6, 0, 60, flat))) {
        expect(n[1], `${s.id} の三角形が下を向いている`).toBeGreaterThan(0)
      }
    }
  })

  it('縁石の三角形が左右どちらでも道の中心を向く', () => {
    for (const s of STRIPS.filter((s) => s.surface === 'curb')) {
      const inward = -Math.sign(s.innerOffset)
      for (const n of triangleNormals(buildStrip(s.innerOffset, s.innerLift, s.outerOffset, s.outerLift, 6, 0, 60, flat))) {
        expect(Math.sign(n[0]), `${s.id} の三角形が道の外を向いている`).toBe(inward)
      }
    }
  })

  it('法線属性も道の中心を向く(三角形の向きと一致する)', () => {
    for (const s of STRIPS.filter((s) => s.surface === 'curb')) {
      const g = buildStrip(s.innerOffset, s.innerLift, s.outerOffset, s.outerLift, 6, 0, 60, flat)
      expect(Math.sign(g.normals[0])).toBe(-Math.sign(s.innerOffset))
      expect(g.normals[1]).toBe(0)
    }
  })
})

describe('STRIPS', () => {
  it('車道・縁石・歩道・遠景の地面がそろっている', () => {
    const surfaces = new Set(STRIPS.map((s) => s.surface))
    expect(surfaces).toEqual(new Set(['road', 'curb', 'sidewalk', 'ground']))
  })

  it('IDが重複しない', () => {
    expect(new Set(STRIPS.map((s) => s.id)).size).toBe(STRIPS.length)
  })

  it('歩道が建物の壁面より外まで届く(建物が歩道から落ちない)', () => {
    const walks = STRIPS.filter((s) => s.surface === 'sidewalk')
    // setback の最大は 1.2 なので、壁面はそのぶん外へ動く
    for (const w of walks) expect(Math.abs(w.outerOffset)).toBeGreaterThanOrEqual(FACADE_X + 1.2)
  })

  it('歩道が車道より高い(段差がある)', () => {
    const walk = STRIPS.find((s) => s.surface === 'sidewalk')!
    const road = STRIPS.find((s) => s.surface === 'road')!
    expect(walk.innerLift).toBeGreaterThan(road.innerLift)
  })

  /**
   * **遠景の地面は敷地フェーズで初めて見える**。B は建物が常に両側にあったので
   * 歩道の外を作る必要が無かったが、/city は街の壁が消える(§1.2 装置1)。
   * 歩道と同じ高さから続けないと、開口の左右に 0.16 の段差の線が走る
   */
  it('遠景の地面が歩道の外縁から段差なく続く', () => {
    const walk = STRIPS.find((s) => s.id === 'walk-r')!
    const ground = STRIPS.find((s) => s.id === 'ground-r')!
    expect(ground.innerOffset).toBe(walk.outerOffset)
    expect(ground.innerLift).toBe(walk.outerLift)
  })

  it('遠景の地面がフォグに溶ける位置まで伸びる', () => {
    // 最大の fogFar は Noon の 220。16:10 ではそこでの画面端が 0.8329 × 220 = 183
    expect(GROUND_HALF).toBeGreaterThan(183)
  })

  /**
   * キーライトのシャドウカメラは主役の周り ±34 しか覆っていない。
   * 覆われていない範囲で影を受けても縁のテクセルを拾うだけで得るものが無い
   */
  it('遠景の地面だけが影を受けない', () => {
    for (const s of STRIPS) {
      expect(s.receiveShadow).toBe(s.surface !== 'ground')
    }
  })

  it('歩道の外縁が定数と一致する', () => {
    expect(WALK_OUTER).toBe(FACADE_X + 1.5)
  })
})

describe('buildRoadMarks', () => {
  // 地面の情報量。経路が 280 → 368 に伸びたぶん、同じ間隔でも件数は増える
  it('道全体に150件以上のマーキングがある', () => {
    expect(marks.length).toBeGreaterThan(150)
  })

  it('白線・マンホール・横断歩道がそろっている', () => {
    const kinds = new Set(marks.map((m) => m.kind))
    for (const k of ['dash', 'edge', 'manhole', 'crosswalk', 'stop', 'patch']) {
      expect(kinds.has(k as never)).toBe(true)
    }
  })

  it('センターラインが一定間隔で続く(一点透視のリズム)', () => {
    const dashes = marks.filter((m) => m.kind === 'dash').map((m) => m.t)
    expect(dashes.length).toBeGreaterThan(60)
    for (let i = 1; i < dashes.length; i++) {
      expect(dashes[i] - dashes[i - 1]).toBeCloseTo(5, 6)
    }
  })

  it('すべてのマーキングが車道の幅に収まる', () => {
    for (const m of marks) {
      expect(Math.abs(m.lateral) + m.width / 2).toBeLessThanOrEqual(ROAD_HALF + 1e-6)
    }
  })

  it('道の生成範囲の中に収まる', () => {
    for (const m of marks) {
      expect(m.t).toBeGreaterThanOrEqual(ROAD_START)
      expect(m.t).toBeLessThan(ROAD_END)
    }
  })

  it('章の変わり目に横断歩道がある', () => {
    // 4章なので境界は3つ。1境界あたり6本のストライプ
    expect(marks.filter((m) => m.kind === 'crosswalk').length).toBe(6 * (CHAPTERS.length - 1))
    expect(marks.filter((m) => m.kind === 'stop').length).toBe(CHAPTERS.length - 1)
  })

  /**
   * **横断歩道は街区の中に落ちる**。章の境界は次の街区の始まりなので、
   * 開口(敷地)の真ん中に横断歩道が浮くことはない。
   * 停止線は境界の 4.2 手前なので、**前の章の退出フェーズ**(長さ9)の中に入る
   */
  it('横断歩道が街区に落ちる(開口の中に浮かない)', () => {
    for (const m of marks.filter((m) => m.kind === 'crosswalk')) {
      expect(resolvePhase(m.t).phase).toBe('street')
      expect(m.t).toBe(chapterStart(resolvePhase(m.t).chapterIndex))
    }
    for (const m of marks.filter((m) => m.kind === 'stop')) {
      expect(resolvePhase(m.t).phase).toBe('exit')
    }
  })
})

describe('isDarkMark', () => {
  it('マンホールと補修跡だけが暗い', () => {
    expect(isDarkMark('manhole')).toBe(true)
    expect(isDarkMark('patch')).toBe(true)
    expect(isDarkMark('dash')).toBe(false)
    expect(isDarkMark('crosswalk')).toBe(false)
  })
})

describe('buildMarkGeometry', () => {
  it('マーク1つにつき4頂点・2三角形', () => {
    const g = buildMarkGeometry(marks.slice(0, 5), 0.02, flat)
    expect(g.positions.length).toBe(5 * 4 * 3)
    expect(g.indices.length).toBe(5 * 6)
  })

  it('指定した高さに浮く(路面とのZ-fightingを避ける)', () => {
    const g = buildMarkGeometry([{ t: 10, lateral: 0, length: 2, width: 0.2, kind: 'dash' }], 0.05, flat)
    for (let i = 1; i < g.positions.length; i += 3) expect(g.positions[i]).toBeCloseTo(0.05, 6)
  })

  it('マークの寸法どおりの四角形になる', () => {
    const g = buildMarkGeometry([{ t: 10, lateral: 0, length: 3, width: 1, kind: 'dash' }], 0, flat)
    // flat sampler では x = lateral, z = -t
    const xs = [g.positions[0], g.positions[3], g.positions[6], g.positions[9]]
    const zs = [g.positions[2], g.positions[5], g.positions[8], g.positions[11]]
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 6)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(3, 6)
  })

  it('インデックスが頂点の範囲に収まる', () => {
    const g = buildMarkGeometry(marks)
    const vertexCount = g.positions.length / 3
    for (const i of g.indices) expect(i).toBeLessThan(vertexCount)
  })

  // **巻き順が逆だと路面マーキングが背面カリングでまるごと消える**。
  // 法線属性を上向きにしていても関係なく、カリングは巻き順で決まる。
  // コードを読んでも気づけない壊れ方なので、三角形の向きを実際に計算して確認する
  it('三角形が上を向く(巻き順が正しい)', () => {
    const g = buildMarkGeometry(marks)
    const at = (i: number): [number, number, number] => [
      g.positions[i * 3],
      g.positions[i * 3 + 1],
      g.positions[i * 3 + 2],
    ]
    for (let tri = 0; tri < g.indices.length / 3; tri++) {
      const a = at(g.indices[tri * 3])
      const b = at(g.indices[tri * 3 + 1])
      const c = at(g.indices[tri * 3 + 2])
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      // 外積のY成分が正 = 面が上を向いている
      const ny = ab[2] * ac[0] - ab[0] * ac[2]
      expect(ny).toBeGreaterThan(0)
    }
  })

  it('実際の道に貼っても数値が有限', () => {
    const g = buildMarkGeometry(marks)
    expect(g.positions.every((v) => Number.isFinite(v))).toBe(true)
  })

  it('空でも壊れない', () => {
    const g = buildMarkGeometry([])
    expect(g.positions.length).toBe(0)
    expect(g.indices.length).toBe(0)
  })
})
