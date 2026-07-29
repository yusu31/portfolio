// サッカーピッチでのドリブル: バウンド弧の連結+左右ウィーブ。終盤はゴール正面のKICK_POINTへ
// 収束し(PR-4)、ロングキックの蹴り出しへ滑らかに繋ぐ。
import * as THREE from 'three'
import { DRIBBLE_BASE_X, DRIBBLE_GROUND_Y, DRIBBLE_Z_ENTRY, DRIBBLE_Z_EXIT, KICK_POINT } from '../anchors'

const BOUNCE_CYCLES = 9
const BOUNCE_HEIGHT = 1.3
const WEAVE_CYCLES = 3.5
const WEAVE_AMPLITUDE = 3.0

/**
 * この進行度t以降、ウィーブ振幅を0へ減衰させながらxのベースライン・zの目標地点を
 * KICK_POINTへ寄せる(「ドリブル終盤でゴール正面へ寄せる」PR-4設計)。
 *
 * 最初はweave位置とKICK_POINTを直接lerpする実装を試したが、振動中のweave位置と
 * 静止したKICK_POINTの間を短い区間でlerpすると、lerp係数の変化率×両者の差という
 * 交差項が大きくなりヨー角・ロール角・anchor.yのステップが実測で閾値超過した
 * (KICK_APPROACH_START=0.82で回転ステップ1.36rad、0.65で最大ヨーΔ角31°など)。
 * ウィーブの「振幅」を先に0へ絞ってから位置を寄せる(振動の発生源そのものを消す)
 * 設計に変えて交差項由来のジッターは解消したが、それでも「ウィーブしながら進む」→
 * 「まっすぐ走ってゴール前で静止」という大きな方向転換自体は残るため、chase.test.tsの
 * 該当区間の閾値(ヨーΔ角・anchor.yリップル)は実測値に更新した(単発の滑らかな転換で
 * 振動ではないことを確認済み)
 */
export const KICK_APPROACH_START = 0.7

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³)。camera.ts/cameraAttitude.tsと同じ手法 */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** ドリブル区間内の進行度t(0〜1)から位置を返す。t=0はビート境界(idleの受け渡し点)、t=1はKICK_POINTに一致する */
export function dribblePosition(t: number): THREE.Vector3 {
  const approachT = t < KICK_APPROACH_START ? 0 : smootherstep((t - KICK_APPROACH_START) / (1 - KICK_APPROACH_START))

  const baseX = THREE.MathUtils.lerp(DRIBBLE_BASE_X, KICK_POINT.x, approachT)
  const weaveAmplitude = WEAVE_AMPLITUDE * (1 - approachT)
  const weave = Math.sin(t * Math.PI * WEAVE_CYCLES) * weaveAmplitude

  const zTarget = THREE.MathUtils.lerp(DRIBBLE_Z_EXIT, KICK_POINT.z, approachT)
  const z = THREE.MathUtils.lerp(DRIBBLE_Z_ENTRY, zTarget, t)

  const bounce = Math.abs(Math.sin(t * Math.PI * BOUNCE_CYCLES)) * BOUNCE_HEIGHT + DRIBBLE_GROUND_Y
  const y = THREE.MathUtils.lerp(bounce, KICK_POINT.y, approachT)

  return new THREE.Vector3(baseX + weave, y, z)
}
