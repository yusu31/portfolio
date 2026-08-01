// u軸ベイクVerlet(設計書§3.4)の回帰テスト。
//
// ベイク結果が純関数であることの見返りとして、ランタイム物理では原理的に不可能な
// 「ボール球面に侵入していない」「静定テイル末尾で静止形状に戻る」を直接検証できる。
// 設計書§3.4が単体テスト可能性を方式選定の根拠のひとつに挙げているので、そこを実際に取りに行く。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { RING_CENTER } from '../ball/anchors'
import { RING_U, SWISH_END } from '../ball/beats'
import { getBallPose } from '../ball/ballPath'
import { BALL_RADIUS } from '../ball/roll'
import {
  NET_COLUMNS,
  NET_ROWS,
  NET_SIMULATED_COUNT,
  netRestPositions,
} from './basketNetGeometry'
import {
  BAKE_END_U,
  BAKE_SAMPLES,
  BAKE_START_U,
  BAKE_TABLE_BYTES,
  applyNetWind,
  ensureNetBake,
  getBakeMillis,
  sampleNetBake,
} from './basketNetBake'

const rest = netRestPositions()
const scratch = Array.from({ length: NET_SIMULATED_COUNT }, () => new THREE.Vector3())

function knotsAt(u: number): THREE.Vector3[] {
  return sampleNetBake(u, scratch, rest)
}

/** 最下段(段NET_ROWS)の平均半径。静止形状では1.25 */
function bottomRadiusAt(u: number): number {
  const knots = knotsAt(u)
  let sum = 0
  for (let c = 0; c < NET_COLUMNS; c++) {
    const p = knots[NET_SIMULATED_COUNT - NET_COLUMNS + c]
    sum += Math.hypot(p.x, p.z)
  }
  return sum / NET_COLUMNS
}

/** 静止形状からの最大ズレ */
function driftAt(u: number): number {
  const knots = knotsAt(u)
  let worst = 0
  for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
    worst = Math.max(worst, knots[i].distanceTo(rest[NET_COLUMNS + i]))
  }
  return worst
}

describe('ベイク窓とテーブル', () => {
  it('窓がリング通過の手前で始まり、スイッシュ終端より後で終わる', () => {
    expect(BAKE_START_U).toBeLessThan(RING_U)
    expect(BAKE_END_U).toBeGreaterThan(SWISH_END)
  })

  it('テーブルサイズが設計書§7.1の予算(184KB)ちょうど', () => {
    expect(BAKE_TABLE_BYTES).toBe(BAKE_SAMPLES * NET_SIMULATED_COUNT * 3 * 4)
    expect(BAKE_TABLE_BYTES).toBe(184320)
  })

  it('ベイクが有限値だけを返す(NaN/Infinityで発散していない)', () => {
    const data = ensureNetBake()
    expect(data).toHaveLength(BAKE_SAMPLES * NET_SIMULATED_COUNT * 3)
    for (let i = 0; i < data.length; i++) expect(Number.isFinite(data[i])).toBe(true)
  })

  it('ベイクは1回しか走らない(2回目は同じ参照が返る)', () => {
    expect(ensureNetBake()).toBe(ensureNetBake())
    expect(getBakeMillis()).toBeGreaterThan(0)
  })
})

describe('uの純関数であること(offsetが唯一の真実)', () => {
  it('同一uなら常に同じ結果', () => {
    const u = RING_U + 0.01
    const a = knotsAt(u).map((p) => p.clone())
    const b = knotsAt(u)
    for (let i = 0; i < a.length; i++) expect(a[i].distanceTo(b[i])).toBe(0)
  })

  it('逆再生(降順アクセス)でも同じ値になる', () => {
    const us = [RING_U, RING_U + 0.005, RING_U + 0.01, RING_U + 0.015, SWISH_END]
    const forward = us.map((u) => knotsAt(u).map((p) => p.clone()))
    const backward = [...us].reverse().map((u) => knotsAt(u).map((p) => p.clone())).reverse()
    for (let s = 0; s < us.length; s++) {
      for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
        expect(forward[s][i].distanceTo(backward[s][i])).toBe(0)
      }
    }
  })

  it('隣接uで飛びがない(補間が連続)', () => {
    let worst = 0
    let prev = knotsAt(BAKE_START_U).map((p) => p.clone())
    for (let i = 1; i <= 600; i++) {
      const u = BAKE_START_U + ((BAKE_END_U - BAKE_START_U) * i) / 600
      const cur = knotsAt(u)
      for (let k = 0; k < NET_SIMULATED_COUNT; k++) worst = Math.max(worst, prev[k].distanceTo(cur[k]))
      prev = cur.map((p) => p.clone())
    }
    expect(worst).toBeLessThan(0.4)
  })
})

describe('ボールとの相互作用(片方向カップリング)', () => {
  it('どのuでもネットの結び目がボール球面に侵入していない', () => {
    const ball = new THREE.Vector3()
    let worst = 0
    for (let i = 0; i <= 1000; i++) {
      const u = BAKE_START_U + ((BAKE_END_U - BAKE_START_U) * i) / 1000
      ball.copy(getBallPose(u).position).sub(RING_CENTER)
      const knots = knotsAt(u)
      for (const p of knots) worst = Math.max(worst, BALL_RADIUS - p.distanceTo(ball))
    }
    expect(worst).toBeLessThanOrEqual(0)
  })

  it('ボールが通るとき下端がボール半径を超えて開く(スイッシュの「開いて閉じる」)', () => {
    let maxRadius = 0
    for (let i = 0; i <= 1000; i++) {
      const u = BAKE_START_U + ((BAKE_END_U - BAKE_START_U) * i) / 1000
      maxRadius = Math.max(maxRadius, bottomRadiusAt(u))
    }
    // 静止1.25 → ボール半径1.5を超えて押し広げられる
    expect(maxRadius).toBeGreaterThan(BALL_RADIUS)
  })

  it('ボール軌道はネットの影響を受けない(片方向であること)', () => {
    // ベイク前後でgetBallPoseが変わらない=ネット側からボールへ書き戻していない
    const before = getBallPose(RING_U + 0.01).position.clone()
    ensureNetBake()
    expect(getBallPose(RING_U + 0.01).position.distanceTo(before)).toBe(0)
  })
})

describe('静止形状への収束(窓の継ぎ目で飛ばないこと)', () => {
  it('窓の外では静止形状そのものを返す', () => {
    expect(driftAt(BAKE_START_U - 0.01)).toBe(0)
    expect(driftAt(BAKE_END_U + 0.01)).toBe(0)
  })

  it('窓の先頭ではまだ静止形状(ボールが遠い)', () => {
    expect(driftAt(BAKE_START_U)).toBeLessThan(0.01)
  })

  it('静定テイル末尾で静止形状に戻っている(窓の外との段差がない)', () => {
    // ここが緩むとベイク窓を抜けた瞬間にネットが弾ける
    expect(driftAt(BAKE_END_U - 1e-9)).toBeLessThan(0.02)
  })

  it('スイッシュ中は実際に変形している(テストが素通りでないことの担保)', () => {
    let peak = 0
    for (let i = 0; i <= 400; i++) {
      const u = RING_U + ((SWISH_END - RING_U) * i) / 400
      peak = Math.max(peak, driftAt(u))
    }
    expect(peak).toBeGreaterThan(0.5)
  })
})

describe('アイドルの風', () => {
  it('段が下がるほど大きく揺れる(段0側は静か)', () => {
    const knots = knotsAt(BAKE_START_U - 0.01).map((p) => p.clone())
    applyNetWind(knots, rest, 3.3)
    const rowDrift = (row: number) => {
      let sum = 0
      for (let c = 0; c < NET_COLUMNS; c++) {
        const i = (row - 1) * NET_COLUMNS + c
        sum += knots[i].distanceTo(rest[NET_COLUMNS + i])
      }
      return sum / NET_COLUMNS
    }
    expect(rowDrift(NET_ROWS)).toBeGreaterThan(rowDrift(1))
  })

  it('時刻が同じなら同じ結果(QAの風固定スイッチが効く)', () => {
    const a = knotsAt(BAKE_START_U - 0.01).map((p) => p.clone())
    const b = knotsAt(BAKE_START_U - 0.01).map((p) => p.clone())
    applyNetWind(a, rest, 12.5)
    applyNetWind(b, rest, 12.5)
    for (let i = 0; i < a.length; i++) expect(a[i].distanceTo(b[i])).toBe(0)
  })

  it('振幅が網目より十分小さい(風だけでネットが破綻しない)', () => {
    const knots = knotsAt(BAKE_START_U - 0.01).map((p) => p.clone())
    applyNetWind(knots, rest, 7.7)
    let worst = 0
    for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
      worst = Math.max(worst, knots[i].distanceTo(rest[NET_COLUMNS + i]))
    }
    expect(worst).toBeLessThan(0.5)
  })
})
