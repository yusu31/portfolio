// スイッシュ区間(設計書§6)の回帰テスト。
//
// このビートの存在理由は「ネットを実装した瞬間にボールが網を真横に突き抜ける」破綻を
// 防ぐことなので、テストも**ネットとの幾何学的関係**を直接検証する。
// ネット寸法(nets/basketNetGeometry.ts)とアンカー(anchors.ts)を実際にimportして測るので、
// どちらかを動かせばここが落ちる。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { RING_CENTER, RING_RADIUS, SWISH_EXIT, SWISH_EXIT_Y, SWISH_DRIFT, FALL_LANDING } from '../anchors'
import { RING_U, SWISH_END, SWISH_SPAN, FALL_END } from '../beats'
import { NET_LENGTH } from '../../nets/basketNetGeometry'
import { getBallPose } from '../ballPath'
import { swishPosition } from './swish'
import { BALL_RADIUS } from '../roll'

/** ネット下端の高さ(リング平面からNET_LENGTHだけ下) */
const NET_BOTTOM_Y = RING_CENTER.y - NET_LENGTH

/** リング軸(鉛直)からの水平距離 */
function offsetFromRingAxis(p: THREE.Vector3): number {
  return Math.hypot(p.x - RING_CENTER.x, p.z - RING_CENTER.z)
}

describe('swishPosition(区間そのもの)', () => {
  it('t=0で始点、t=1で終点に厳密一致する(ビート継ぎ目の規約)', () => {
    const a = new THREE.Vector3(1, 10, 2)
    const b = new THREE.Vector3(3, 4, 5)
    expect(swishPosition(a, b, 0).distanceTo(a)).toBeLessThan(1e-9)
    expect(swishPosition(a, b, 1).distanceTo(b)).toBeLessThan(1e-9)
  })

  it('始点で鉛直速度ゼロの自由落下になっている(y = a + (c-a)t²)', () => {
    const a = new THREE.Vector3(0, 10, 0)
    const b = new THREE.Vector3(0, 2, 0)
    for (const t of [0.25, 0.5, 0.75]) {
      expect(swishPosition(a, b, t).y).toBeCloseTo(10 + (2 - 10) * t * t, 9)
    }
  })

  it('落下が単調(途中で持ち上がらない)', () => {
    let prev = Infinity
    for (let i = 0; i <= 50; i++) {
      const y = swishPosition(RING_CENTER, SWISH_EXIT, i / 50).y
      expect(y).toBeLessThanOrEqual(prev)
      prev = y
    }
  })
})

describe('SWISH_EXIT(アンカー)', () => {
  it('水平ドリフトがSWISH_DRIFTちょうど', () => {
    expect(offsetFromRingAxis(SWISH_EXIT)).toBeCloseTo(SWISH_DRIFT, 9)
  })

  it('高さがSWISH_EXIT_Yで、ネット下端より下まで抜けきっている', () => {
    expect(SWISH_EXIT.y).toBe(SWISH_EXIT_Y)
    expect(SWISH_EXIT.y).toBeLessThan(NET_BOTTOM_Y)
  })

  it('ドリフトの向きがFALL_LANDING側を向いている(逆走しない)', () => {
    const toLanding = new THREE.Vector3(FALL_LANDING.x - RING_CENTER.x, 0, FALL_LANDING.z - RING_CENTER.z).normalize()
    const drift = new THREE.Vector3(SWISH_EXIT.x - RING_CENTER.x, 0, SWISH_EXIT.z - RING_CENTER.z).normalize()
    expect(drift.dot(toLanding)).toBeCloseTo(1, 9)
  })
})

describe('ネットとの幾何学的整合(このビートの存在理由)', () => {
  it('ネットの鉛直範囲を通る間、ボールがリング半径の内側に収まる', () => {
    // ボールはネット下端半径1.25を押し広げて通るが、リングの投影円筒からは出ない。
    // ここが破れると「ボールが網の横腹を突き破る」絵になる
    let maxReach = 0
    for (let i = 0; i <= 2000; i++) {
      const u = RING_U + (SWISH_END - RING_U) * (i / 2000)
      const p = getBallPose(u).position
      if (p.y > RING_CENTER.y || p.y < NET_BOTTOM_Y) continue
      maxReach = Math.max(maxReach, offsetFromRingAxis(p) + BALL_RADIUS)
    }
    expect(maxReach).toBeGreaterThan(0) // 区間がネットを実際に通過していること
    expect(maxReach).toBeLessThan(RING_RADIUS)
  })

  it('ネット下端(y=2.15)へ到達する時点の水平ズレがドリフト上限以内', () => {
    let hit: THREE.Vector3 | null = null
    for (let i = 0; i <= 4000; i++) {
      const u = RING_U + (FALL_END - RING_U) * (i / 4000)
      const p = getBallPose(u).position
      if (p.y <= NET_BOTTOM_Y) { hit = p; break }
    }
    expect(hit).not.toBeNull()
    expect(offsetFromRingAxis(hit!)).toBeLessThanOrEqual(SWISH_DRIFT)
  })

  it('リング半径の外へ出るまでに十分落下している(旧実装は0.020しか落ちなかった)', () => {
    let dropAtExit = 0
    for (let i = 0; i <= 4000; i++) {
      const u = RING_U + (FALL_END - RING_U) * (i / 4000)
      const p = getBallPose(u).position
      if (offsetFromRingAxis(p) >= RING_RADIUS) { dropAtExit = RING_CENTER.y - p.y; break }
    }
    // 設計書§1.2の実測0.020に対し、スイッシュ導入後はネット全長5.25を超える
    expect(dropAtExit).toBeGreaterThan(NET_LENGTH)
  })
})

describe('ビート境界', () => {
  it('RING_UでRING_CENTERに一致する構造保証を壊していない', () => {
    expect(getBallPose(RING_U).position.distanceTo(RING_CENTER)).toBeLessThan(1e-9)
  })

  it('SWISH_ENDでSWISH_EXITに一致する', () => {
    expect(getBallPose(SWISH_END).position.distanceTo(SWISH_EXIT)).toBeLessThan(1e-9)
  })

  it('区間長が設計書§6.3のΔu≈0.02', () => {
    expect(SWISH_SPAN).toBeCloseTo(0.02, 9)
    expect(SWISH_END).toBeLessThan(FALL_END)
  })
})
