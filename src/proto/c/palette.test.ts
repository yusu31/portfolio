import { describe, expect, it } from 'vitest'
import { BALL_COLOR } from './cards'
import {
  ATMOSPHERE_HOLD,
  MIN_ACCENT_STRUCTURE_DELTA_E,
  MIN_GROUND_PATCH_DELTA_E,
  MIN_HERO_GROUND_DELTA_E,
  MIN_HERO_SKY_DELTA_E,
  MIN_ROOF_SKY_DELTA_E,
  MIN_STRUCTURE_DELTA_E,
  PALETTES,
  deltaE,
  getPalette,
  lerpPalette,
  mixHex,
  parseHex,
  shadeHex,
  slotColor,
  type ColorSlot,
  type Palette,
} from './palette'

/** `slotColor` が受け取りうる全スロット。増やしたらここも増やす(網羅を落とさないため) */
const ALL_SLOTS: readonly ColorSlot[] = [
  'ground',
  'groundAlt',
  'foliage',
  'grout',
  'curb',
  'post',
  'rock',
  'rockDeep',
  'lane',
  'laneMark',
  'wood',
  'soil',
  'structure0',
  'structure1',
  'structure2',
  'structure3',
  'roof',
  'accent',
  'heroBody',
  'heroLimb',
  'heroSkin',
]

/** そのパレットが**宣言している**表面色。導出色はここに含まない */
function declaredSurfaceColors(p: Palette): string[] {
  return [p.ground, p.groundAlt, p.grout, p.rock, ...p.structures, p.accent]
}

const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s)

const brightness = (hex: string) => {
  const [r, g, b] = parseHex(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}

describe('PALETTES', () => {
  // ②は Day / Golden / Misty / Night の4種だったが、Golden は主役の橙が背景に溶けるので
  // Dusk(暖色の光 + 寒色の空)に作り直してある。**4種という枚数のほうは維持する**
  // (4章に3パレットだと2つの章が同じ色になり「章 = 独立した世界」が弱くなるため)
  it('4パレット(Day / Dusk / Misty / Night)で、章の数と一致している', () => {
    expect(PALETTES).toHaveLength(4)
    expect(PALETTES.map((p) => p.id)).toEqual(['day', 'dusk', 'misty', 'night'])
    expect(PALETTES.map((p) => p.label)).toEqual(['Day', 'Dusk', 'Misty', 'Night'])
  })

  it('すべての色フィールドが正しい16進表記', () => {
    for (const p of PALETTES) {
      for (const hex of [...declaredSurfaceColors(p), p.sky, p.shadowColor, p.skyColor, p.key.color]) {
        expect(isHex(hex), `${p.id}: ${hex}`).toBe(true)
      }
    }
  })

  // 共通原則1「パレットを絞る」。宣言する表面色を9色に固定し、
  // 残りはすべて導出にすることで、情報を足しても1画面の色数が増えないようにしている
  it('宣言する表面色は9色ちょうどで、すべて異なる', () => {
    for (const p of PALETTES) {
      const colors = declaredSurfaceColors(p)
      expect(colors).toHaveLength(9)
      expect(new Set(colors).size, p.id).toBe(9)
    }
  })

  it('フォグは奥のカードが列として見える範囲に置く', () => {
    for (const p of PALETTES) {
      expect(p.fogNear, p.id).toBeGreaterThan(0)
      expect(p.fogFar, p.id).toBeGreaterThan(p.fogNear)
      // 1枚先のカードが完全に消えない下限。カード間隔34 + カメラ距離58 で
      // 隣のカードまで概ね70〜100あるので、fogFar はそれを越えている必要がある
      expect(p.fogFar, p.id).toBeGreaterThan(100)
    }
  })

  it('暗いパレットは Night だけ', () => {
    const dark = PALETTES.filter((p) => brightness(p.sky) < 128)
    expect(dark.map((p) => p.id)).toEqual(['night'])
  })

  it('getPalette は範囲外をクランプする', () => {
    expect(getPalette(-3).id).toBe('day')
    expect(getPalette(99).id).toBe('night')
    expect(getPalette(1.4).id).toBe('dusk')
  })
})

describe('slotColor', () => {
  it('全スロットが正しい16進を返す', () => {
    for (const p of PALETTES) {
      for (const slot of ALL_SLOTS) {
        expect(isHex(slotColor(p, slot)), `${p.id}/${slot}`).toBe(true)
      }
    }
  })

  it('宣言済みスロットはパレットの値をそのまま返す', () => {
    const p = PALETTES[0]
    expect(slotColor(p, 'ground')).toBe(p.ground)
    expect(slotColor(p, 'groundAlt')).toBe(p.groundAlt)
    expect(slotColor(p, 'rock')).toBe(p.rock)
    expect(slotColor(p, 'accent')).toBe(p.accent)
    expect(slotColor(p, 'structure2')).toBe(p.structures[2])
  })

  it('屋根は必ず壁より暗い(俯瞰で屋根の面積が大きいため)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'roof')), p.id).toBeLessThan(brightness(p.structures[3]))
    }
  })

  // 白線が乗るのは地面ではなく**舗装の上**なので、対比を測る相手は `lane`。
  // 地面(明るいベージュ)と比べると差が出ないが、実際にはそこに線を引かない
  it('走路の白線は舗装よりはっきり明るい(遠くからでも線として読める)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'laneMark')) - brightness(slotColor(p, 'lane')), p.id).toBeGreaterThan(55)
    }
  })

  it('コートの白線も同じ理屈で土より明るい', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'laneMark')) - brightness(slotColor(p, 'soil')), p.id).toBeGreaterThan(40)
    }
  })

  it('走路の舗装は地面より沈む(道として読める)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'lane')), p.id).toBeLessThan(brightness(p.ground))
    }
  })

  it('木の葉は芝より暗い(芝の上に立つ木が地面に溶けない)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'foliage')), p.id).toBeLessThan(brightness(p.groundAlt))
    }
  })

  it('岩は下ほど暗い(浮島の底が空に溶けないようにする)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'rockDeep')), p.id).toBeLessThan(brightness(slotColor(p, 'rock')))
    }
  })

  // ②の Golden は「黄土〜琥珀の単一トーンに全部が沈んでいる」パレットだったが、
  // **主役の球体が橙なので世界ごと琥珀に沈めると主役が背景に溶ける**(実測 ΔE 41.5)。
  // 借りるのは作り方であって題材ではないので、ゴールデンアワーの本体のほう
  // ——「暖色の光」と「寒色の空」が同居している——を条件として書き直してある
  it('Dusk は寒色の空に暖色の光が当たっている(単一トーンに沈めない)', () => {
    const dusk = PALETTES[1]
    // 空は寒色。ここが暖色に戻ると橙の主役が空に溶ける
    const [skyR, , skyB] = parseHex(dusk.sky)
    expect(skyB, 'sky').toBeGreaterThan(skyR)
    // 光は暖色。夕方であることはライトと長い影が担当する
    const [keyR, , keyB] = parseHex(dusk.key.color)
    expect(keyR, 'key').toBeGreaterThan(keyB)
    // 影は寒色。暖色の光と対にならないと時間帯が読めない
    const [shR, , shB] = parseHex(dusk.shadowColor)
    expect(shB, 'shadow').toBeGreaterThan(shR)
    // 光源が低い = 影が長い。ゴールデンアワーの本体はこちら
    expect(dusk.key.position[1], 'key height').toBeLessThan(20)
  })

  it('主役の胴は差し色なので、そのパレットの中で目立つ', () => {
    for (const p of PALETTES) {
      expect(slotColor(p, 'heroBody'), p.id).toBe(p.accent)
      // 地面より明るいか暗いかは問わないが、同じ色ではいけない(埋もれる)
      expect(slotColor(p, 'heroBody'), p.id).not.toBe(p.ground)
    }
  })
})

// A / B / C を通して Night が毎回潰れた。3本目でようやく `?pal=N` の撮り比べができて、
// **原因が「暗いこと」ではなく「色どうしが近いこと」だと数値で特定できた**。
//
// 目分量で見ているうちは同じ失敗を繰り返すので、破綻の中身をそのまま閾値にしてある。
// 閾値はすべて「壊れていた側の実測値を下回り、直した側の実測値を上回る」位置に置いた
// (どちらの数字も各 it の中に書いてある。将来ここを緩めたくなったときの判断材料になる)。
describe('パレットの破綻を ΔE で縛る', () => {
  it('建物4色はどの2つも塊に溶けない', () => {
    // 旧 Night 7.0 / 旧 Misty 7.8 が「1つの塊に見える」側。現行は最低 11.9
    for (const p of PALETTES) {
      for (let i = 0; i < p.structures.length; i++) {
        for (let j = i + 1; j < p.structures.length; j++) {
          expect(
            deltaE(p.structures[i], p.structures[j]),
            `${p.id}: structures[${i}] vs [${j}]`
          ).toBeGreaterThanOrEqual(MIN_STRUCTURE_DELTA_E)
        }
      }
    }
  })

  it('地面パッチが地面から読める(天面が単色の板にならない)', () => {
    // 旧 Night 8.3 でパッチが完全に消えていた。現行は最低 17.0
    for (const p of PALETTES) {
      expect(deltaE(p.ground, p.groundAlt), p.id).toBeGreaterThanOrEqual(MIN_GROUND_PATCH_DELTA_E)
    }
  })

  it('主役の球体が空に溶けない', () => {
    // **旧 Golden の 41.5 がここで落ちる**。世界ごと琥珀に沈めると橙の主役が消えていた。
    // 現行は最低 75.0 で、最大は Night の 100.5(= クリスタルを置くなら Night が最も映える)
    for (const p of PALETTES) {
      expect(deltaE(BALL_COLOR, p.sky), p.id).toBeGreaterThanOrEqual(MIN_HERO_SKY_DELTA_E)
    }
  })

  it('主役の球体が地面に溶けない(球体は走路の上にいる)', () => {
    for (const p of PALETTES) {
      expect(deltaE(BALL_COLOR, p.ground), p.id).toBeGreaterThanOrEqual(MIN_HERO_GROUND_DELTA_E)
    }
  })

  it('屋根が空に抜けた穴に見えない', () => {
    // 旧 Night 17.5 で屋根が黒い穴になっていた。俯瞰なので屋根の面積が大きく効く。現行は最低 27.5
    for (const p of PALETTES) {
      expect(deltaE(slotColor(p, 'roof'), p.sky), p.id).toBeGreaterThanOrEqual(MIN_ROOF_SKY_DELTA_E)
    }
  })

  it('差し色が建物に埋もれない', () => {
    // 旧 Misty 19.6 が下限すれすれだった。現行は最低 23.8
    for (const p of PALETTES) {
      for (let i = 0; i < p.structures.length; i++) {
        expect(deltaE(p.accent, p.structures[i]), `${p.id}: accent vs structures[${i}]`).toBeGreaterThanOrEqual(
          MIN_ACCENT_STRUCTURE_DELTA_E
        )
      }
    }
  })

  it('Night は空が最も暗く、そのぶん球体が最も際立つ', () => {
    // **Night を4種から外さなかった理由がこれ**。クリスタル球を置くなら映えるのは夜。
    // 「暗いから使えない」ではなく「暗いことが主役を光らせている」ほうが実測に合う
    const night = PALETTES[3]
    expect(night.id).toBe('night')
    for (const p of PALETTES) {
      if (p.id === 'night') continue
      expect(brightness(night.sky), `${p.id} より暗い`).toBeLessThan(brightness(p.sky))
      expect(deltaE(BALL_COLOR, night.sky), `${p.id} より球体が際立つ`).toBeGreaterThan(deltaE(BALL_COLOR, p.sky))
    }
  })
})

describe('deltaE', () => {
  it('同じ色の距離は0', () => {
    expect(deltaE('#123456', '#123456')).toBe(0)
  })

  it('黒と白が最も遠い(L* の全域なのでおおむね100)', () => {
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(100, 0)
  })

  it('対称である', () => {
    expect(deltaE('#e0663c', '#bcd9e6')).toBeCloseTo(deltaE('#bcd9e6', '#e0663c'), 10)
  })

  it('近い色ほど小さい', () => {
    expect(deltaE('#808080', '#828282')).toBeLessThan(deltaE('#808080', '#a0a0a0'))
  })
})

describe('色ユーティリティ', () => {
  it('parseHex は # の有無を問わない', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('ff8000')).toEqual([255, 128, 0])
  })

  it('parseHex は不正値で投げる', () => {
    expect(() => parseHex('#xyz')).toThrow()
    expect(() => parseHex('#fff')).toThrow()
  })

  it('mixHex は端点で元の色を返す', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('shadeHex は正で白へ、負で黒へ寄せる', () => {
    expect(shadeHex('#808080', 1)).toBe('#ffffff')
    expect(shadeHex('#808080', -1)).toBe('#000000')
    expect(shadeHex('#808080', 0)).toBe('#808080')
  })
})

describe('lerpPalette', () => {
  it('端点で元のパレットに一致する', () => {
    const a = PALETTES[0]
    const b = PALETTES[3]
    expect(lerpPalette(a, b, 0).sky).toBe(a.sky)
    expect(lerpPalette(a, b, 1).sky).toBe(b.sky)
    expect(lerpPalette(a, b, 0).ground).toBe(a.ground)
    expect(lerpPalette(a, b, 1).structures[2]).toBe(b.structures[2])
  })

  it('数値フィールドも連続に混ざる', () => {
    const a = PALETTES[0]
    const b = PALETTES[3]
    const mid = lerpPalette(a, b, 0.5)
    expect(mid.fogNear).toBeCloseTo((a.fogNear + b.fogNear) / 2, 5)
    expect(mid.key.intensity).toBeCloseTo((a.key.intensity + b.key.intensity) / 2, 5)
    expect(mid.key.position[1]).toBeCloseTo((a.key.position[1] + b.key.position[1]) / 2, 5)
  })

  it('混ぜた結果も正しい16進のまま', () => {
    const mid = lerpPalette(PALETTES[1], PALETTES[2], 0.37)
    for (const hex of [...declaredSurfaceColors(mid), mid.sky, mid.shadowColor]) {
      expect(isHex(hex)).toBe(true)
    }
  })
})

it('大気の保持幅はカードがステージに乗っている間を純色に保てる', () => {
  expect(ATMOSPHERE_HOLD).toBeGreaterThan(0)
  // 0.5 以上にすると保持どうしが重なって渡す区間が消える
  expect(ATMOSPHERE_HOLD).toBeLessThan(0.5)
})
