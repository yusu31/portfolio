// カメラ・視線の経路定義(Phase 5-1で弧長パラメータ化)。
// getPointAt(u)(弧長=距離割合)+ curveType 'centripetal' で駆動する前提。
// 均等パラメータのgetPoint(t)と違い「制御点を足すと全区間ズレる」問題が構造的に起きないため、
// Phase 5-2の経路延長(66→約200)にもPhase 5-5の3倍化(約200→253.5)にも耐える。
import * as THREE from 'three'

/** 弧長サンプルの分割数。経路延長(約253.5ユニット)後も精度が保てるよう明示しておく */
const ARC_LENGTH_DIVISIONS = 400

/**
 * カメラが経路上で停止するoffset上限(終端静止)。
 * 旧実装の「制御点をほぼ重ねて置く」力技は弧長パラメータ化と相性が悪い(ゼロ長セグメント)ためやめ、
 * 経路を静止分だけ先(z=-243)まで延長した上でoffsetをここでクランプする。
 * Phase 5-5の3倍化後もゲート通過直後の構図(camera z=-241.3、ゲートz=-241.4)に静止する(実測)
 */
export const PATH_END_OFFSET = 0.9933

// カメラ位置の経路: 道(x≈0)を進みつつ、各ヴェニューの側で緩く膨らむ。
// Phase 5-5でコート3倍化に合わせて再設計(全長約200→253.5、実測値。z単調減少を維持)。
// y(目線高さ)とwiggle振幅(±1.9)は現行踏襲=「カメラを引かない」の実装的表現。
// 各コートの近サイドラインが道の中心線(x=0)にあるため、wiggleがそのまま
// 「サイドライン内側すれすれの並走(タッチライン際カメラ)」になる。
// 最終点はPATH_END_OFFSETでのクランプ静止用の延長分(カメラはここまで到達しない)
export const CAMERA_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 10),
    new THREE.Vector3(0.5, 1.05, -4),
    new THREE.Vector3(-0.9, 1.12, -22), // ドリブル助走に並走
    new THREE.Vector3(-1.8, 1.2, -40), // Projects: タッチライン際(コート内側1.8)
    new THREE.Vector3(-1.2, 1.24, -58), // ピッチ離脱(コートのz方向深化に伴い追加)
    new THREE.Vector3(1.0, 1.28, -76), // transit1 wiggle(Projects→Skills)
    new THREE.Vector3(1.9, 1.35, -105), // Skills: サイドライン際(右)
    new THREE.Vector3(-0.9, 1.42, -136), // transit2 wiggle(Skills→About)
    new THREE.Vector3(-1.7, 1.48, -170), // About: サイドライン際(左)
    new THREE.Vector3(-1.0, 1.42, -196), // Aboutを離れて道の中央へ戻る
    new THREE.Vector3(0.6, 1.46, -216), // transit3 wiggle(About→Contact)
    new THREE.Vector3(0, 1.5, -233),
    new THREE.Vector3(0, 1.52, -241), // フィニッシュゲート(z=-241.4)をくぐり抜ける
    new THREE.Vector3(0, 1.49, -243), // 延長終点(実際の静止はu=PATH_END_OFFSET: z=-241.3)
  ],
  false,
  'centripetal'
)

// 視線ターゲットの経路: 基本は前方、ヴェニュー通過時はコートへ視線を振る。
// Phase 5-5の設計判断: LOOKATはヴェニュー中心(3倍化で遠くなった)ではなく
// 「ボール活動帯(道寄りのコート手前1/3)」を向く。中心注視はタッチライン際カメラでは
// 意味論的に誤りになるため、テストもコートAABB内判定に置換した(path.test.ts)
export const LOOKAT_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 0), // 前方(クリスタル方向)
    new THREE.Vector3(-2.5, 1.0, -22),
    new THREE.Vector3(-8.0, 1.2, -40), // Projects: ボール活動帯
    new THREE.Vector3(0, 1.3, -75),
    new THREE.Vector3(7.0, 2.6, -105), // Skills: リング(5.4, 7.4, -109.65)方向へ視線をやや上げる
    new THREE.Vector3(-4.0, 1.3, -150), // 早めに左へ振ってバレーコートのネットをフレームに入れる
    new THREE.Vector3(-8.5, 1.2, -166), // About: ボール活動帯
    new THREE.Vector3(-0.6, 1.15, -215), // 視線を早めに正面へ戻す(太陽側の空を長く見ない=グレア対策)
    new THREE.Vector3(0, 1.0, -245), // Contactプラザ
    new THREE.Vector3(0, 0.95, -249), // 延長終点(u=PATH_END_OFFSETで視線z=-247.3に静止)
  ],
  false,
  'centripetal'
)

// 弧長キャッシュをモジュール初期化時に温める(初回スクロールフレームでの計算スパイク回避)
for (const curve of [CAMERA_PATH, LOOKAT_PATH]) {
  curve.arcLengthDivisions = ARC_LENGTH_DIVISIONS
  curve.getLength()
}

/**
 * ScrollControlsの仮想ページ数(スクロールの長さ)。
 * Phase 5-5でスクロール速度パリティ round(253.5 / (199.7/21)) = 27 を初期値に採用
 * (距離は結果指標というユーザー方針。通しスクロールQAで±2の調整余地あり)
 */
export const PAGES = 27
