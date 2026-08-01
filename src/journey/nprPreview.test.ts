import { describe, it, expect } from 'vitest'
import {
  LIGHTING_PRESETS,
  MAX_CONTRAST_LEVEL,
  OUTLINE_DEFAULTS,
  HULL_DEFAULTS,
  getHullTuning,
  getLightingPreset,
  getOutlineTuning,
  isHullPreview,
  isOutlinePreview,
  parseContrastLevel,
} from './nprPreview'

describe('parseContrastLevel', () => {
  it('クエリが無ければ0(現行維持)', () => {
    expect(parseContrastLevel('')).toBe(0)
    expect(parseContrastLevel('?toon=1')).toBe(0)
  })

  it('値なしの ?contrast は1とみなす', () => {
    expect(parseContrastLevel('?contrast')).toBe(1)
    expect(parseContrastLevel('?contrast=')).toBe(1)
  })

  it('数値をそのまま段階として読む', () => {
    expect(parseContrastLevel('?contrast=0')).toBe(0)
    expect(parseContrastLevel('?contrast=1')).toBe(1)
    expect(parseContrastLevel('?contrast=2')).toBe(2)
  })

  it('範囲外はクランプする(存在しないプリセットを引いてundefinedにしない)', () => {
    expect(parseContrastLevel('?contrast=99')).toBe(MAX_CONTRAST_LEVEL)
    expect(parseContrastLevel('?contrast=-5')).toBe(0)
  })

  it('不正値は0へ倒す', () => {
    expect(parseContrastLevel('?contrast=abc')).toBe(0)
  })
})

describe('LIGHTING_PRESETS', () => {
  it('レベル0は現行の実測値。スイッチ無しで絵が変わらないことの担保', () => {
    expect(LIGHTING_PRESETS[0]).toEqual({
      ambientIntensity: 0.55,
      keyIntensity: 1.6,
      rimIntensity: 0.6,
      environmentIntensity: 0.7,
      toonFloor: 90,
    })
  })

  it('段が上がるほど ambient は下がり key は上がる(コントラストの定義そのもの)', () => {
    for (let i = 1; i < LIGHTING_PRESETS.length; i++) {
      expect(LIGHTING_PRESETS[i].ambientIntensity).toBeLessThan(LIGHTING_PRESETS[i - 1].ambientIntensity)
      expect(LIGHTING_PRESETS[i].keyIntensity).toBeGreaterThan(LIGHTING_PRESETS[i - 1].keyIntensity)
    }
  })

  it('段が上がるほど gradientMap の底が下がる(影が実際に深くなる)', () => {
    for (let i = 1; i < LIGHTING_PRESETS.length; i++) {
      expect(LIGHTING_PRESETS[i].toonFloor).toBeLessThan(LIGHTING_PRESETS[i - 1].toonFloor)
    }
  })

  it('environmentIntensity は動かさない(MeshToonMaterialはenvMap非対応で段に効かず、球だけ暗くなるため)', () => {
    for (const preset of LIGHTING_PRESETS) {
      expect(preset.environmentIntensity).toBe(LIGHTING_PRESETS[0].environmentIntensity)
    }
  })

  it('getLightingPreset はクエリからプリセットを引く', () => {
    expect(getLightingPreset('?contrast=2')).toBe(LIGHTING_PRESETS[2])
    expect(getLightingPreset('')).toBe(LIGHTING_PRESETS[0])
  })
})

describe('スイッチの有無判定', () => {
  it('値が0でもキーがあれば有効(?toon=1 と同じ idiom)', () => {
    expect(isOutlinePreview('?outline=1')).toBe(true)
    expect(isOutlinePreview('?outline')).toBe(true)
    expect(isOutlinePreview('?hull=1')).toBe(false)
    expect(isHullPreview('?hull=1')).toBe(true)
    expect(isHullPreview('')).toBe(false)
  })

  it('他のQAスイッチと併用できる', () => {
    const search = '?freezeWind=1&hideVeil=1&toon=1&outline=1&hull=1&contrast=2'
    expect(isOutlinePreview(search)).toBe(true)
    expect(isHullPreview(search)).toBe(true)
    expect(parseContrastLevel(search)).toBe(2)
  })
})

describe('getOutlineTuning', () => {
  it('未指定なら既定値', () => {
    expect(getOutlineTuning('?outline=1')).toEqual(OUTLINE_DEFAULTS)
  })

  it('個別に上書きできる(パラメータを極端に振って差分を測るため)', () => {
    const tuning = getOutlineTuning('?outline=1&olThickness=6&olDepth=0.001&olStrength=1')
    expect(tuning.thickness).toBe(6)
    expect(tuning.depthThreshold).toBe(0.001)
    expect(tuning.strength).toBe(1)
    // 触っていないものは既定値のまま
    expect(tuning.fadeFar).toBe(OUTLINE_DEFAULTS.fadeFar)
  })

  it('不正値は既定値へ倒す(NaNがuniformに入って画面が消えるのを防ぐ)', () => {
    const tuning = getOutlineTuning('?outline=1&olThickness=abc&olDepth=')
    expect(tuning.thickness).toBe(OUTLINE_DEFAULTS.thickness)
    expect(tuning.depthThreshold).toBe(OUTLINE_DEFAULTS.depthThreshold)
  })

  it('色は # 有無どちらでも読める(URLでは # 以降がフラグメント扱いになるため)', () => {
    expect(getOutlineTuning('?olColor=ff0000').color).toBe('#ff0000')
    expect(getOutlineTuning('?olColor=%23ff0000').color).toBe('#ff0000')
    expect(getOutlineTuning('?olColor=zzz').color).toBe(OUTLINE_DEFAULTS.color)
  })
})

describe('getHullTuning', () => {
  it('未指定なら既定値', () => {
    expect(getHullTuning('?hull=1')).toEqual(HULL_DEFAULTS)
  })

  it('線幅と色を上書きできる', () => {
    const tuning = getHullTuning('?hull=1&hullWidth=0.2&hullColor=112233')
    expect(tuning.width).toBe(0.2)
    expect(tuning.color).toBe('#112233')
  })
})
