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
 * 実測確定値(scratchpad 2026-07-19、u1000分割グリッドサーチ): 計画書の目安7〜9では
 * 非姿勢区間のNDC下2/3バンド([-0.6,-0.05])違反が1件以上残ったが、10まで引くと
 * 全区間(1001サンプル)で違反ゼロを達成した。カメラ-ボール距離(実測最小9.83)・
 * 占有率(最大0.35)にも十分な余裕があるため採用
 */
const D_BACK = 10
/**
 * カメラをanchorから持ち上げる高さ(ユニット)。D_BACK=10との組で
 * バスケフープのバックボード(表面距離0.74)・支柱(1.64)から安全にクリアすることを実測確認済み
 * (D_UP=2.5だとバックボード表面距離0.31まで縮み危険域に近づく)
 */
const D_UP = 3
/** 視線ターゲットをanchorから前方へ出す距離(ユニット)。計画書目安の下限で違反ゼロを達成 */
const LOOK_AHEAD = 3
/** 視線ターゲットをanchorから持ち上げる高さ(ユニット)。計画書目安の下限で違反ゼロを達成 */
const LOOK_UP = 1.0

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
