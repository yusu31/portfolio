import { describe, expect, it } from 'vitest'
import {
  AT_QUERY,
  CAMERA_DISTANCE,
  CAMERA_ELEVATION_DEG,
  CAMERA_FOV,
  CARDS,
  CARD_SPACING,
  BALL_COLOR,
  BALL_RADIUS,
  QA_ASPECT,
  SHADOW_CENTER_Z,
  SHADOW_RADIUS,
  apparentHeroFraction,
  atmosphereAt,
  ballSpin,
  stageBob,
  cameraPose,
  cardBob,
  cardPalette,
  cardZ,
  currentSearch,
  islandBottom,
  islandTopCorners,
  isOnScreen,
  maxProgress,
  overrideProgress,
  parseAtOverride,
  parseCardOverride,
  parseChainEnabled,
  parsePaletteOverride,
  progressAt,
  projectToScreen,
  resolveCard,
} from './cards'
import { ISLAND_SPAN } from './island'
import { PALETTES } from './palette'

describe('CARDS', () => {
  it('4枚あり、idが重複しない', () => {
    expect(CARDS).toHaveLength(4)
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(4)
  })

  it('4つのパレットを1枚ずつ使う(1画面に4つの世界が並ぶ)', () => {
    expect(CARDS.map((c) => c.paletteIndex).sort()).toEqual([0, 1, 2, 3])
  })

  it('物語(体育教師 → エンジニア)の順に並ぶ', () => {
    expect(CARDS.map((c) => c.id)).toEqual(['gym', 'field', 'court', 'desk'])
  })

  it('タイトルと説明が入っている', () => {
    for (const c of CARDS) {
      expect(c.title.length, c.id).toBeGreaterThan(0)
      expect(c.caption.length, c.id).toBeGreaterThan(0)
    }
  })

  // ②の「同じアセットで別の世界」。カードごとに違うのは重み・シード・パレットだけで、
  // 使えるモジュールの集合は4枚とも同じでなければ「モジュラー」と言えない
  it('4枚とも同じモジュール集合の上で重みだけが違う', () => {
    const sets = CARDS.map((c) => [...c.weights.map((w) => w.kind)].sort().join(','))
    expect(new Set(sets).size).toBe(1)
    const weights = CARDS.map((c) => JSON.stringify(c.weights))
    expect(new Set(weights).size).toBe(CARDS.length)
  })

  it('シードが4枚とも違う', () => {
    expect(new Set(CARDS.map((c) => c.seed)).size).toBe(4)
  })

  it('主役のタイルは走路の列を避ける', () => {
    for (const c of CARDS) expect(c.heroTile[0], c.id).not.toBe(3)
  })

  // 世界観の整合。移動するのは球体なので、鉄道のモジュールは1つも使わない
  it('鉄道の語彙をどのカードも使っていない', () => {
    for (const c of CARDS) {
      for (const kind of c.weights.map((x) => x.kind)) {
        expect(['rail', 'platform', 'tower', 'yard', 'field'], c.id).not.toContain(kind)
      }
    }
  })
})

describe('旅をする球体', () => {
  it('走路の上に乗る大きさ(道幅を超えない)', () => {
    // 走路の舗装幅 = TILE * 0.82
    expect(BALL_RADIUS * 2).toBeLessThan(3.2 * 0.82)
  })

  it('進んだ距離と転がりが噛み合う(空回りしない)', () => {
    // 1カード進む = CARD_SPACING だけ地面が流れる = その距離/半径 だけ回る
    const delta = ballSpin(1) - ballSpin(0)
    expect(delta).toBeCloseTo(CARD_SPACING / BALL_RADIUS, 9)
  })

  it('止まっていれば回らない', () => {
    expect(ballSpin(0)).toBe(0)
    expect(ballSpin(2) - ballSpin(2)).toBe(0)
  })

  it('接地の高さが連続している(カードが切り替わる瞬間に跳ねない)', () => {
    let prev = stageBob(0, 3.7)
    for (let p = 0.01; p <= maxProgress(); p += 0.01) {
      const now = stageBob(p, 3.7)
      expect(Math.abs(now - prev), `p=${p.toFixed(2)}`).toBeLessThan(0.02)
      prev = now
    }
  })

  it('球体はパレットに従わない(4つの世界を通して同じ色)', () => {
    expect(/^#[0-9a-f]{6}$/i.test(BALL_COLOR)).toBe(true)
    for (const p of PALETTES) {
      expect(BALL_COLOR, p.id).not.toBe(p.accent)
      expect(BALL_COLOR, p.id).not.toBe(p.ground)
    }
  })
})

describe('カードの並びと運動', () => {
  it('カード間隔は島の一辺より広い(カードどうしが食い合わない)', () => {
    expect(CARD_SPACING).toBeGreaterThan(ISLAND_SPAN)
  })

  it('p = i でカード i がステージ(z=0)に乗る', () => {
    for (let i = 0; i < CARDS.length; i++) expect(cardZ(i, i)).toBeCloseTo(0, 9)
  })

  it('p が増えると全カードがカメラ側(+Z)へ流れる', () => {
    for (let i = 0; i < CARDS.length; i++) {
      expect(cardZ(i, i + 0.5)).toBeGreaterThan(cardZ(i, i))
    }
  })

  it('まだ来ていないカードは奥(-Z)にいる', () => {
    expect(cardZ(2, 0)).toBeLessThan(0)
    expect(cardZ(3, 0)).toBeLessThan(cardZ(2, 0))
  })

  it('progressAt はスクロールを 0〜(枚数-1) に写す', () => {
    expect(progressAt(0)).toBe(0)
    expect(progressAt(1)).toBe(maxProgress())
    expect(progressAt(0.5)).toBeCloseTo(maxProgress() / 2, 9)
    expect(progressAt(-2)).toBe(0)
    expect(progressAt(9)).toBe(maxProgress())
  })

  it('resolveCard は一番近いカードを返す', () => {
    expect(resolveCard(0)).toEqual({ index: 0, local: 0 })
    expect(resolveCard(0.4).index).toBe(0)
    expect(resolveCard(0.6).index).toBe(1)
    expect(resolveCard(0.6).local).toBeCloseTo(0.6, 9)
    expect(resolveCard(99).index).toBe(CARDS.length - 1)
    expect(resolveCard(-5).index).toBe(0)
  })

  it('揺れは有界で、時刻0でもカードごとに位相がずれている', () => {
    for (let t = 0; t < 30; t += 0.37) {
      for (let i = 0; i < CARDS.length; i++) expect(Math.abs(cardBob(i, t))).toBeLessThanOrEqual(0.34)
    }
    expect(cardBob(0, 0)).not.toBeCloseTo(cardBob(1, 0), 3)
  })
})

// --- C の骨子: カメラが動かないこと ---------------------------------------

describe('固定カメラ', () => {
  it('カメラ姿勢は引数を取らず、何度呼んでも同じ', () => {
    const a = cameraPose()
    const b = cameraPose()
    expect(a.position).toEqual(b.position)
    expect(a.target).toEqual(b.target)
  })

  it('ステージの真上から見下ろす位置にいる', () => {
    const { position, target } = cameraPose()
    expect(Math.hypot(position[0], position[1] - 0, position[2])).toBeCloseTo(CAMERA_DISTANCE, 6)
    expect(position[1]).toBeGreaterThan(0)
    // 仰角ぶんだけ高い
    expect(position[1]).toBeCloseTo(Math.sin((CAMERA_ELEVATION_DEG * Math.PI) / 180) * CAMERA_DISTANCE, 6)
    expect(target[0]).toBe(0)
    expect(target[2]).toBe(0)
  })

  // 参考例②③④はアイソメ寄りの俯瞰。B(一点透視)は fov55 だったので、C はその真逆側に置く
  it('画角が狭くアイソメ寄り(B の広角と真逆)', () => {
    expect(CAMERA_FOV).toBeLessThanOrEqual(35)
    expect(CAMERA_ELEVATION_DEG).toBeGreaterThanOrEqual(25)
    expect(CAMERA_ELEVATION_DEG).toBeLessThanOrEqual(55)
  })

  it('投影はカメラ背後を弾く', () => {
    const behind = projectToScreen([0, 0, 400])
    expect(behind.depth).toBeLessThan(0)
    expect(isOnScreen([0, 0, 400])).toBe(false)
  })

  it('注視点は画面のほぼ中央に来る', () => {
    const p = projectToScreen(cameraPose().target)
    expect(Math.abs(p.x)).toBeLessThan(1e-6)
    expect(Math.abs(p.y)).toBeLessThan(1e-6)
  })
})

// --- 構図の成立条件 -------------------------------------------------------

describe('ステージのカードが画面に収まる', () => {
  it('4隅すべてが画面内', () => {
    for (let i = 0; i < CARDS.length; i++) {
      for (const corner of islandTopCorners(i, i)) {
        const s = projectToScreen(corner)
        expect(Math.abs(s.x), `${CARDS[i].id}/x`).toBeLessThan(1)
        expect(Math.abs(s.y), `${CARDS[i].id}/y`).toBeLessThan(1)
      }
    }
  })

  it('浮島の底も画面内(切り取られた世界として下端まで見える)', () => {
    for (let i = 0; i < CARDS.length; i++) {
      expect(isOnScreen(islandBottom(i, i)), CARDS[i].id).toBe(true)
    }
  })

  it('画面の上側に次のカードのための余白が残っている', () => {
    // ステージのカードの一番上(奥の辺)が画面上端に達していないこと
    const tops = islandTopCorners(0, 0).map((c) => projectToScreen(c).y)
    expect(Math.max(...tops)).toBeLessThan(0.6)
  })

  // 構図は1280x800(比1.6)で決めてあるが、ウィンドウを多少細くしても崩れないこと。
  // 比0.75(縦長スマホ)までは持たないので、そこは試作の範囲外と割り切る
  it('比1.2まで細くしても横にはみ出さない', () => {
    for (const corner of islandTopCorners(1, 1)) {
      expect(Math.abs(projectToScreen(corner, 1.2).x)).toBeLessThan(1)
    }
  })
})

describe('カードの列が読める(手前に流れてくる構図)', () => {
  it('1枚先のカードが画面内に見えている', () => {
    for (let i = 0; i < CARDS.length - 1; i++) {
      const visible = islandTopCorners(i + 1, i).filter((c) => isOnScreen(c))
      expect(visible.length, `card ${i} → ${i + 1}`).toBeGreaterThan(0)
    }
  })

  it('奥のカードほど画面の上側に写る', () => {
    const stage = Math.max(...islandTopCorners(0, 0).map((c) => projectToScreen(c).y))
    const next = Math.max(...islandTopCorners(1, 0).map((c) => projectToScreen(c).y))
    expect(next).toBeGreaterThan(stage)
  })

  it('通り過ぎたカードは画面の下へ抜ける', () => {
    // p=1 のときカード0は手前に抜けている
    const corners = islandTopCorners(0, 1).map((c) => projectToScreen(c))
    expect(Math.min(...corners.map((c) => c.y))).toBeLessThan(-1)
  })

  it('奥のカードほどカメラから遠い(フォグが効く順序になる)', () => {
    const d = [0, 1, 2, 3].map((i) => projectToScreen(islandTopCorners(i, 0)[0]).depth)
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1])
  })
})

describe('影の範囲', () => {
  it('ステージのカードと1枚先のカードが両方入る', () => {
    const half = ISLAND_SPAN / 2
    for (const z of [cardZ(0, 0), cardZ(1, 0)]) {
      expect(z + half).toBeLessThanOrEqual(SHADOW_CENTER_Z + SHADOW_RADIUS)
      expect(z - half).toBeGreaterThanOrEqual(SHADOW_CENTER_Z - SHADOW_RADIUS)
    }
  })

  it('横方向にも島がはみ出さない', () => {
    expect(ISLAND_SPAN / 2).toBeLessThan(SHADOW_RADIUS)
  })

  it('無駄に広げない(広いほど影がぼやける)', () => {
    expect(SHADOW_RADIUS).toBeLessThan(CARD_SPACING * 2)
  })
})

describe('共通原則2: 主役を画面の1/4以下に収める', () => {
  it('ステージに乗った状態で1/4を超えない', () => {
    for (let i = 0; i < CARDS.length; i++) {
      expect(apparentHeroFraction(i, i), CARDS[i].id).toBeLessThanOrEqual(0.25)
    }
  })

  it('小さすぎて存在が読めなくなる手前で止める', () => {
    for (let i = 0; i < CARDS.length; i++) {
      expect(apparentHeroFraction(i, i), CARDS[i].id).toBeGreaterThan(0.05)
    }
  })

  it('カメラの背後に回ったら0を返す(値が跳ねない)', () => {
    expect(apparentHeroFraction(0, 10)).toBe(0)
  })
})

// --- パレット運用 ---------------------------------------------------------

describe('cardPalette', () => {
  it('通常は各カードが自分のパレットで塗られる', () => {
    for (let i = 0; i < CARDS.length; i++) {
      expect(cardPalette(i).id).toBe(PALETTES[CARDS[i].paletteIndex].id)
    }
  })

  it('列に並ぶカードのパレットは全部違う(1画面に複数の世界が映る)', () => {
    const ids = CARDS.map((_, i) => cardPalette(i).id)
    expect(new Set(ids).size).toBe(CARDS.length)
  })

  it('?pal 指定で全カードが同じパレットになる(②の売りの実測ノブ)', () => {
    const ids = CARDS.map((_, i) => cardPalette(i, 2).id)
    expect(new Set(ids).size).toBe(1)
    expect(ids[0]).toBe('misty')
  })
})

describe('atmosphereAt', () => {
  it('カードがステージに乗っている前後はそのカードの純色', () => {
    expect(atmosphereAt(0).sky).toBe(PALETTES[CARDS[0].paletteIndex].sky)
    expect(atmosphereAt(0.2).sky).toBe(PALETTES[CARDS[0].paletteIndex].sky)
    expect(atmosphereAt(0.85).sky).toBe(PALETTES[CARDS[1].paletteIndex].sky)
    expect(atmosphereAt(1).sky).toBe(PALETTES[CARDS[1].paletteIndex].sky)
  })

  it('移動している最中だけ次の色へ渡す', () => {
    const mid = atmosphereAt(0.5).sky
    expect(mid).not.toBe(PALETTES[CARDS[0].paletteIndex].sky)
    expect(mid).not.toBe(PALETTES[CARDS[1].paletteIndex].sky)
  })

  it('端まで連続している(どこにも飛びが無い)', () => {
    let prev = atmosphereAt(0)
    for (let p = 0.01; p <= maxProgress(); p += 0.01) {
      const now = atmosphereAt(p)
      const dr = Math.abs(parseInt(now.sky.slice(1, 3), 16) - parseInt(prev.sky.slice(1, 3), 16))
      expect(dr, `p=${p.toFixed(2)}`).toBeLessThan(12)
      prev = now
    }
  })

  it('範囲外はクランプする', () => {
    expect(atmosphereAt(-4).sky).toBe(PALETTES[CARDS[0].paletteIndex].sky)
    expect(atmosphereAt(99).sky).toBe(PALETTES[CARDS[CARDS.length - 1].paletteIndex].sky)
  })

  it('?pal 指定は大気にも効く', () => {
    for (const p of [0, 0.5, 1.7, 3]) expect(atmosphereAt(p, 1).id).toBe('golden')
  })
})

// --- QAクエリ -------------------------------------------------------------

describe('QAクエリ', () => {
  it('?card=N でカードを直接指定する', () => {
    expect(parseCardOverride('?card=2')).toBe(2)
    expect(parseCardOverride('?card=0')).toBe(0)
    expect(parseCardOverride('?card=99')).toBe(CARDS.length - 1)
    expect(parseCardOverride('?card=-4')).toBe(0)
  })

  it('未指定・不正値はスクロール駆動のまま', () => {
    expect(parseCardOverride('')).toBeNull()
    expect(parseCardOverride('?card=')).toBeNull()
    expect(parseCardOverride('?card=abc')).toBeNull()
    expect(parseCardOverride('?leg=2')).toBeNull()
  })

  it('?at の既定は0(カードがステージにぴったり乗った状態)', () => {
    expect(parseAtOverride('')).toBe(0)
    expect(parseAtOverride('?at=')).toBe(0)
    expect(parseAtOverride('?at=zzz')).toBe(0)
    expect(parseAtOverride('?at=0.4')).toBeCloseTo(0.4, 9)
    expect(parseAtOverride('?at=3')).toBe(1)
    expect(parseAtOverride('?at=-1')).toBe(0)
  })

  it('?pal で全カードのパレットを固定する', () => {
    expect(parsePaletteOverride('?pal=3')).toBe(3)
    expect(parsePaletteOverride('?pal=0')).toBe(0)
    expect(parsePaletteOverride('')).toBeNull()
    expect(parsePaletteOverride('?pal=x')).toBeNull()
  })

  it('?chain=0 で列を切る(既定は列あり)', () => {
    expect(parseChainEnabled('')).toBe(true)
    expect(parseChainEnabled('?chain=1')).toBe(true)
    expect(parseChainEnabled('?chain=0')).toBe(false)
    expect(parseChainEnabled('?chain=false')).toBe(false)
  })

  it('overrideProgress は card と at を合成する', () => {
    expect(overrideProgress('?card=1')).toBe(1)
    expect(overrideProgress(`?card=1&${AT_QUERY}=0.5`)).toBeCloseTo(1.5, 9)
    expect(overrideProgress('')).toBeNull()
    // 最後のカードで at=1 を指定しても範囲を超えない
    expect(overrideProgress('?card=3&at=1')).toBe(maxProgress())
  })

  it('ブラウザ外では search が空', () => {
    expect(currentSearch()).toBe('')
  })
})

it('QAのビューポート比はスクリプトのビューポート(1280x800)と一致する', () => {
  expect(QA_ASPECT).toBeCloseTo(1.6, 9)
})
