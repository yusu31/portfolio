// カメラ・視線の経路定義(Phase 5-1で弧長パラメータ化)。
// getPointAt(u)(弧長=距離割合)+ curveType 'centripetal' で駆動する前提。
// 均等パラメータのgetPoint(t)と違い「制御点を足すと全区間ズレる」問題が構造的に起きないため、
// Phase 5-2の経路延長(66→約200ユニット)に耐える。
import * as THREE from 'three'

/** 弧長サンプルの分割数。経路延長(約200ユニット)後も精度が保てるよう明示しておく */
const ARC_LENGTH_DIVISIONS = 400

/**
 * カメラが経路上で停止するoffset上限(終端静止)。
 * 旧実装の「制御点をほぼ重ねて置く」力技は弧長パラメータ化と相性が悪い(ゼロ長セグメント)ためやめ、
 * 経路を静止分だけ先(z=-189)まで延長した上でoffsetをここでクランプする。
 * Phase 5-2延長後もこの値でゲート通過直後の構図(camera z≈-187.3)に静止する
 */
export const PATH_END_OFFSET = 0.9915

// カメラ位置の経路: 道(x≈0)を進みつつ、各ヴェニューの側で緩く膨らむ。
// Phase 5-2で66→約200ユニットに延長。ヴェニュー間(Projects-Skills/Skills-About/About-Contact)に
// wiggle制御点を1つずつ挟み、transit区間(骨格のみ)でも道なりの蛇行が途切れないようにする。
// 最終点はPATH_END_OFFSETでのクランプ静止用の延長分(カメラはここまで到達しない)
export const CAMERA_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 10),
    new THREE.Vector3(0.5, 1.05, -4),
    new THREE.Vector3(-0.9, 1.12, -19),
    new THREE.Vector3(-1.8, 1.2, -33), // Projects(左)に寄る
    new THREE.Vector3(1.0, 1.28, -54), // transit1 wiggle(Projects→Skills)
    new THREE.Vector3(1.9, 1.35, -80), // Skills(右)に寄る
    new THREE.Vector3(-0.9, 1.42, -104), // transit2 wiggle(Skills→About)
    new THREE.Vector3(-1.7, 1.48, -128), // About(左)に寄る
    new THREE.Vector3(-1.0, 1.42, -149), // Aboutを離れて道の中央へ戻る
    new THREE.Vector3(0.6, 1.46, -166), // transit3 wiggle(About→Contact)
    new THREE.Vector3(0, 1.5, -181),
    new THREE.Vector3(0, 1.52, -187), // フィニッシュゲートをくぐり抜ける
    new THREE.Vector3(0, 1.49, -189), // 延長終点(実際の静止はu=PATH_END_OFFSET: z≈-187.3)
  ],
  false,
  'centripetal'
)

// 視線ターゲットの経路: 基本は前方、ヴェニュー通過時はコートへ視線を振る
export const LOOKAT_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 0), // 前方(クリスタル方向)
    new THREE.Vector3(-2.2, 1.0, -18),
    new THREE.Vector3(-4.0, 1.0, -33), // Projectsヴェニュー
    new THREE.Vector3(0, 1.2, -56),
    new THREE.Vector3(4.3, 1.4, -80), // Skillsヴェニュー
    new THREE.Vector3(-2.8, 1.15, -116), // 早めに左へ振ってバレーコートのネットをフレームに入れる
    new THREE.Vector3(-4.2, 1.05, -125), // Aboutヴェニュー
    new THREE.Vector3(-0.6, 1.15, -167), // 視線を早めに正面へ戻す(太陽側の空を長く見ない=グレア対策)
    new THREE.Vector3(0, 1.0, -191), // Contactプラザ
    new THREE.Vector3(0, 0.95, -195), // 延長終点(u=PATH_END_OFFSETで視線z≈-193.3に静止)
  ],
  false,
  'centripetal'
)

// 弧長キャッシュをモジュール初期化時に温める(初回スクロールフレームでの計算スパイク回避)
for (const curve of [CAMERA_PATH, LOOKAT_PATH]) {
  curve.arcLengthDivisions = ARC_LENGTH_DIVISIONS
  curve.getLength()
}

/** ScrollControlsの仮想ページ数(スクロールの長さ)。Phase 5-2で経路延長(約3倍)に合わせて7→21 */
export const PAGES = 21
