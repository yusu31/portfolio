// ボールリレーのビート境界となる共有ワールド座標。
// VENUES(単一ソース)からの相対オフセットとして定義し、venues.tsxのジオメトリと
// 座標がズレないようにする(Phase 5-2の「LOOKATとCAMERAのuズレ」と同種の事故を防ぐ設計)。
import * as THREE from 'three'
import { VENUES } from '../path'

/** Home区間でボールが静止する位置(旧CrystalBall.tsxの既定position。Home映像はQA済みのため据え置き) */
export const HOME_REST = new THREE.Vector3(-2.3, 1, 0)

/** サッカーピッチ上でドリブルする基準x座標(venue相対。ゴールx=-4.4を避けた中央寄り) */
export const DRIBBLE_BASE_X = VENUES.projects.center.x + 1.2
/** ドリブル中の接地y(他コートの静的ボールと同じ高さの慣習に合わせる) */
export const DRIBBLE_GROUND_Y = -0.05
/**
 * ドリブル開始地点のz座標。DRIBBLE_START(u≈0.1285)時点のカメラz(-15.6)より
 * 十分前方(視野内)になるよう実測して選定(カメラに近すぎるとフレーム外・背後になる)
 */
export const DRIBBLE_Z_ENTRY = -22
/** ドリブル終了地点のz座標。venue中心を過ぎてpassビートへ受け渡す */
export const DRIBBLE_Z_EXIT = VENUES.projects.center.z - 3.0

/** バスケのキャッチ地点(フリースローライン付近、手の高さ) */
export const CATCH_POINT = VENUES.skills.center.clone().add(new THREE.Vector3(0.5, 1.1, 2.0))

/** バスケゴールの支柱グループのvenue相対オフセット。venues.tsxのBasketVenueと単一ソース共有 */
export const HOOP_GROUP_OFFSET = new THREE.Vector3(-1.7, 0, -1.9)
/** リングmeshのhoopグループ相対オフセット。venues.tsxのBasketVenueと単一ソース共有 */
export const RING_OFFSET = new THREE.Vector3(0, 2.2, 0.35)
/** リング中心のワールド座標(フリースローの通過判定点) */
export const RING_CENTER = VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET).add(RING_OFFSET)

/** Phase 5-3終端のプレースホルダー静止点(リング直下の床)。Phase 5-4でfall以降のビートに置き換える */
export const POST_RING_REST = new THREE.Vector3(RING_CENTER.x, -0.08, RING_CENTER.z)
