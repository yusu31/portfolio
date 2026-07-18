// カメラ姿勢レイヤー(ロール/ピッチ)。バスケ区間+バスケ→バレー移行の
// 「フリースローの弧を見上げ(pitch+6°)→リング通過後の落下を見下ろす(pitch-35°+roll90°)」
// ダイブ演出を、位置経路(CAMERA_PATH)・視線経路(LOOKAT_PATH)に一切触れず
// lookAt()の後段で重ねる(設計書typed-snuggling-wirth.md・案B/ダイブ型確定版)。
//
// 設計原則:
// - offsetの純関数(単一の真実)。フレーム間状態・ブラウザAPIを持ち込まない(テスト容易性)。
//   reduced-motion検出はuseReducedMotion.tsに分離し、ここはスケール値を乗算するだけ。
// - 境界uは./ball/beatsの定数を直接import(単一ソース化。新規のu定数はbeatsからの導出値のみ)。
// - path/配下ではなくjourney/直下に置く(path/index → attitude → ball/beats → path/indexの循環回避)。
// - フレーム間の追加slerpダンピングは入れない(ScrollControlsのdamping=0.25が既にoffsetを
//   平滑化しており、二重にすると純関数性が崩れテストと実挙動が乖離するため)。
import * as THREE from 'three'
import { CATCH_START, RING_U, FALL_END, RECEIVE_END } from './ball/beats'

/** ダイブ(roll90°/pitch-35°)ピークのu=fall中間。beats境界からの導出値(新規マジックナンバー不使用) */
export const DIVE_PEAK_U = (RING_U + FALL_END) / 2

/**
 * 振付キーフレーム(度)。設計書§振付プロファイル(ダイブ型・確定版)の初期値を
 * 現行beats境界(Phase 5-5の3倍化後)へ写像したもの。
 * - CATCH_START→RING_U: ダッチアングル20°+見上げ+6°(フリースローの弧に緊張感)
 * - RING_U→DIVE_PEAK_U: roll90°(部分回転のピーク。完全な360°反転は酔い対策で不採用)
 *   +pitch-35°(落下を追って見下ろす。「地面が上空に見える」感覚のピーク)
 * - DIVE_PEAK_U→RECEIVE_END: レシーブまでに正立へ復帰(RECEIVE_END以降は厳密に恒等)
 * 角度の数値はPR2(視覚チューニング)でブラウザQAにより微調整する前提の初期値。
 * スクラッチパッド実測(2026-07-18、u1000分割)で太陽グレア安全性を確認済み:
 * 姿勢が1°を超える全区間で太陽角度70.45°以上(>55°条件クリア)、up成分のNaN・過回転なし
 */
const KEYFRAMES: ReadonlyArray<{ u: number; roll: number; pitch: number }> = [
  { u: CATCH_START, roll: 0, pitch: 0 },
  { u: RING_U, roll: 20, pitch: 6 },
  { u: DIVE_PEAK_U, roll: 90, pitch: -35 },
  { u: RECEIVE_END, roll: 0, pitch: 0 },
]

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³)。キーフレーム継ぎ目の瞬間スナップを防ぐ */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export interface CameraAttitude {
  /** 視線軸まわりの回転(ラジアン)。ダッチアングル〜部分バレルロール */
  roll: number
  /** ローカルX軸まわりの回転(ラジアン)。正=見上げ、負=見下ろし */
  pitch: number
}

/**
 * offset(u)からカメラ姿勢を返す純関数。
 * u<CATCH_STARTとu≥RECEIVE_ENDでは厳密に恒等(roll=0, pitch=0)を返し、
 * サッカー区間とAbout後半〜Contactに一切影響しない(復帰保証)。
 * @param reducedMotionScale 0〜1(0=無効、1=フル振幅)。roll/pitchへ単純乗算する
 */
export function getCameraAttitude(u: number, reducedMotionScale: number): CameraAttitude {
  const scale = THREE.MathUtils.clamp(reducedMotionScale, 0, 1)
  if (scale === 0 || u < CATCH_START || u >= RECEIVE_END) return { roll: 0, pitch: 0 }
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (u >= a.u && u < b.u) {
      const t = smootherstep((u - a.u) / (b.u - a.u))
      return {
        roll: THREE.MathUtils.degToRad(a.roll + (b.roll - a.roll) * t) * scale,
        pitch: THREE.MathUtils.degToRad(a.pitch + (b.pitch - a.pitch) * t) * scale,
      }
    }
  }
  return { roll: 0, pitch: 0 }
}

/**
 * camera.lookAt(target)の直後に呼ぶ前提の姿勢適用。
 * 適用順は固定: rotateX(pitch)で視線を振ってから、その視線軸まわりでrotateZ(roll)する。
 * ロールは視線方向を変えないため、太陽グレアのリスクを動かすのはpitchのみ(設計書§グレア対策)
 */
export function applyCameraAttitude(camera: THREE.Camera, u: number, reducedMotionScale: number): void {
  const { roll, pitch } = getCameraAttitude(u, reducedMotionScale)
  if (roll === 0 && pitch === 0) return
  camera.rotateX(pitch)
  camera.rotateZ(roll)
}
