/**
 * Ballistic Trajectory Calculation
 *
 * ForrestTheWoods lib_fts から移植（https://github.com/forrestthewoods/lib_fts）
 * MIT License
 *
 * Graphics Gems I の多項式求解アルゴリズムを使用
 * 参考: https://www.forrestthewoods.com/blog/solving_ballistic_trajectories/
 */

import * as THREE from 'three'

/**
 * 弾道軌道計算の中核: 多項式求解器 + 発射速度逆算
 */
export class BallisticSolver {
  /** 数値誤差判定のしきい値（IEEE754 double精度の許容範囲） */
  private static readonly EPS = 1e-9

  /**
   * 値が実質的にゼロかどうかを判定
   * @param d 判定する値
   * @returns ゼロに十分近ければ true
   */
  private static isZero(d: number): boolean {
    return d > -this.EPS && d < this.EPS
  }

  /**
   * 立方根を計算（負の値にも対応）
   * @param value 値
   * @returns 立方根
   */
  private static getCubicRoot(value: number): number {
    if (value > 0) {
      return Math.pow(value, 1 / 3)
    } else if (value < 0) {
      return -Math.pow(-value, 1 / 3)
    } else {
      return 0
    }
  }

  /**
   * 2次方程式を求解: c0*x^2 + c1*x + c2 = 0
   *
   * 正規形 x^2 + px + q = 0 に変換して判別式で解の個数を判定
   *
   * @param c0 2次項の係数
   * @param c1 1次項の係数
   * @param c2 定数項
   * @returns [解の個数, 解1, 解2] (解2は0個/1個の場合は NaN)
   */
  static solveQuadric(
    c0: number,
    c1: number,
    c2: number
  ): [number, number, number] {
    let s0 = NaN
    let s1 = NaN

    // 正規形: x^2 + px + q = 0
    const p = c1 / (2 * c0)
    const q = c2 / c0

    // 判別式: D = p^2 - q
    const D = p * p - q

    if (this.isZero(D)) {
      // 1つの解（重根）
      s0 = -p
      return [1, s0, s1]
    } else if (D < 0) {
      // 実根なし
      return [0, s0, s1]
    } else {
      // 2つの異なる実根
      const sqrt_D = Math.sqrt(D)
      s0 = sqrt_D - p
      s1 = -sqrt_D - p
      return [2, s0, s1]
    }
  }

  /**
   * 3次方程式を求解: c0*x^3 + c1*x^2 + c2*x + c3 = 0
   *
   * Cardanoの公式を使用
   *
   * @param c0 3次項の係数
   * @param c1 2次項の係数
   * @param c2 1次項の係数
   * @param c3 定数項
   * @returns [解の個数, 解1, 解2, 解3]
   */
  static solveCubic(
    c0: number,
    c1: number,
    c2: number,
    c3: number
  ): [number, number, number, number] {
    let s0 = NaN
    let s1 = NaN
    let s2 = NaN
    let num = 0

    // 正規形: x^3 + Ax^2 + Bx + C = 0
    const A = c1 / c0
    const B = c2 / c0
    const C = c3 / c0

    const sq_A = A * A
    const p = (1 / 3) * (-(1 / 3) * sq_A + B)
    const q = (1 / 2) * ((2 / 27) * A * sq_A - (1 / 3) * A * B + C)

    // Cardanoの公式を使用
    const cb_p = p * p * p
    const D = q * q + cb_p

    if (this.isZero(D)) {
      if (this.isZero(q)) {
        // 1つの3重解
        s0 = 0
        num = 1
      } else {
        // 1つの単解と1つの2重解
        const u = this.getCubicRoot(-q)
        s0 = 2 * u
        s1 = -u
        num = 2
      }
    } else if (D < 0) {
      // Casus irreducibilis: 3つの実解
      const phi = (1 / 3) * Math.acos(-q / Math.sqrt(-cb_p))
      const t = 2 * Math.sqrt(-p)

      s0 = t * Math.cos(phi)
      s1 = -t * Math.cos(phi + Math.PI / 3)
      s2 = -t * Math.cos(phi - Math.PI / 3)
      num = 3
    } else {
      // 1つの実解
      const sqrt_D = Math.sqrt(D)
      const u = this.getCubicRoot(sqrt_D - q)
      const v = -this.getCubicRoot(sqrt_D + q)
      s0 = u + v
      num = 1
    }

    // 置換を戻す
    const sub = (1 / 3) * A
    if (num > 0) s0 -= sub
    if (num > 1) s1 -= sub
    if (num > 2) s2 -= sub

    return [num, s0, s1, s2]
  }

  /**
   * 4次方程式を求解: c0*x^4 + c1*x^3 + c2*x^2 + c3*x + c4 = 0
   *
   * (注: 現在の用途ではまだ未使用。移動ターゲット対応時に必要になる)
   *
   * @param c0 4次項の係数
   * @param c1 3次項の係数
   * @param c2 2次項の係数
   * @param c3 1次項の係数
   * @param c4 定数項
   * @returns [解の個数, 解1, 解2, 解3, 解4]
   */
  static solveQuartic(
    c0: number,
    c1: number,
    c2: number,
    c3: number,
    c4: number
  ): [number, number, number, number, number] {
    let s0 = NaN
    let s1 = NaN
    let s2 = NaN
    let s3 = NaN
    let num = 0

    // 正規形: x^4 + Ax^3 + Bx^2 + Cx + D = 0
    const A = c1 / c0
    const B = c2 / c0
    const C = c3 / c0
    const D = c4 / c0

    const sq_A = A * A
    const p = -(3 / 8) * sq_A + B
    const q = (1 / 8) * sq_A * A - (1 / 2) * A * B + C
    const r = -(3 / 256) * sq_A * sq_A + (1 / 16) * sq_A * B - (1 / 4) * A * C + D

    // resolvent cubic を求解
    const [cubicNum, u, v, w] = this.solveCubic(1, 2 * p, p * p - 4 * r, -q * q)

    if (cubicNum < 1) {
      return [0, s0, s1, s2, s3]
    }

    const m = u >= 0 ? Math.sqrt(u) : 0

    // 最初の2次方程式
    const [quad1Num, q1_1, q1_2] = this.solveQuadric(
      1,
      m,
      p + u - q / m
    )

    // 2番目の2次方程式
    const [quad2Num, q2_1, q2_2] = this.solveQuadric(
      1,
      -m,
      p + u + q / m
    )

    // 置換を戻す
    const sub = (1 / 4) * A

    if (quad1Num > 0) {
      s0 = q1_1 - sub
      num++
    }
    if (quad1Num > 1) {
      s1 = q1_2 - sub
      num++
    }
    if (quad2Num > 0) {
      s2 = q2_1 - sub
      num++
    }
    if (quad2Num > 1) {
      s3 = q2_2 - sub
      num++
    }

    return [num, s0, s1, s2, s3]
  }
}

/**
 * 固定ターゲットへの発射速度を計算（ForrestTheWoods方式）
 *
 * 発射位置・発射速度スカラー・ターゲット位置・重力 から、
 * 命中する2つの発射角度（低角・高角）を計算する
 *
 * @param projPos 発射位置（ワールド座標）
 * @param projSpeed 発射速度の大きさ（スカラー）
 * @param target ターゲット位置（ワールド座標）
 * @param gravity 重力加速度（正=下向き）
 * @returns { valid: 命中可能か, s0: 低角解, s1: 高角解, numSolutions: 解の個数 }
 */
export function solveBallistic(
  projPos: THREE.Vector3,
  projSpeed: number,
  target: THREE.Vector3,
  gravity: number
): {
  valid: boolean
  s0: THREE.Vector3
  s1: THREE.Vector3
  numSolutions: number
} {
  const diff = target.clone().sub(projPos)
  const diffXZ = new THREE.Vector3(diff.x, 0, diff.z)
  const groundDist = diffXZ.length()
  const y = diff.y

  // 計算用の中間変数
  const speed2 = projSpeed * projSpeed
  const speed4 = speed2 * speed2
  const gx = gravity * groundDist

  // 判別式を計算
  const discriminant = speed4 - gravity * (gravity * groundDist * groundDist + 2 * y * speed2)

  if (discriminant < 0) {
    // 到達不可能
    return {
      valid: false,
      s0: new THREE.Vector3(),
      s1: new THREE.Vector3(),
      numSolutions: 0
    }
  }

  const sqrtDisc = Math.sqrt(discriminant)

  // 2つの発射角度を計算（atan2で象限処理も自動化）
  const lowAng = Math.atan2(speed2 - sqrtDisc, gx)
  const highAng = Math.atan2(speed2 + sqrtDisc, gx)

  // 水平方向の正規化（発射方向を確定）
  const groundDir = diffXZ.normalize()

  // 発射速度ベクトルを構築
  // (大きさ = projSpeed になるよう cos/sin で配分)
  const s0 = groundDir
    .clone()
    .multiplyScalar(Math.cos(lowAng) * projSpeed)
    .add(new THREE.Vector3(0, Math.sin(lowAng) * projSpeed, 0))

  const s1 = groundDir
    .clone()
    .multiplyScalar(Math.cos(highAng) * projSpeed)
    .add(new THREE.Vector3(0, Math.sin(highAng) * projSpeed, 0))

  const numSolutions = lowAng === highAng ? 1 : 2

  return {
    valid: true,
    s0,
    s1,
    numSolutions
  }
}

/**
 * 横速度と頂点高さから発射速度と必要重力を計算（ForrestTheWoods方式 lateral版）
 *
 * 水平面での移動速度と頂点の高さが既知のとき、
 * そこに達する軌道の発射速度と必要重力を逆算する
 *
 * @param projPos 発射位置
 * @param lateralSpeed 水平方向速度（XZ平面）
 * @param targetPos ターゲット位置
 * @param maxHeight 頂点の絶対高さ
 * @returns { valid: 解が存在するか, fireVelocity: 発射速度ベクトル, gravity: 必要な重力加速度 }
 */
export function solveBallisticArcLateral(
  projPos: THREE.Vector3,
  lateralSpeed: number,
  targetPos: THREE.Vector3,
  maxHeight: number
): {
  valid: boolean
  fireVelocity: THREE.Vector3
  gravity: number
} {
  const diff = targetPos.clone().sub(projPos)
  const diffXZ = new THREE.Vector3(diff.x, 0, diff.z)
  const lateralDist = diffXZ.length()

  if (lateralDist < 0.0001) {
    // ターゲットが発射位置とほぼ同じ（水平移動なし）
    return {
      valid: false,
      fireVelocity: new THREE.Vector3(),
      gravity: 0
    }
  }

  const a = projPos.y // 開始高さ
  const b = maxHeight // 飛行時間の中点で通過する高さ（頂点）
  const c = targetPos.y // 終了高さ

  if (b < Math.max(a, c) - 0.0001) {
    // 「頂点」が始点・終点より低い放物線は成立しない
    return {
      valid: false,
      fireVelocity: new THREE.Vector3(),
      gravity: 0
    }
  }

  // 飛行時間（横速度は一定なので水平距離から一意に決まる）
  const time = lateralDist / lateralSpeed

  // lib_fts原典の連立方程式:
  //   t=time/2 で y=b（頂点）、t=time で y=c（着地）を同時に満たす
  //   放物線 y(t) = a + vy*t - 0.5*g*t^2 を解くと重力gも未知数として一意に決まる
  const gravity = (4 * (2 * b - a - c)) / (time * time)
  const vy = (4 * b - 3 * a - c) / time

  // 水平方向の速度ベクトル（XZ平面、大きさ=lateralSpeed）
  const fireVelocity = diffXZ.normalize().multiplyScalar(lateralSpeed)
  fireVelocity.y = vy

  return {
    valid: true,
    fireVelocity,
    gravity
  }
}
