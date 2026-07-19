// 物理軌道エンジン: 放物運動・反発係数・速度連続を統一管理。
// Phase 5-5+ で既存の sin/cos パラメータから真の物理モデルへ移行。
import * as THREE from 'three'

// 重力加速度（内部スケール単位）。実測: 地球9.81 m/s² → ゲーム単位で約 12.0
const GRAVITY = 12.0

// 標準的な反発係数（材質別）
export const RESTITUTION = {
  ball: 0.72,      // サッカーボール / バスケ
  ground: 0.68,    // ピッチ / コート面
  volleyball: 0.65, // バレーボール
}

/**
 * 初速度・着地点から放物線軌道を計算（最高点経由）。
 * @param startPos 発射位置
 * @param velocity 初速度ベクトル
 * @param duration 移動時間(0~1 に正規化)
 * @param landingY 着地高さ（デフォルト: 地面0）
 * @returns t(0~1)における位置
 */
export function parabolaPosition(
  startPos: THREE.Vector3,
  velocity: THREE.Vector3,
  t: number,
  landingY: number = 0
): THREE.Vector3 {
  const time = t // 正規化時間 0~1
  const pos = startPos.clone()

  // x, z: 一定速度の等速直線運動
  pos.x += velocity.x * time
  pos.z += velocity.z * time

  // y: 等加速度運動 y = v0*t - 0.5*g*t²
  pos.y += velocity.y * time - 0.5 * GRAVITY * time * time

  // 着地Y未満に落ちた場合は着地で止める
  if (pos.y < landingY) {
    pos.y = landingY
  }

  return pos
}

/**
 * 着地点と最高点高さから初速度を逆算（水平発射・斜め発射用）。
 * @param startPos 発射位置
 * @param endPos 着地位置
 * @param peakHeight 最高点の高さ（相対値）
 * @returns 必要な初速度ベクトル
 */
export function calcVelocityForArc(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  peakHeight: number
): THREE.Vector3 {
  const dx = endPos.x - startPos.x
  const dz = endPos.z - startPos.z
  const dy = endPos.y - startPos.y

  // peakHeight が負またはゼロの安全値チェック
  const safePeakHeight = Math.max(peakHeight, 0.1)

  // 飛行時間（最高点に達する時間の2倍）
  // peakHeight = v0y * t_peak - 0.5*g*t_peak²
  // v0y = peakHeight / t_peak (最高点で速度0)
  // 解: t_total = 2 * sqrt(2*peakHeight / GRAVITY)
  const t_total = 2 * Math.sqrt(2 * safePeakHeight / GRAVITY)

  // 水平速度（等速）
  const vx = dx / t_total || 0
  const vz = dz / t_total || 0

  // 初速度y（最高点の物理式から逆算）
  const vy = Math.sqrt(2 * GRAVITY * safePeakHeight)

  return new THREE.Vector3(vx, vy, vz)
}

/**
 * バウンド軌道: 反発係数を考慮した離散バウンド。
 * @param startPos バウンド開始位置
 * @param bounceHeight バウンス高さ
 * @param bounceIndex 何回目のバウンス（速度減衰に使用）
 * @param t 現在の進行度(0~1)
 * @param groundY 地面の高さ
 * @returns バウンス中の位置
 */
export function bouncePosition(
  startPos: THREE.Vector3,
  bounceHeight: number,
  bounceIndex: number,
  t: number,
  groundY: number = 0
): THREE.Vector3 {
  // 反発を重ねるごとに高さが減衰（反発係数 e）
  const damping = Math.pow(RESTITUTION.ball, bounceIndex)
  const dampedHeight = bounceHeight * damping

  // 単一バウンスの sin 曲線（対称）
  const arc = Math.abs(Math.sin(t * Math.PI)) * dampedHeight

  const pos = startPos.clone()
  pos.y = groundY + arc

  return pos
}

/**
 * 軌道の妥当性検証（NDC・フレーミング・連続性）。
 * @param positions サンプル位置の配列
 * @param cameraPos カメラ位置
 * @param cameraFOV カメラFOV（度）
 * @param maxNDC 許容最大NDC絶対値
 * @returns { valid, issues } 検証結果と警告リスト
 */
export function validateTrajectory(
  positions: THREE.Vector3[],
  cameraPos: THREE.Vector3,
  cameraFOV: number = 50,
  maxNDC: number = 0.95
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (positions.length < 2) {
    issues.push('軌道サンプルが不足（最低2点必要）')
    return { valid: false, issues }
  }

  // NDC チェック（カメラとの相対位置がフレーム内か）
  const fovRad = (cameraFOV * Math.PI) / 180
  const near = 0.1
  positions.forEach((pos, i) => {
    const relative = pos.clone().sub(cameraPos)
    const ndcX = Math.abs(relative.x / (near * Math.tan(fovRad / 2)))
    const ndcY = Math.abs(relative.y / (near * Math.tan(fovRad / 2)))

    if (ndcX > maxNDC || ndcY > maxNDC) {
      issues.push(
        `サンプル ${i}: NDC超過 (x=${ndcX.toFixed(2)}, y=${ndcY.toFixed(2)})`
      )
    }
  })

  // 速度連続性チェック（隣接ステップの移動距離）
  const maxStep = 5.0 // ゲーム単位
  for (let i = 1; i < positions.length; i++) {
    const dist = positions[i].distanceTo(positions[i - 1])
    if (dist > maxStep) {
      issues.push(
        `ステップ ${i}: 移動距離超過 (${dist.toFixed(2)} > ${maxStep})`
      )
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
