// ボールリレーのビート境界となる共有ワールド座標。
// VENUES(単一ソース)からの相対オフセットとして定義し、venues.tsxのジオメトリと
// 座標がズレないようにする(Phase 5-2の「LOOKATとCAMERAのuズレ」と同種の事故を防ぐ設計)。
//
// Phase 5-5(コート3倍化)の原則: 相対オフセットは「×VENUE_SCALE」ではなく
// カメラフレーミング制約で決まる実測値として再定義する(設計書§3)。コートが3倍でも
// カメラは引かない(タッチライン際並走)ため、ボールはカメラ近傍の「道寄りの活動帯」でプレーする
import * as THREE from 'three'
import { VENUES, STRUCTURE_GROUND_LIFT, SOCCER_GOAL_GROUP_OFFSET } from '../path'

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
 * ロングキック(#4)の蹴り出し地点。ゴール正面、ゴールライン(SOCCER_GOAL_GROUP_OFFSET)から
 * +x方向へ6.45ユニット。スクラッチパッドシミュレーション(2026-07-29)でゴール直近(2〜3ユニット)
 * に置くとチェイスカメラのarc区間拡張オフセット(D_BACK7/D_UP4.5)がクロスバー・支柱の
 * 1〜2ユニット圏内まで接近することが判明したため、クロスバー距離3.40ユニット(拡張時)・
 * 4.28ユニット(通常時)を確保できるこの距離に調整した
 */
const SOCCER_GOAL_FRONT = VENUES.projects.center.clone().add(SOCCER_GOAL_GROUP_OFFSET)
export const KICK_POINT = new THREE.Vector3(SOCCER_GOAL_FRONT.x + 6.45, DRIBBLE_GROUND_Y, SOCCER_GOAL_FRONT.z)

/**
 * バスケゴールの支柱グループのvenue相対オフセット。venues.tsxのBasketVenueと単一ソース共有。
 * 旧(-1.7,0,-1.9)×VENUE_SCALE+接地補正(STRUCTURE_GROUND_LIFT)
 */
export const HOOP_GROUP_OFFSET = new THREE.Vector3(-5.1, STRUCTURE_GROUND_LIFT, -5.7)
/**
 * 支柱meshのhoopグループ相対オフセット。構造物クリアランステストと共有。
 *
 * Phase6でz=-1.8→BACKBOARD背面より後方へ移した(Issue #330)。旧値はネット段0の半径3.0
 * (リング中心z=1.05基準で背面がz=-1.95)の内側2.85にあり、支柱がネットを貫通していた。
 * 実物のポール式ゴールと同じく板の後方に立て、アームで前へ張り出す構成にする
 */
export const HOOP_POST_LOCAL_OFFSET = new THREE.Vector3(0, 2.7, -6.5)
/** 支柱の半径。実物比ボード(24×13.8)を支える太さとして旧0.21から増やした */
export const HOOP_POST_RADIUS = 0.45
/** 支柱の高さ。足元は地面(world -0.4 = hoopグループ相対 -1.2)、天はリング高さ(6.6)まで */
export const HOOP_POST_HEIGHT = 7.8
/** リングmeshのhoopグループ相対オフセット(旧(0,2.2,0.35)×3)。venues.tsxと単一ソース共有 */
export const RING_OFFSET = new THREE.Vector3(0, 6.6, 1.05)
/**
 * リング(torus)の主半径。venues.tsxの描画・geometry.test.tsの開口テスト・
 * nets/basketNet.tsのネット上端半径が共有する単一ソース(Phase6で抽出)。
 * この世界は実物の約13.1倍スケールで、3.0は実物のリング半径0.2286mに対応する
 */
export const RING_RADIUS = 3.0
/** リング(torus)の管半径。venues.tsxの描画と単一ソース共有 */
export const RING_TUBE_RADIUS = 0.14

/**
 * この世界と実物の縮尺比(約13.12)。リング半径3.0が実物の規格0.2286mに対応することから導出。
 * ボール半径1.5もこの比で実物0.114m相当(実物0.12m)になり、ボール/リング径比は実物と一致する。
 *
 * **注意: これはフープ周りのみ成立する比**。コート寸法・取り付け高さ・サッカー/バレーの
 * 構造物はこの比に従っていない(ボールを主人公として意図的に過大にしているため)。
 * 実物比で決められるのは「リングを基準に相対寸法が決まるもの」= ネット・バックボードだけ
 */
export const REAL_SCALE = RING_RADIUS / 0.2286

/** バックボード幅。実物1.83m(規格) */
export const BACKBOARD_WIDTH = 1.83 * REAL_SCALE
/** バックボード高さ。実物1.05m(規格) */
export const BACKBOARD_HEIGHT = 1.05 * REAL_SCALE
/** バックボードの厚み。実物の強化ガラス0.05m相当より厚いが、エッジが線になるのを避ける値 */
export const BACKBOARD_THICKNESS = 0.6
/** リング内側近端から板面までの距離。実物0.15m(規格) */
const RING_INNER_TO_BOARD = 0.15 * REAL_SCALE
/**
 * バックボードのhoopグループ相対オフセット。
 *
 * Phase6で寸法4.5×2.7・z=0から実物比へ作り直した(Issue #330)。旧配置には3つの欠陥があった:
 * リングがボードを貫通(リング近端z=-1.95がボード面z=-0.09の1.86奥)、リング直径6.0が
 * ボード幅4.5より広い(実物比は逆に4倍広い)、板と支柱を繋ぐアームが存在しない。
 *
 * **RING_OFFSETは動かさない**(RING_CENTER=フリースローの着弾点が動くとカメラ構図の
 * QAが全部やり直しになる)。板だけを実物比の位置へ後退させることで解決する
 */
export const BACKBOARD_LOCAL_OFFSET = new THREE.Vector3(
  0,
  RING_OFFSET.y - RING_INNER_TO_BOARD + BACKBOARD_HEIGHT / 2,
  RING_OFFSET.z - RING_RADIUS - RING_INNER_TO_BOARD - BACKBOARD_THICKNESS / 2
)
/** シューターズスクエア(内側の白枠)の幅。実物0.59m(規格) */
export const SHOOTER_SQUARE_WIDTH = 0.59 * REAL_SCALE
/** シューターズスクエアの高さ。実物0.45m(規格)。下辺はリング高さに揃える */
export const SHOOTER_SQUARE_HEIGHT = 0.45 * REAL_SCALE
/** 支柱とバックボード背面を繋ぐアームのy(hoopグループ相対)。ネットより後方なので干渉しない */
export const HOOP_ARM_Y = 6.0
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
 * スパイク(#9)の叩きつけ地点。ネット奥側支柱(world z≈-177.2)より奥、コート奥端
 * (z≈-184.25)手前の床。y=0.55はFALL_LANDINGと同じ「球の見た目半径(1.5)由来」の
 * 値(床埋没バグ回避)。座標は叩き台、Playwright実機QAで調整する
 */
export const SPIKE_FLOOR = VENUES.about.center.clone().add(new THREE.Vector3(3.0, 1.4, -13))
/**
 * スパイク(#9)の短いバウンドの頂点。SPIKE_FLOORで叩きつけた直後の控えめな跳ね上がり
 * (TOSS_PEAKの高さ8.5に対しごく低い)。座標は叩き台、Playwright実機QAで調整する
 */
export const SPIKE_BOUNCE_PEAK = VENUES.about.center.clone().add(new THREE.Vector3(2.0, 3.0, -20))
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
