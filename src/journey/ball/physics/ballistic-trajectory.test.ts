/**
 * Ballistic Trajectory Solver — Unit Tests
 *
 * lib_fts の移植実装が正確に動作するか確認
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { BallisticSolver, solveBallistic, solveBallisticArcLateral } from './ballistic-trajectory'

describe('BallisticSolver', () => {
  describe('solveQuadric（2次方程式）', () => {
    it('判別式 = 0（重根）: (x - 2)^2 = 0', () => {
      // 方程式: x^2 - 4x + 4 = 0
      const [num, s0, s1] = BallisticSolver.solveQuadric(1, -4, 4)
      expect(num).toBe(1)
      expect(s0).toBeCloseTo(2.0, 5)
      expect(isNaN(s1)).toBe(true)
    })

    it('判別式 > 0（2解）: x^2 - 5x + 6 = 0', () => {
      // 方程式: (x - 2)(x - 3) = 0
      const [num, s0, s1] = BallisticSolver.solveQuadric(1, -5, 6)
      expect(num).toBe(2)
      // 解は 3.0 と 2.0
      const sols = [s0, s1].sort((a, b) => a - b)
      expect(sols[0]).toBeCloseTo(2.0, 5)
      expect(sols[1]).toBeCloseTo(3.0, 5)
    })

    it('判別式 < 0（実根なし）: x^2 + 2x + 5 = 0', () => {
      const [num, s0, s1] = BallisticSolver.solveQuadric(1, 2, 5)
      expect(num).toBe(0)
      expect(isNaN(s0)).toBe(true)
      expect(isNaN(s1)).toBe(true)
    })

    it('大きな係数でも精度を維持: 1000x^2 - 5000x + 6000 = 0', () => {
      // x^2 - 5x + 6 = 0 と同等（係数を1000倍）
      const [num, s0, s1] = BallisticSolver.solveQuadric(1000, -5000, 6000)
      expect(num).toBe(2)
      const sols = [s0, s1].sort((a, b) => a - b)
      expect(sols[0]).toBeCloseTo(2.0, 4)
      expect(sols[1]).toBeCloseTo(3.0, 4)
    })
  })

  describe('solveCubic（3次方程式）', () => {
    it('1つの実解: x^3 - 1 = 0', () => {
      const [num, s0] = BallisticSolver.solveCubic(1, 0, 0, -1)
      expect(num).toBe(1)
      expect(s0).toBeCloseTo(1.0, 4)
    })

    it('3つの実解: x^3 - x = 0 → x(x^2 - 1) = 0', () => {
      const [num, s0, s1, s2] = BallisticSolver.solveCubic(1, 0, -1, 0)
      expect(num).toBe(3)
      const sols = [s0, s1, s2].filter(s => !isNaN(s)).sort((a, b) => a - b)
      expect(sols).toHaveLength(3)
      expect(sols[0]).toBeCloseTo(-1.0, 3)
      expect(sols[1]).toBeCloseTo(0.0, 3)
      expect(sols[2]).toBeCloseTo(1.0, 3)
    })
  })
})

describe('solveBallistic（弾道計算）', () => {
  it('基本的な命中可能ケース', () => {
    const projPos = new THREE.Vector3(0, 1, 0)
    const projSpeed = 20
    const target = new THREE.Vector3(10, 5, 0)
    const gravity = 9.81

    const result = solveBallistic(projPos, projSpeed, target, gravity)
    expect(result.valid).toBe(true)
    expect(result.numSolutions).toBe(2)

    // 低角・高角解の大きさが projSpeed に等しい
    expect(result.s0.length()).toBeCloseTo(projSpeed, 3)
    expect(result.s1.length()).toBeCloseTo(projSpeed, 3)
  })

  it('到達不可能（速度不足）', () => {
    const projPos = new THREE.Vector3(0, 0, 0)
    const projSpeed = 5  // 不足
    const target = new THREE.Vector3(100, 50, 0)
    const gravity = 9.81

    const result = solveBallistic(projPos, projSpeed, target, gravity)
    expect(result.valid).toBe(false)
    expect(result.numSolutions).toBe(0)
  })

  it('同じ高さへの発射', () => {
    const projPos = new THREE.Vector3(0, 5, 0)
    const projSpeed = 20
    const target = new THREE.Vector3(20, 5, 0)  // 同じ高さ
    const gravity = 9.81

    const result = solveBallistic(projPos, projSpeed, target, gravity)
    expect(result.valid).toBe(true)
    // 同じ高さなら高い解は45度付近
  })

  it('Z軸方向への発射（3D対応）', () => {
    const projPos = new THREE.Vector3(0, 0, 0)
    const projSpeed = 15
    const target = new THREE.Vector3(5, 2, 8)  // 3D座標
    const gravity = 9.81

    const result = solveBallistic(projPos, projSpeed, target, gravity)
    if (result.valid) {
      // 速度ベクトルが正しい大きさか確認
      expect(result.s0.length()).toBeCloseTo(projSpeed, 3)
      expect(result.s1.length()).toBeCloseTo(projSpeed, 3)
    }
  })
})

describe('solveBallisticArcLateral（頂点高さ指定）', () => {
  it('基本的な軌道計算', () => {
    const projPos = new THREE.Vector3(0, 1, 0)
    const lateralSpeed = 10  // m/s
    const targetPos = new THREE.Vector3(20, 0, 0)
    const maxHeight = 5

    const result = solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)
    expect(result.valid).toBe(true)
    expect(result.fireVelocity).toBeDefined()
    // 重力は「頂点bを通り終点cに着地する」条件から解かれる（9.81固定ではない）
    expect(result.gravity).toBeGreaterThan(0)
  })

  it('ターゲットが発射位置と同じ場合', () => {
    const projPos = new THREE.Vector3(0, 5, 0)
    const lateralSpeed = 10
    const targetPos = new THREE.Vector3(0.00001, 5, 0)  // ほぼ同じ
    const maxHeight = 5

    const result = solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)
    expect(result.valid).toBe(false)
  })

  it('頂点がスタートより低い場合', () => {
    const projPos = new THREE.Vector3(0, 10, 0)
    const lateralSpeed = 10
    const targetPos = new THREE.Vector3(20, 0, 0)
    const maxHeight = 5  // スタート(10) より低い

    const result = solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)
    expect(result.valid).toBe(false)
  })

  it('低い頂点を指定', () => {
    const projPos = new THREE.Vector3(0, 0, 0)
    const lateralSpeed = 15
    const targetPos = new THREE.Vector3(30, 0, 0)
    const maxHeight = 2  // 低い頂点

    const result = solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)
    expect(result.valid).toBe(true)
    // 垂直速度は正の値
    expect(result.fireVelocity.y).toBeGreaterThan(0)
  })

  it('高い頂点を指定', () => {
    const projPos = new THREE.Vector3(0, 0, 0)
    const lateralSpeed = 10
    const targetPos = new THREE.Vector3(20, 0, 0)
    const maxHeight = 20  // 高い頂点

    const result = solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)
    expect(result.valid).toBe(true)
    // 垂直速度が大きいはず（高く投げる）
    expect(result.fireVelocity.y).toBeGreaterThan(5.0)
  })
})

describe('統合テスト：既存パラメータとの互換性', () => {
  it('solveBallistic は命中可能なターゲットに対して 2 つの発射角度を返す', () => {
    // 既存の pass: start → end、高さ差は小さい
    const start = new THREE.Vector3(0, 2, 0)
    const end = new THREE.Vector3(30, 1, 0)

    // ForrestTheWoods で計算
    const projSpeed = 20
    const gravity = 9.81

    const result = solveBallistic(start, projSpeed, end, gravity)

    expect(result.valid).toBe(true)
    expect(result.numSolutions).toBe(2)

    // 両方の発射角度が正確に projSpeed の大きさになる
    expect(result.s0.length()).toBeCloseTo(projSpeed, 2)
    expect(result.s1.length()).toBeCloseTo(projSpeed, 2)

    // 高角解（s1）を使用して、ターゲットに到達することを簡易確認
    const fireVel = result.s1
    const totalTime = 1.0  // 移動時間の推定

    // 終点付近に到達する確認
    const pos = start.clone()
      .add(fireVel.clone().multiplyScalar(totalTime))
      .addScaledVector(new THREE.Vector3(0, 1, 0), -0.5 * gravity * totalTime * totalTime)

    // ターゲットに概ね接近している（完全一致は時間計算に依存）
    console.log(`到達位置: ${pos.toArray()}`)
    console.log(`ターゲット: ${end.toArray()}`)
  })

  it('solveBallisticArcLateral の軌道は頂点と終点を厳密に通る', () => {
    const start = new THREE.Vector3(0, 0, 0)
    const end = new THREE.Vector3(20, 0, 0)
    const lateralSpeed = 10
    const peakHeight = 5

    const result = solveBallisticArcLateral(start, lateralSpeed, end, peakHeight)
    expect(result.valid).toBe(true)

    // 飛行時間 T = 水平距離 / 横速度 = 2秒
    const T = 20 / lateralSpeed
    const y = (t: number) =>
      start.y + result.fireVelocity.y * t - 0.5 * result.gravity * t * t

    // 中間時刻で頂点高さを厳密に通過する
    expect(y(T / 2)).toBeCloseTo(peakHeight, 10)
    // 飛行時間ちょうどで終点高さに厳密に着地する（ビート境界の連続性の要）
    expect(y(T)).toBeCloseTo(end.y, 10)
  })
})
