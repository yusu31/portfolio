// 地面の穴(ground-hole・Issue #327)の回帰テスト。
// diveVeilEnvelope.test.tsと同じ観点(区間外の恒等性・端点・単調性)に加えて、
// 「どの面に穴を配線すべきか」という配置判断そのものを幾何で担保する。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { groundHoleAlpha, GROUND_HOLE_RADIUS, GROUND_HOLE_FEATHER } from './groundHole'
import { diveHoleStrength } from './diveVeilEnvelope'
import { getBallPose } from './ball/ballPath'
import { RING_U, FALL_END } from './ball/beats'
import { DIVE_PEAK_U } from './cameraAttitude'
import { VENUES, COURT_SIZES } from './path'

describe('恒等区間(ダイブ対象外の地面は無傷)', () => {
  it('strength=0ならどの距離でもalphaは厳密に1', () => {
    const N = 200
    for (let i = 0; i <= N; i++) {
      // 距離0(ボール直下)を必ず含める: featherの裾が残る実装だとここで落ちる
      expect(groundHoleAlpha((i / N) * GROUND_HOLE_RADIUS * 2, 0)).toBe(1)
    }
  })

  it('ダイブ区間外の全uで地面が無傷', () => {
    const N = 400
    for (let i = 0; i <= N; i++) {
      const u = i / N
      if (u >= RING_U && u < FALL_END) continue
      expect(groundHoleAlpha(0, diveHoleStrength(u))).toBe(1)
    }
  })
})

describe('穴のプロファイル', () => {
  it('全開時の中心は完全に抜ける', () => {
    expect(groundHoleAlpha(0, 1)).toBe(0)
  })

  it('半径の外はstrengthによらず無傷', () => {
    for (const strength of [0.25, 0.5, 0.75, 1]) {
      expect(groundHoleAlpha(GROUND_HOLE_RADIUS, strength)).toBe(1)
      expect(groundHoleAlpha(GROUND_HOLE_RADIUS + 5, strength)).toBe(1)
    }
  })

  it('中心から外へalphaは単調増加(縁が滑らかに戻る)', () => {
    const N = 100
    let previous = -1
    for (let i = 0; i <= N; i++) {
      const alpha = groundHoleAlpha((i / N) * GROUND_HOLE_RADIUS, 1)
      expect(alpha).toBeGreaterThanOrEqual(previous)
      previous = alpha
    }
  })

  it('strengthが上がるほど中心は抜ける(単調減少)', () => {
    const N = 100
    let previous = 2
    for (let i = 0; i <= N; i++) {
      const alpha = groundHoleAlpha(0, i / N)
      expect(alpha).toBeLessThanOrEqual(previous)
      previous = alpha
    }
  })

  it('半径がfeatherより狭いうちは中心も貫通しない(滲んでから開く)', () => {
    // strength < FEATHER/RADIUS では穴の半径がぼかし幅に埋もれる
    const partial = (GROUND_HOLE_FEATHER / GROUND_HOLE_RADIUS) * 0.5
    const alpha = groundHoleAlpha(0, partial)
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(1)
  })
})

// ---- 配線判断の担保 ----
// 穴が世界のどこまで届くかを実際のボール軌道から求め、「地面とバスケコートには要る/
// バレーコートには要らない」という判断が半径変更で崩れたらテストが落ちるようにする。

/** 穴が地面に影響を与えるuのサンプル(strength>0の区間) */
const DIVE_SAMPLES = 600

function sampleDive<T>(fn: (u: number, strength: number) => T): T[] {
  const out: T[] = []
  for (let i = 0; i <= DIVE_SAMPLES; i++) {
    const u = RING_U + (i / DIVE_SAMPLES) * (FALL_END - RING_U)
    const strength = diveHoleStrength(u)
    if (strength <= 0) continue
    out.push(fn(u, strength))
  }
  return out
}

/** ヴェニューのコート面のワールドAABB(XZ)。venues.tsxのplaneGeometryと同じ導出 */
function courtBounds(center: THREE.Vector3, size: { width: number; depth: number }) {
  return {
    minX: center.x - size.width / 2,
    maxX: center.x + size.width / 2,
    minZ: center.z - size.depth / 2,
    maxZ: center.z + size.depth / 2,
  }
}

/**
 * そのコート面の上で穴が生む**最小alpha**(=最も抜ける度合い)。
 *
 * 「穴の円がAABBと少しでも交差するか」ではなく実際の透け具合で判断する。
 * 交差の有無だけを見ると、半径0.04の穴がコートの角を掠めただけでも「配線が要る」と
 * 判定されてしまい、判断の根拠として使えない(実測: バレーコートがまさにこのケース)
 */
function minCourtAlpha(b: { minX: number; maxX: number; minZ: number; maxZ: number }): number {
  return Math.min(
    ...sampleDive((u, strength) => {
      const ball = getBallPose(u).position
      const nearestX = THREE.MathUtils.clamp(ball.x, b.minX, b.maxX)
      const nearestZ = THREE.MathUtils.clamp(ball.z, b.minZ, b.maxZ)
      return groundHoleAlpha(Math.hypot(ball.x - nearestX, ball.z - nearestZ), strength)
    })
  )
}

describe('配線判断(どの面に穴が要るか)', () => {
  const GROUND = { minX: -35, maxX: 35, minZ: -265, maxZ: 65 } // ScrollJourneyPoc.tsxのGround
  const BASKET = courtBounds(VENUES.skills.center, COURT_SIZES.skills)
  const VOLLEY = courtBounds(VENUES.about.center, COURT_SIZES.about)

  it('穴が開いている間ボールは常に地面の板の上にある(穴が虚空に開かない)', () => {
    const outside = sampleDive((u) => {
      const p = getBallPose(u).position
      const inside = p.x >= GROUND.minX && p.x <= GROUND.maxX && p.z >= GROUND.minZ && p.z <= GROUND.maxZ
      return inside ? null : u
    }).filter((u): u is number => u !== null)
    expect(outside).toEqual([])
  })

  it('バスケコートははっきり抜ける → コート面への配線が必要(実測0.323)', () => {
    // 配線しないとコートが蓋になり、swish直後の「真下に穴が開く」瞬間が見えない
    expect(minCourtAlpha(BASKET)).toBeLessThan(0.5)
  })

  it('バレーコートは実質無傷 → 配線しない判断の根拠(実測0.999997)', () => {
    // 着地間際に半径0.04の穴がコート近端を掠めるだけ。目視できないので素のままにする
    expect(minCourtAlpha(VOLLEY)).toBeGreaterThan(0.99)
  })

  it('バスケのセンターサークルは穴の到達範囲外(素のマテリアルのままでよい)', () => {
    const CENTER_CIRCLE_OUTER = 1.89
    const closest = Math.min(
      ...sampleDive((u, strength) => {
        const p = getBallPose(u).position
        const d = Math.hypot(p.x - VENUES.skills.center.x, p.z - VENUES.skills.center.z)
        return d - GROUND_HOLE_RADIUS * strength
      })
    )
    expect(closest).toBeGreaterThan(CENTER_CIRCLE_OUTER)
  })
})

describe('演出のタイミング', () => {
  it('包絡線のピーク(DIVE_PEAK_U)で穴が最大になる', () => {
    expect(diveHoleStrength(DIVE_PEAK_U)).toBeCloseTo(1, 6)
    expect(groundHoleAlpha(0, diveHoleStrength(DIVE_PEAK_U))).toBeCloseTo(0, 6)
  })

  it('swish直後(リング通過直後)にはもう穴が開き始めている', () => {
    // ネットを抜けた瞬間に真下の床が無傷だと「抜けて落ちる」に繋がらない
    const justAfterRing = RING_U + (FALL_END - RING_U) * 0.1
    expect(groundHoleAlpha(0, diveHoleStrength(justAfterRing))).toBeLessThan(1)
  })

  it('着地(FALL_END)では地面が塞がっている', () => {
    expect(groundHoleAlpha(0, diveHoleStrength(FALL_END))).toBe(1)
  })
})
