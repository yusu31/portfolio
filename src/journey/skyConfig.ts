// Sky太陽・キーライト位置の共有定数(カメラ姿勢反転演出PR1 #271で導入)。
// 従来ScrollJourneyPoc.tsxにハードコード+手動複製されていた値の単一ソース化(値は不変=見た目不変)。
// cameraAttitude.test.tsの太陽グレア検証もSUN_DIRECTIONを参照する(検証と描画の太陽が食い違わない)。
import * as THREE from 'three'

/** <Sky sunPosition>の太陽位置。地平線近くに置いてピーチ〜クリームの夕焼けグラデーションを作る */
export const SUN_POSITION: [number, number, number] = [-8, 1.5, 6]

/** 夕日キーライト(directionalLight)の位置。Skyの太陽と同方向の暖色 */
export const KEY_LIGHT_POSITION: [number, number, number] = [-8, 3, 6]

/** 正規化した太陽方向。グレア安全性検証(カメラ前方との角度)の単一ソース */
export const SUN_DIRECTION = new THREE.Vector3(...SUN_POSITION).normalize()
