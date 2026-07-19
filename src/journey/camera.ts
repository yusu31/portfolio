// チェイスカメラ本体(チェイスカム化 PR-2)。
// CameraRig.tsxとテスト(ballPath.test.ts / cameraAttitude.test.ts)が共有する唯一のビルダー。
// 独立経路(CAMERA_PATH/LOOKAT_PATH、廃止)を全廃し、getBallFrame(u)という契約だけを消費する:
// ボール軌道の内部実装(ビート・sin波・将来の物理式)が変わってもこの関数は無変更で動く
// (設計原則3「カメラは getBallFrame(u) という契約だけを消費する」)。
//
// 手順: getBallFrame(u) → camPos = anchor − heading・D_BACK + (0, D_UP, 0) →
//       lookTarget = anchor + heading・LOOK_AHEAD + (0, LOOK_UP, 0) →
//       camera.lookAt(lookTarget) → 既存applyCameraAttitudeをそのまま後段適用(機構は無変更)。
import * as THREE from 'three'
import { getBallFrame } from './ball/chase'
import { applyCameraAttitude } from './cameraAttitude'
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

  camPos.copy(frame.anchor).addScaledVector(frame.heading, -D_BACK)
  camPos.y += D_UP
  lookTarget.copy(frame.anchor).addScaledVector(frame.heading, LOOK_AHEAD)
  lookTarget.y += LOOK_UP

  camera.position.copy(camPos)
  camera.lookAt(lookTarget)
  // 姿勢レイヤー: lookAtの後段で重ねる(位置・視線ターゲットには触れない、既存契約のまま)
  applyCameraAttitude(camera, clampedU, reducedMotionScale)
}
