import { describe, expect, it } from 'vitest'
import {
  MODULES,
  SCATTER_KINDS,
  heroFigure,
  mulberry32,
  pickModule,
  signsOn,
  windowsOn,
  type ModuleKind,
  type Piece,
} from './modules'
import { MIN_WINDOW_STRUCTURE_DELTA_E, PALETTES, brightness, deltaE, parseHex, slotColor } from './palette'

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

  // 見るのは**建物の躯体だけ**。窓・看板は壁に貼る薄い板なので、
  // 厚み(0.06)に対して縦横が何倍あろうと「柱に見える」の話には関係しない
  it('block は幅に対して高すぎない(柱ではなく建物に見える)', () => {
    for (const seed of [7, 77, 777, 7777]) {
      for (const p of build('block', seed)) {
        if (!p.slot.startsWith('structure')) continue
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

// 建物が無地の板だったのが A / B / C を通した最大の弱点で、その直接の答えが窓と看板。
// **壁に貼る板は少しでもずれると「宙に浮いた板」に見える**ので、位置と寸法を数値で縛る
describe('壁の情報(窓・看板)', () => {
  /** 建物の代表寸法。block() が実際に作る範囲(幅1.05〜1.9 / 高さ1.4〜4.9)の真ん中あたり */
  const W = 1.6
  const H = 3.4
  const D = 1.4

  it('窓は必ず窓のスロットしか使わない(壁に別の色を持ち込まない)', () => {
    for (const seed of [1, 22, 333, 4444]) {
      for (const p of windowsOn(0, 0, W, H, D, 0, mulberry32(seed))) {
        expect(['window', 'windowAlt']).toContain(p.slot)
      }
    }
  })

  it('窓は抽選で一部だけ灯る(全部同じだと壁が1枚の面に戻る)', () => {
    // 十分な枚数を集めて、両方のスロットが出ることを確かめる
    const slots = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const p of windowsOn(0, 0, W, H, D, 0, mulberry32(seed))) slots.add(p.slot)
    }
    expect(slots).toEqual(new Set(['window', 'windowAlt']))
  })

  // **カメラは +X+Z 側に固定**なので、-X / -Z の面は最後まで一度も映らない。
  // 4面に貼ると箱の数が倍になるのに絵は1ピクセルも変わらない
  it('窓は見える2面(+X / +Z)にしか貼らない', () => {
    for (const p of windowsOn(0, 0, W, H, D, 0, mulberry32(11))) {
      const onXFace = p.center[0] > W / 2 - 1e-6
      const onZFace = p.center[2] > D / 2 - 1e-6
      expect(onXFace || onZFace, `${p.center}`).toBe(true)
    }
  })

  it('窓は壁から浮かせてあり、壁と同一平面ではない(Zファイティングを起こさない)', () => {
    for (const p of windowsOn(0, 0, W, H, D, 0, mulberry32(11))) {
      const onXFace = p.center[0] > W / 2 - 1e-6
      // 板の中心が壁面より外にあること。0だと壁と重なって描画がちらつく
      if (onXFace) expect(p.center[0]).toBeGreaterThan(W / 2)
      else expect(p.center[2]).toBeGreaterThan(D / 2)
    }
  })

  it('窓は建物の縦の範囲に収まる(足元と屋根際は空ける)', () => {
    for (const seed of [1, 22, 333]) {
      for (const p of windowsOn(0, 0, W, H, D, 0, mulberry32(seed))) {
        expect(p.center[1] - p.size[1] / 2, 'below ground').toBeGreaterThan(0.1)
        expect(p.center[1] + p.size[1] / 2, 'above roof').toBeLessThan(H)
      }
    }
  })

  it('窓は建物の横幅からはみ出さない', () => {
    for (const w of [1.05, 1.3, 1.6, 1.9]) {
      for (const p of windowsOn(0, 0, w, H, w, 0, mulberry32(5))) {
        const onXFace = p.center[0] > w / 2 - 1e-6
        // 面に沿った方向の位置が、その面の幅の内側にあること
        const along = onXFace ? Math.abs(p.center[2]) + p.size[2] / 2 : Math.abs(p.center[0]) + p.size[0] / 2
        expect(along, `w=${w}`).toBeLessThan(w / 2)
      }
    }
  })

  // 建物は ±0.25 rad 傾いている。**回さずに貼ると窓だけ壁からずれて宙に浮く**
  it('窓は建物の傾きに追従する', () => {
    const rotY = 0.4
    const pieces = windowsOn(0, 0, W, H, D, rotY, mulberry32(11))
    expect(pieces.length).toBeGreaterThan(0)
    for (const p of pieces) {
      expect(p.rotY).toBeCloseTo(rotY, 10)
      // 傾けた建物のローカル座標に戻すと、傾き0のときと同じ「面の上」に乗る
      const [c, s] = [Math.cos(rotY), Math.sin(rotY)]
      const localX = p.center[0] * c - p.center[2] * s
      const localZ = p.center[0] * s + p.center[2] * c
      const onXFace = Math.abs(localX - W / 2) < 0.1
      const onZFace = Math.abs(localZ - D / 2) < 0.1
      expect(onXFace || onZFace, `local=${localX},${localZ}`).toBe(true)
    }
  })

  it('低すぎる建物には窓を貼らない(1行も入らないため)', () => {
    expect(windowsOn(0, 0, W, 1.0, D, 0, mulberry32(1))).toHaveLength(0)
  })

  // 窓が2〜3列入ることが要点。1列だと窓ではなくエレベーターシャフトの縦帯に見える
  it('窓は横に2列以上並ぶ', () => {
    for (const w of [1.05, 1.4, 1.9]) {
      const pieces = windowsOn(0, 0, w, H, w, 0, mulberry32(3))
      const zFace = pieces.filter((p) => p.center[2] > w / 2 - 1e-6)
      const columns = new Set(zFace.map((p) => p.center[0].toFixed(4)))
      expect(columns.size, `w=${w}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('看板は差し色を使い回す(新しい色を持ち込まない)', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const p of signsOn(0, 0, W, H, D, 0, mulberry32(seed))) {
        expect(['accent', 'post']).toContain(p.slot)
      }
    }
  })

  it('看板は壁と屋上の2種類が出る', () => {
    const wall: Piece[] = []
    const roof: Piece[] = []
    for (let seed = 0; seed < 40; seed++) {
      for (const p of signsOn(0, 0, W, H, D, 0, mulberry32(seed))) {
        if (p.slot !== 'accent') continue
        // 屋上看板は屋根(y = H)より上に出る。壁看板は壁の中
        if (p.center[1] > H) roof.push(p)
        else wall.push(p)
      }
    }
    expect(wall.length, '壁看板').toBeGreaterThan(0)
    expect(roof.length, '屋上看板').toBeGreaterThan(0)
  })

  it('背の低い建物に屋上看板を立てない(看板のほうが大きくなる)', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const p of signsOn(0, 0, W, 2.0, D, 0, mulberry32(seed))) {
        expect(p.center[1], `seed=${seed}`).toBeLessThan(2.0)
      }
    }
  })

  // 窓が壁に沈むと壁が無地の板に戻り、窓を入れた意味そのものが消える
  it('どのパレットでも窓が壁から読める', () => {
    for (const p of PALETTES) {
      for (const slot of ['window', 'windowAlt'] as const) {
        for (let i = 0; i < p.structures.length; i++) {
          expect(
            deltaE(slotColor(p, slot), p.structures[i]),
            `${p.id}: ${slot} vs structures[${i}]`
          ).toBeGreaterThanOrEqual(MIN_WINDOW_STRUCTURE_DELTA_E)
        }
      }
    }
  })

  // `windowAlt` を単純に「明るいほう」にすると、昼のパレットでは必ず4色の建物のどれかに
  // 着地して窓が消える(実測: Misty で ΔE 3.1)。**建物の明度帯から離れる向きへ振る**のが規則で、
  // その結果として夜だけが「もっと明るい部屋」になる
  it('もう1種類の窓は建物の明度帯から離れる向きへ振れる', () => {
    for (const p of PALETTES) {
      const structAvg = p.structures.reduce((s, c) => s + brightness(c), 0) / p.structures.length
      const base = brightness(slotColor(p, 'window'))
      const alt = brightness(slotColor(p, 'windowAlt'))
      // 建物より暗い窓はさらに暗く、明るい窓はさらに明るく
      if (base >= structAvg) expect(alt, `${p.id}: 明るい側`).toBeGreaterThan(base)
      else expect(alt, `${p.id}: 暗い側`).toBeLessThan(base)
      // どちらに振っても建物から遠ざかっていること
      expect(Math.abs(alt - structAvg), p.id).toBeGreaterThan(Math.abs(base - structAvg))
    }
  })

  it('夜だけが「もっと明るい部屋」になる(灯りが点く側)', () => {
    const night = PALETTES.find((p) => p.id === 'night')!
    expect(brightness(slotColor(night, 'windowAlt'))).toBeGreaterThan(brightness(slotColor(night, 'window')))
    for (const p of PALETTES) {
      if (p.id === 'night') continue
      expect(brightness(slotColor(p, 'windowAlt')), p.id).toBeLessThan(brightness(slotColor(p, 'window')))
    }
  })

  it('2種類の窓どうしも見分けがつく(壁が1枚の平らな面に見えない)', () => {
    for (const p of PALETTES) {
      expect(deltaE(slotColor(p, 'window'), slotColor(p, 'windowAlt')), p.id).toBeGreaterThan(10)
    }
  })
})
