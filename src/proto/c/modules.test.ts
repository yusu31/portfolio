import { describe, expect, it } from 'vitest'
import {
  MODULES,
  SCATTER_KINDS,
  heroFigure,
  mulberry32,
  pickModule,
  type ModuleKind,
  type Piece,
} from './modules'
import { PALETTES, parseHex, slotColor } from './palette'

const TILE = 3.2

/** そのモジュールを決まったシードで組む。テスト全体で同じ条件を使う */
function build(kind: ModuleKind, seed = 12345): Piece[] {
  return MODULES[kind]({ cx: 0, cz: 0, tile: TILE, rand: mulberry32(seed) })
}

const ALL_KINDS = Object.keys(MODULES) as ModuleKind[]

describe('mulberry32', () => {
  it('決定的で、同じシードなら同じ列を返す', () => {
    const a = mulberry32(99)
    const b = mulberry32(99)
    for (let i = 0; i < 50; i++) expect(a()).toBe(b())
  })

  it('シードが違えば列も違う', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('[0,1) に収まる', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('モジュールカタログ', () => {
  it('カタログには lane を含む9種がある', () => {
    expect(ALL_KINDS).toHaveLength(9)
    expect(ALL_KINDS).toContain('lane')
  })

  it('抽選に出るのは lane 以外の8種', () => {
    expect(SCATTER_KINDS).toHaveLength(8)
    expect(SCATTER_KINDS).not.toContain('lane')
    for (const k of SCATTER_KINDS) expect(ALL_KINDS).toContain(k)
  })

  // 線路(鉄道)の語彙は世界観と噛み合わないので捨てた。
  // 残っていると「球体が移動する」という前提と食い違う
  it('鉄道の語彙が残っていない', () => {
    for (const kind of ['rail', 'platform', 'tower', 'yard', 'field']) {
      expect(ALL_KINDS).not.toContain(kind)
    }
  })

  it('empty 以外はすべて1個以上を返す', () => {
    for (const kind of ALL_KINDS) {
      const pieces = build(kind)
      if (kind === 'empty') expect(pieces).toHaveLength(0)
      else expect(pieces.length, kind).toBeGreaterThan(0)
    }
  })

  it('すべての寸法・座標が有限で、寸法は正', () => {
    for (const kind of ALL_KINDS) {
      for (const p of build(kind)) {
        for (const v of [...p.center, ...p.size, p.rotY]) expect(Number.isFinite(v), kind).toBe(true)
        for (const s of p.size) expect(s, kind).toBeGreaterThan(0)
      }
    }
  })

  // **モジュールは色を知らない**のが C の設計の核心。
  // 型では守られているが、スロットが実在することは実行時にも確認しておく
  it('モジュールが返すのは色ではなくスロットで、必ず解決できる', () => {
    for (const kind of ALL_KINDS) {
      for (const p of build(kind)) {
        expect(p).not.toHaveProperty('color')
        expect(/^#[0-9a-f]{6}$/i.test(slotColor(PALETTES[0], p.slot)), `${kind}/${p.slot}`).toBe(true)
      }
    }
  })

  it('すべての物が島の天面より上に立つ(地面にめり込まない)', () => {
    for (const kind of ALL_KINDS) {
      for (const p of build(kind)) {
        expect(p.center[1] - p.size[1] / 2, `${kind}`).toBeGreaterThanOrEqual(-0.01)
      }
    }
  })

  // タイルからの食み出しは許すが、青天井だと隣のタイルの中身と衝突する。
  // ジオラマでは多少重なったほうが密に見えるので、上限だけを縛る
  it('タイルからの食み出しは1ユニット以内に収まる', () => {
    const limit = TILE / 2 + 1.0
    for (const kind of ALL_KINDS) {
      for (const p of build(kind)) {
        expect(Math.abs(p.center[0]) + p.size[0] / 2, `${kind}/x`).toBeLessThanOrEqual(limit)
        expect(Math.abs(p.center[2]) + p.size[2] / 2, `${kind}/z`).toBeLessThanOrEqual(limit)
      }
    }
  })

  it('シードが違えば中身が変わる(同じ島の中で反復に見えない)', () => {
    for (const kind of ALL_KINDS) {
      if (kind === 'empty') continue
      const a = JSON.stringify(build(kind, 11))
      const b = JSON.stringify(build(kind, 987654))
      expect(a, kind).not.toBe(b)
    }
  })
})

describe('lane(C の背骨 = 球体が走る道)', () => {
  const pieces = build('lane')

  it('白線はZ軸に沿ってタイルを全長ぶん貫く(隣のタイルと途切れない)', () => {
    const lines = pieces.filter((p) => p.slot === 'laneMark' && p.size[2] >= TILE)
    // 3本のレーンライン
    expect(lines.length).toBeGreaterThanOrEqual(3)
    for (const r of lines) {
      expect(r.center[2] - r.size[2] / 2).toBeLessThanOrEqual(-TILE / 2 + 1e-9)
      expect(r.center[2] + r.size[2] / 2).toBeGreaterThanOrEqual(TILE / 2 - 1e-9)
      // Z方向に長く、X方向に細い = 線として読める
      expect(r.size[2]).toBeGreaterThan(r.size[0] * 10)
    }
  })

  it('白線は走路の中心について左右対称に並ぶ', () => {
    const xs = pieces
      .filter((p) => p.slot === 'laneMark' && p.size[2] >= TILE)
      .map((r) => r.center[0])
      .sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(-xs[xs.length - 1], 6)
    expect(xs[0]).toBeLessThan(0)
  })

  it('舗装と路肩が敷かれている(走路が地面に溶けない)', () => {
    expect(pieces.filter((p) => p.slot === 'lane').length).toBeGreaterThanOrEqual(1)
    expect(pieces.filter((p) => p.slot === 'soil').length).toBeGreaterThanOrEqual(2)
  })

  it('走路の物はすべて低く、球体の走行を遮らない', () => {
    for (const p of pieces) {
      // コース脇の旗だけは立ち上がってよい
      if (p.slot === 'post' || p.slot === 'accent') continue
      expect(p.center[1] + p.size[1] / 2, p.slot).toBeLessThan(0.2)
    }
  })

  it('コース脇の旗は毎回は出ない(等間隔の反復にしない)', () => {
    const withFlag = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (s) => build('lane', s * 7919).some((p) => p.slot === 'accent')
    )
    expect(withFlag.some(Boolean)).toBe(true)
    expect(withFlag.some((v) => !v)).toBe(true)
  })
})

describe('密度を担当するモジュール', () => {
  it('gear(用具置き場)は物量で画を持たせる(参考例④)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(build('gear', seed * 104729).length).toBeGreaterThanOrEqual(6)
    }
  })

  it('grove の葉は芝から導出した色を使う(緑を専用色として増やさない)', () => {
    const leaves = build('grove').filter((p) => p.slot === 'foliage')
    expect(leaves.length).toBeGreaterThanOrEqual(6)
    // 地面の色から導出されているので、芝と大きく離れない
    const [lr, lg, lb] = parseHex(slotColor(PALETTES[0], 'foliage'))
    const [gr, gg, gb] = parseHex(PALETTES[0].groundAlt)
    expect(Math.max(Math.abs(lr - gr), Math.abs(lg - gg), Math.abs(lb - gb))).toBeLessThan(30)
  })

  it('court はほぼ平らで、天面を隠さない(ゴールポストを除く)', () => {
    for (const p of build('court')) {
      if (p.slot === 'post') continue
      expect(p.size[1]).toBeLessThan(0.4)
    }
  })

  it('court は白線でコートを描く(地面に情報を乗せる)', () => {
    for (const seed of [2, 22, 222]) {
      expect(build('court', seed).filter((p) => p.slot === 'laneMark').length, `seed=${seed}`).toBeGreaterThanOrEqual(7)
    }
  })

  it('stand は段が付いていて、段の縁にラインが入る', () => {
    const pieces = build('stand')
    const marks = pieces.filter((p) => p.slot === 'laneMark')
    expect(marks.length).toBe(3)
    // 段の高さが3種類ある
    const tiers = pieces.filter((p) => p.slot === 'structure0' || p.slot === 'structure2')
    expect(new Set(tiers.map((p) => p.size[1].toFixed(3))).size).toBe(3)
  })

  it('block は幅に対して高すぎない(柱ではなく建物に見える)', () => {
    for (const seed of [7, 77, 777, 7777]) {
      for (const p of build('block', seed)) {
        if (p.slot === 'roof' || p.slot === 'post') continue
        expect(p.size[1] / Math.min(p.size[0], p.size[2]), `seed=${seed}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('block は必ず屋根を別スロットで乗せる', () => {
    for (const seed of [3, 33, 333]) {
      const pieces = build('block', seed)
      const walls = pieces.filter((p) => p.slot.startsWith('structure'))
      const roofs = pieces.filter((p) => p.slot === 'roof')
      expect(roofs.length, `seed=${seed}`).toBe(walls.length)
    }
  })

  it('floodlight は島に垂直の線を立てる(俯瞰の画が平らにならないように)', () => {
    for (const seed of [5, 55, 555]) {
      const tall = build('floodlight', seed).some((p) => p.center[1] + p.size[1] / 2 > 5)
      expect(tall, `seed=${seed}`).toBe(true)
    }
  })

  // QAで「黒い棒付きキャンディの森」になった原因。
  // 幅に対して高すぎる物は構造物ではなく線として読まれる
  it('floodlight の胴は線に見えない太さがある', () => {
    for (const seed of [5, 55, 555]) {
      for (const p of build('floodlight', seed)) {
        if (p.size[1] < 2) continue
        expect(p.size[1] / p.size[0], `seed=${seed}`).toBeLessThan(6)
      }
    }
  })
})

describe('pickModule', () => {
  const weights = [
    { kind: 'block' as const, weight: 3 },
    { kind: 'grove' as const, weight: 1 },
  ]

  it('重みの比どおりに分かれる', () => {
    expect(pickModule(weights, 0)).toBe('block')
    expect(pickModule(weights, 0.7)).toBe('block')
    expect(pickModule(weights, 0.8)).toBe('grove')
    expect(pickModule(weights, 0.999)).toBe('grove')
  })

  it('r=1 でも範囲外にならない', () => {
    expect(pickModule(weights, 1)).toBe('grove')
    expect(pickModule(weights, 5)).toBe('grove')
  })

  it('重みが0なら empty', () => {
    expect(pickModule([{ kind: 'block', weight: 0 }], 0.5)).toBe('empty')
    expect(pickModule([], 0.5)).toBe('empty')
  })

  it('分布がおおむね重みに従う', () => {
    const rand = mulberry32(2024)
    let block = 0
    const n = 4000
    for (let i = 0; i < n; i++) if (pickModule(weights, rand()) === 'block') block++
    expect(block / n).toBeGreaterThan(0.7)
    expect(block / n).toBeLessThan(0.8)
  })
})

describe('heroFigure', () => {
  const height = 3.2
  const pieces = heroFigure(1.5, -2.5, 0.4, height)

  it('全身が指定した身長に収まる', () => {
    const top = Math.max(...pieces.map((p) => p.center[1] + p.size[1] / 2))
    const bottom = Math.min(...pieces.map((p) => p.center[1] - p.size[1] / 2))
    expect(bottom).toBeCloseTo(0, 5)
    expect(top).toBeCloseTo(height, 5)
  })

  it('人型として読める最小限の部位がある', () => {
    expect(pieces.filter((p) => p.slot === 'heroLimb').length).toBe(2)
    expect(pieces.filter((p) => p.slot === 'heroBody').length).toBe(3)
    expect(pieces.filter((p) => p.slot === 'heroSkin').length).toBe(1)
  })

  it('立ち位置が指定どおり(足元の中心)', () => {
    const head = pieces.find((p) => p.slot === 'heroSkin')!
    expect(head.center[0]).toBeCloseTo(1.5, 6)
    expect(head.center[2]).toBeCloseTo(-2.5, 6)
  })

  it('向きが全部位に反映される', () => {
    for (const p of pieces) expect(p.rotY).toBeCloseTo(0.4, 6)
  })

  it('足は向きに合わせて左右に開く(回転を無視して置いていない)', () => {
    const legs = heroFigure(0, 0, Math.PI / 2, height).filter((p) => p.slot === 'heroLimb')
    // rotY=90度 なら左右の開きはZ方向に出る
    expect(Math.abs(legs[0].center[2] - legs[1].center[2])).toBeGreaterThan(0.1)
    expect(Math.abs(legs[0].center[0] - legs[1].center[0])).toBeLessThan(1e-6)
  })
})
