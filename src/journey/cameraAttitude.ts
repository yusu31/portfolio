// カメラ姿勢レイヤー(ロール/ピッチ)。バスケ区間+バスケ→バレー移行の
// 「フリースローの弧を見上げ(pitch+6°)→ダイブ降下中の小さな連続ウォブル」演出を、
// 位置経路(CAMERA_PATH)・視線経路(LOOKAT_PATH)に一切触れずlookAt()の後段で重ねる。
//
// 設計原則:
// - offsetの純関数(単一の真実)。フレーム間状態・ブラウザAPIを持ち込まない(テスト容易性)。
//   reduced-motion検出はuseReducedMotion.tsに分離し、ここはスケール値を乗算するだけ。
// - 境界uは./ball/beatsの定数を直接import(単一ソース化。新規のu定数はbeatsからの導出値のみ)。
// - path/配下ではなくjourney/直下に置く(path/index → attitude → ball/beats → path/indexの循環回避)。
// - フレーム間の追加slerpダンピングは入れない(ScrollControlsのdamping=0.25が既にoffsetを
//   平滑化しており、二重にすると純関数性が崩れテストと実挙動が乖離するため)。
//
// PR-1(ダイブオフセットブレンド、camera.ts参照)のビジュアルQAで、旧設計(roll90°/pitch-35°の
// 「世界反転」)がボールを画面端まで押し出す問題が発覚した: pitch(rotateX)がlookAtの
// 中心点を画面中心から一旦縦にずらし、直後のroll(rotateZ)がそのズレを横方向へ回転させる
// ためで、カメラをボールへ近づけたPR-1でこの副作用が拡大した(実測NDC x: 0.310→0.846)。
// 参考サイト(sebastien-lempens.com)のスカイダイブ実装(github.com/sebastien-lempens/
// webgl-skydiving で本人が公開)を調査したところ、カメラ自体はほぼ回転させず
// (OrbitControls固定+drei CameraShakeの小さな連続乱流のみ)、「落下感」はリグ付き
// アバター側の宙返りアニメーションで出していると判明。本プロジェクトの主人公は
// 無表情な球体でポーズが取れないため1:1移植はできないが、「カメラの大きな一発回転を
// やめ、小さな連続ウォブル+位置レイヤー(camera.tsのgetCameraOffset)に見下ろし感を
// 任せる」という原理は踏襲できる。drei本体のCameraShakeはマウント時のcamera.rotationを
// 毎フレーム絶対上書きする実装で、このプロジェクトの毎フレームlookAt()+rotateX/rotateZとは
// 合成できないため、既存のKEYFRAMES補間と同じ「uの純関数」流儀で手書きする。
import * as THREE from 'three'
import { CATCH_START, RING_U, FALL_END, RECEIVE_END } from './ball/beats'

/** ダイブ演出ピーク(基調ティルトが巻き戻り終わる瞬間)のu=fall中間。beats境界からの導出値 */
export const DIVE_PEAK_U = (RING_U + FALL_END) / 2

/**
 * 基調ティルト(意図的な方向性のある傾き、度)。
 * - CATCH_START→RING_U: ダッチアングル20°+見上げ+6°(フリースローの弧に緊張感)。
 *   PR-1のビジュアルQAで無関係と確認済みのため無変更
 * - RING_U→DIVE_PEAK_U: 旧90°/-35°の「世界反転」を廃止し0°/0°(正立)へ巻き戻す。
 *   見下ろし感は位置レイヤー(camera.tsのdiveBlendT、カメラをボール真上へ移動)だけで担う
 * - DIVE_PEAK_U→RECEIVE_END: 恒等のまま(RECEIVE_END以降は厳密に恒等)
 */
const KEYFRAMES: ReadonlyArray<{ u: number; roll: number; pitch: number }> = [
  { u: CATCH_START, roll: 0, pitch: 0 },
  { u: RING_U, roll: 20, pitch: 6 },
  { u: DIVE_PEAK_U, roll: 0, pitch: 0 },
  { u: RECEIVE_END, roll: 0, pitch: 0 },
]

/**
 * ダイブ区間(RING_U〜RECEIVE_END)に重ねる小振幅ウォブル(乱流)の上限(度)。
 * 周波数の異なる2本のsin波を0.65/0.35で合成する(係数和=1のため|結果|は常にamplitudeDeg以内、
 * 単純なsin単体だとroll/pitchが同期して見えるためaxis毎に周波数・位相をずらす)。
 * 旧実測(DIVE_PEAK_Uでroll90°/pitch-35°時、NDC x=0.846)から
 * x≈sin(roll)×tan(pitch)/tan(halfFOV)の関係でスケールダウンした出発値。
 * ブラウザQAでの視覚チューニング前提
 */
const WOBBLE_ROLL_DEG = 3
const WOBBLE_PITCH_DEG = 1.5
/** 周波数(u単位あたりのサイクル数)。roll/pitchで異なる値にしてロックステップを回避 */
const WOBBLE_ROLL_FREQ_A = 15
const WOBBLE_ROLL_FREQ_B = 23
const WOBBLE_PITCH_FREQ_A = 11
const WOBBLE_PITCH_FREQ_B = 19
const WOBBLE_PHASE_ROLL_B = 1.7
const WOBBLE_PHASE_PITCH_B = 0.9

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³)。キーフレーム継ぎ目の瞬間スナップを防ぐ */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** 周波数の異なる2本のsin波を0.65/0.35で合成した小振幅ウォブル(度)。|結果|は常にamplitudeDeg以内 */
function wobbleDeg(u: number, freqA: number, freqB: number, phaseB: number, amplitudeDeg: number): number {
  const a = Math.sin(2 * Math.PI * freqA * u)
  const b = Math.sin(2 * Math.PI * freqB * u + phaseB)
  return amplitudeDeg * (0.65 * a + 0.35 * b)
}

/**
 * RING_U→DIVE_PEAK_U→RECEIVE_ENDで0→1→0のウォブル包絡線(camera.tsのdiveBlendTと同じ手法)。
 * 区間外は厳密に0
 */
function diveWobbleEnvelope(u: number): number {
  if (u < RING_U || u >= RECEIVE_END) return 0
  if (u < DIVE_PEAK_U) return smootherstep((u - RING_U) / (DIVE_PEAK_U - RING_U))
  return smootherstep((RECEIVE_END - u) / (RECEIVE_END - DIVE_PEAK_U))
}

export interface CameraAttitude {
  /** 視線軸まわりの回転(ラジアン)。ダッチアングル〜小振幅ウォブル */
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

  let rollDeg = 0
  let pitchDeg = 0
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (u >= a.u && u < b.u) {
      const t = smootherstep((u - a.u) / (b.u - a.u))
      rollDeg = a.roll + (b.roll - a.roll) * t
      pitchDeg = a.pitch + (b.pitch - a.pitch) * t
      break
    }
  }

  const env = diveWobbleEnvelope(u)
  rollDeg += env * wobbleDeg(u, WOBBLE_ROLL_FREQ_A, WOBBLE_ROLL_FREQ_B, WOBBLE_PHASE_ROLL_B, WOBBLE_ROLL_DEG)
  pitchDeg += env * wobbleDeg(u, WOBBLE_PITCH_FREQ_A, WOBBLE_PITCH_FREQ_B, WOBBLE_PHASE_PITCH_B, WOBBLE_PITCH_DEG)

  return {
    roll: THREE.MathUtils.degToRad(rollDeg) * scale,
    pitch: THREE.MathUtils.degToRad(pitchDeg) * scale,
  }
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
