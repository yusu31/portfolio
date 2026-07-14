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
/** リング中心のワールド座標(フリースローの通過判定点。fallビートの起点でもある) */
export const RING_CENTER = VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET).add(RING_OFFSET)

/**
 * 落下着地点(レシーブ開始位置)。バレーコート手前・低い姿勢。venue相対(about)。
 * 当初y=0.1で設計したが、球の見た目半径(1.5)に対して低すぎ、QAで「下半分が地面に
 * 埋没して見える」と判明した。他ビートの接地基準(DRIBBLE_GROUND_Y=-0.05)は一瞬だけ
 * 通過するバウンド最下点だったため許容できたが、ここは「低い姿勢」を静的に見せる点なので
 * 埋没がより目立つ。半径を考慮し接地感を保ちつつ埋没を抑える高さまで引き上げた
 */
export const FALL_LANDING = VENUES.about.center.clone().add(new THREE.Vector3(2.0, 0.55, 10))
/** レシーブで持ち上げた後の頂点(setTossへの受け渡し位置)。ネット手前・コート中央寄り */
export const RECEIVE_PEAK = VENUES.about.center.clone().add(new THREE.Vector3(0.5, 1.2, 6))
/**
 * トスの頂点(spikeへの受け渡し位置)。コート奥上空高く。
 * 当初venue中心付近(z相対+1)に置いたが、TOSS_END(u=0.699)時点でカメラは既にz≈-129まで
 * 進んでおり、venue中心(z=-128)基準では視線の後方(カメラより手前)になってNDCが破綻した
 * (実測: |x|=1.91)。カメラより十分前方になるよう相対z=-6まで奥へ寄せた
 */
export const TOSS_PEAK = VENUES.about.center.clone().add(new THREE.Vector3(0, 3.5, -6))
/**
 * スパイク後、Contact手前を通過する低空飛行点(restへの受け渡し位置)。
 * 当初x=0.3(ほぼ中央)に置いたが、QAでフィニッシュゲートの支柱(x=±2.6)や
 * 画面中央固定のContactCard(SectionCards.tsx、設計書§8で意図的に中央配置)と
 * 重なって見えると判明した。ContactVenueの旧表彰台と同じ右サイド(x=1.6)へ寄せた
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
