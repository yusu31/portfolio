// チェイスカメラ本体(チェイスカム化 PR-2)。
// CameraRig.tsxとテスト(ballPath.test.ts / cameraAttitude.test.ts)が共有する唯一のビルダー。
// 独立経路(CAMERA_PATH/LOOKAT_PATH、廃止)を全廃し、getBallFrame(u)という契約だけを消費する:
// ボール軌道の内部実装(ビート・sin波・将来の物理式)が変わってもこの関数は無変更で動く
// (設計原則3「カメラは getBallFrame(u) という契約だけを消費する」)。
//
// 手順: getBallFrame(u) → getCameraOffset(u)でオフセット4値(dBack/dUp/lookAhead/lookUp)を
//       取得 → camPos = anchor − heading・dBack + (0, dUp, 0) →
//       lookTarget = anchor + heading・lookAhead + (0, lookUp, 0) →
//       camera.lookAt(lookTarget) → 既存applyCameraAttitudeをそのまま後段適用(機構は無変更)。
//       オフセット4値は通常chase区間では定数(D_BACK/D_UP/LOOK_AHEAD/LOOK_UP)だが、
//       ダイブ区間(RING_U〜FALL_END)だけダイブ値へブレンドされる(getCameraOffset内)。
import * as THREE from 'three'
import { getBallFrame } from './ball/chase'
import { RING_U, FALL_END } from './ball/beats'
import { applyCameraAttitude, DIVE_PEAK_U } from './cameraAttitude'
import { PATH_END_OFFSET } from './path'

/**
 * カメラをanchorから真後ろ(-heading方向)へ引く距離(ユニット)。
 * PR-2再調整(scratchpad 2026-07-19、u1000/1001分割グリッドサーチ、448〜1080通り走査):
 * ユーザーQAフィードバック「もっとボールに近づいて、上3分の2が見えていればいい」を受け、
 * 旧値10から4.5へ縮小。見せ場代表点8点での見かけの大きさ平均比が0.327→0.62(約1.9倍)に
 * 拡大しつつ、カメラ-ボール距離は全区間最小4.85(実測、旧9.83)を維持し安全域(>2.0)を
 * 十分に確保できる値として確定
 */
const D_BACK = 4.5
/**
 * カメラをanchorから持ち上げる高さ(ユニット)。旧値3のまま据え置き
 * (D_BACKだけを縮めて高さは変えないことで、バスケフープのバックボード表面距離を
 * 実測0.76(旧0.74と同水準)・支柱1.89(旧1.85)に保てることを確認済み。地面クリアランスも
 * 旧デザインと同一(カメラ最低高度2.96、変化なし))
 */
const D_UP = 3.0
/**
 * 視線ターゲットをanchorから前方へ出す距離(ユニット)。旧値3から2へ縮小。
 * D_BACK縮小に伴い視線ターゲットとの相対比を保ちつつ、下記LOOK_UPとのバランスで
 * 「ボール中心が画面下寄り・上端はフレーム内」の構図になるよう実測調整
 */
const LOOK_AHEAD = 2
/**
 * 視線ターゲットをanchorから持ち上げる高さ(ユニット)。旧値1から1.5へ拡大。
 * 見せ場代表点でのクロップ率平均29%(=ボール下側の約3割が画面外)・
 * 上端は全区間で最も浅い箇所でもNDC y=-0.877(>-1、フレーム内)を実測確認。
 * 「上3分の2が見えていればいい」というユーザー要望を、下側の意図的クロップを許容しつつ
 * 上端は死守する設計として数値化した
 */
const LOOK_UP = 1.5

/**
 * ダイブ(ショット#6・HANDOFF_PHASE5-5_SESSION2.md設計)ピーク時のオフセット。
 * 既存のcameraAttitude(roll90°/pitch-35°)は視線の回転だけでカメラ位置は
 * 水平heading方向に縛られたままだったため、「下降しているはず」なのに水平前進にしか
 * 見えなかった。カメラ自体をボール真上付近へ移動させ(D_BACK 4.5→1.5・D_UP 3.0→7)、
 * lookTargetもanchor真上(LOOK_AHEAD/LOOK_UPともに0)へブレンドすることで見下ろし追走にする。
 * lookTargetをanchorに正確に一致させるのは、rollがlookAt後段のrotateZ(視線軸まわり)
 * であり画面中心を軸に回るだけなので、視線をanchorへ正確に向けておけばroll角度に関わらず
 * ボールが常に画面中心に留まるため(実測: 非ゼロオフセット時はroll90°でボールが画面端まで
 * 寄ってしまい「見下ろしているというより画面外に逃げていく」ように見えるNGパターンだった)。
 * 視線ベクトルが世界upとほぼ平行になるlookAtの特異点は、rollより前段のD_BACK/D_UP位置
 * オフセットだけで既に角度差約12°(atan(1.5/7))を確保できているため、lookTarget側で
 * 追加のマージンを取る必要はない
 */
const DIVE_D_BACK = 1.5
const DIVE_D_UP = 7
const DIVE_LOOK_AHEAD = 0
const DIVE_LOOK_UP = 0

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³)。cameraAttitude.tsと同じ手法 */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * RING_U→DIVE_PEAK_U→FALL_ENDでダイブ値へブレンドする係数(0=通常chase, 1=ダイブピーク)。
 * 区間外は厳密に0(サッカー区間・About以降に一切影響しない)。
 */
function diveBlendT(u: number): number {
  if (u < RING_U || u >= FALL_END) return 0
  if (u < DIVE_PEAK_U) return smootherstep((u - RING_U) / (DIVE_PEAK_U - RING_U))
  return smootherstep((FALL_END - u) / (FALL_END - DIVE_PEAK_U))
}

/** オフセット4値からなるカメラ組み立てパラメータ。u<RING_Uとu≥FALL_ENDでは厳密に恒等 */
export interface CameraOffset {
  dBack: number
  dUp: number
  lookAhead: number
  lookUp: number
}

/** offset(u)からカメラのオフセット値を返す純関数(camera.test.tsの回帰テスト対象) */
export function getCameraOffset(u: number): CameraOffset {
  const t = diveBlendT(u)
  return {
    dBack: THREE.MathUtils.lerp(D_BACK, DIVE_D_BACK, t),
    dUp: THREE.MathUtils.lerp(D_UP, DIVE_D_UP, t),
    lookAhead: THREE.MathUtils.lerp(LOOK_AHEAD, DIVE_LOOK_AHEAD, t),
    lookUp: THREE.MathUtils.lerp(LOOK_UP, DIVE_LOOK_UP, t),
  }
}

// useFrame毎の呼び出しでアロケーションしないよう、モジュールスコープで使い回す
const frame = { anchor: new THREE.Vector3(), heading: new THREE.Vector3() }
const camPos = new THREE.Vector3()
const lookTarget = new THREE.Vector3()

/**
 * offset(u)からチェイスカメラの位置・視線・姿勢を組み立て、cameraへ直接適用する純関数的ビルダー。
 * CameraRig.tsxの本番描画と、ballPath.test.ts / cameraAttitude.test.tsの回帰テストが
 * この一つの実装だけを共有する(旧cameraAt()/buildCamera()ヘルパー重複の恒久的解消)。
 * @param u スクロールoffset(0〜1、生値でよい)。終端静止のクランプはここで行う
 *          (既存CameraRig.tsxが担っていた`Math.min(offset, PATH_END_OFFSET)`を移設)
 */
export function poseJourneyCamera(camera: THREE.Camera, u: number, reducedMotionScale: number): void {
  const clampedU = Math.min(u, PATH_END_OFFSET)
  getBallFrame(clampedU, frame)
  const { dBack, dUp, lookAhead, lookUp } = getCameraOffset(clampedU)

  camPos.copy(frame.anchor).addScaledVector(frame.heading, -dBack)
  camPos.y += dUp
  lookTarget.copy(frame.anchor).addScaledVector(frame.heading, lookAhead)
  lookTarget.y += lookUp

  camera.position.copy(camPos)
  camera.lookAt(lookTarget)
  // 姿勢レイヤー: lookAtの後段で重ねる(位置・視線ターゲットには触れない、既存契約のまま)
  applyCameraAttitude(camera, clampedU, reducedMotionScale)
}
