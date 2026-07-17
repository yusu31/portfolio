// ボールリレーのビート境界となる共有ワールド座標。
// VENUES(単一ソース)からの相対オフセットとして定義し、venues.tsxのジオメトリと
// 座標がズレないようにする(Phase 5-2の「LOOKATとCAMERAのuズレ」と同種の事故を防ぐ設計)。
//
// Phase 5-5(コート3倍化)の原則: 相対オフセットは「×VENUE_SCALE」ではなく
// カメラフレーミング制約で決まる実測値として再定義する(設計書§3)。コートが3倍でも
// カメラは引かない(タッチライン際並走)ため、ボールはカメラ近傍の「道寄りの活動帯」でプレーする
import * as THREE from 'three'
import { VENUES, STRUCTURE_GROUND_LIFT } from '../path'

/** Home区間でボールが静止する位置(旧CrystalBall.tsxの既定position。Home映像はQA済みのため据え置き) */
export const HOME_REST = new THREE.Vector3(-2.3, 1, 0)

/** サッカーピッチ上でドリブルする基準x座標(venue相対+8.0=タッチライン内側の道寄りレーン) */
export const DRIBBLE_BASE_X = VENUES.projects.center.x + 8.0
/** ドリブル中の接地y(他コートの静的ボールと同じ高さの慣習に合わせる) */
export const DRIBBLE_GROUND_Y = -0.05
/**
 * ドリブル開始地点のz座標。コート北端(z=-30.25)の手前から「ピッチに駆け込む」。
 * DRIBBLE_START(u=0.122)時点のカメラz(-20.9、実測)より十分前方(視野内)になることを確認済み
 */
export const DRIBBLE_Z_ENTRY = -28
/** ドリブル終了地点のz座標。コート南端(z=-49.75)の内側でpassビートへ受け渡す */
export const DRIBBLE_Z_EXIT = VENUES.projects.center.z - 9.0
/** バスケのキャッチ地点(コート手前・道寄り。カメラ前方約10ユニットのフレーミング実測値) */
export const CATCH_POINT = VENUES.skills.center.clone().add(new THREE.Vector3(-6.5, 1.2, 7))

/**
 * バスケゴールの支柱グループのvenue相対オフセット。venues.tsxのBasketVenueと単一ソース共有。
 * 旧(-1.7,0,-1.9)×VENUE_SCALE+接地補正(STRUCTURE_GROUND_LIFT)
 */
export const HOOP_GROUP_OFFSET = new THREE.Vector3(-5.1, STRUCTURE_GROUND_LIFT, -5.7)
/** 支柱meshのhoopグループ相対オフセット(旧(0,1.1,-0.6)×3)。構造物クリアランステストと共有 */
export const HOOP_POST_LOCAL_OFFSET = new THREE.Vector3(0, 3.3, -1.8)
/** リングmeshのhoopグループ相対オフセット(旧(0,2.2,0.35)×3)。venues.tsxと単一ソース共有 */
export const RING_OFFSET = new THREE.Vector3(0, 6.6, 1.05)
/** リング中心のワールド座標(5.4, 7.4, -109.65)。フリースローの通過判定点でfallビートの起点 */
export const RING_CENTER = VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET).add(RING_OFFSET)

/**
 * 落下着地点(レシーブ開始位置)。バレーコート手前・道寄り、低い姿勢。venue相対(about)。
 * y=0.55は球の見た目半径(1.5)由来の値(Phase 5-4 QA「下半分が地面に埋没して見える」対応)で、
 * 球は拡大しないためスケールしない
 */
export const FALL_LANDING = VENUES.about.center.clone().add(new THREE.Vector3(8.0, 0.55, 12))
/** レシーブで持ち上げた後の頂点(setTossへの受け渡し位置)。ネット手前・コート中央寄り */
export const RECEIVE_PEAK = VENUES.about.center.clone().add(new THREE.Vector3(4.0, 1.4, 7))
/**
 * トスの頂点(spikeへの受け渡し位置)。3倍化したネット上帯(y≈5.2)を超える高さで、
 * TOSS_END時点のカメラより十分前方に置く(Phase 5-4「カメラ後方でNDC破綻」の教訓を維持)
 */
export const TOSS_PEAK = VENUES.about.center.clone().add(new THREE.Vector3(3.5, 8.5, -9))
/**
 * スパイク後、Contact手前を通過する低空飛行点(restへの受け渡し位置)。
 * プラザは1x据え置きのため相対値不変: フィニッシュゲートの支柱(x=±2.6)や
 * 画面中央固定のContactCardとの重なりを避けた右サイド(x=1.6)のQA済み構図を保つ
 */
export const SPIKE_LANDING = VENUES.contact.center.clone().add(new THREE.Vector3(1.6, 1.5, 8))
/**
 * 最終静止点(円柱台座上面)のvenue相対オフセット。venues.tsxのContactVenueと単一ソース共有。
 * x=1.6は旧表彰台(Phase 5-3以前)と同じ右サイド。中央(x=0)だとフィニッシュゲートの支柱や
 * 画面中央固定のContactCardと重なって見える(QA実測: u=0.93でゲート支柱と重複、
 * u=0.96以降ContactCardに完全に隠れる)
 */
export const CONTACT_REST_OFFSET = new THREE.Vector3(1.6, 1.0, -1.6)
/** 最終静止点のワールド座標。フィニッシュゲートをくぐった先、右サイドの円柱台座上 */
export const CONTACT_REST = VENUES.contact.center.clone().add(CONTACT_REST_OFFSET)
