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
 * 経路を静止分だけ先(z=-56.5)まで延長した上でoffsetをここでクランプする。
 * この値で旧終点ポーズ camera(0,1.5,-55.3)/視線(0,0.98,-58.3) とほぼ同じ構図に静止する
 */
export const PATH_END_OFFSET = 0.982

// カメラ位置の経路: 道(x≈0)を進みつつ、各ヴェニューの側で緩く膨らむ。
// 最終点はPATH_END_OFFSETでのクランプ静止用の延長分(カメラはここまで到達しない)
export const CAMERA_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 10),
    new THREE.Vector3(0.4, 1.05, 2),
    new THREE.Vector3(-0.7, 1.1, -6),
    new THREE.Vector3(-1.4, 1.2, -14), // Projects(左)に寄る
    new THREE.Vector3(0.6, 1.15, -22),
    new THREE.Vector3(1.4, 1.25, -28), // Skills(右)に寄る
    new THREE.Vector3(-0.5, 1.15, -36),
    new THREE.Vector3(-1.2, 1.2, -41), // About(左)に寄る
    new THREE.Vector3(-0.9, 1.35, -46.5), // Aboutを離れて道の中央へ戻る
    new THREE.Vector3(0, 1.45, -50.5),
    new THREE.Vector3(0, 1.52, -55.0), // フィニッシュゲート(z=-54.4)をくぐり抜ける
    new THREE.Vector3(0, 1.48, -56.5), // 延長終点(実際の静止はu=PATH_END_OFFSET: z≈-55.3)
  ],
  false,
  'centripetal'
)

// 視線ターゲットの経路: 基本は前方、ヴェニュー通過時はコートへ視線を振る
export const LOOKAT_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 0), // 前方(クリスタル方向)
    new THREE.Vector3(-2.0, 1.0, -6),
    new THREE.Vector3(-4.0, 1.0, -17), // Projectsヴェニュー
    new THREE.Vector3(0, 1.2, -25),
    new THREE.Vector3(4.0, 1.4, -31), // Skillsヴェニュー
    new THREE.Vector3(-2.6, 1.1, -40.5), // 早めに左へ振ってバレーコートのネットをフレームに入れる
    new THREE.Vector3(-4.0, 1.0, -44), // Aboutヴェニュー
    new THREE.Vector3(-0.5, 1.1, -51), // 視線を早めに正面へ戻す(太陽側の空を長く見ない=グレア対策)
    new THREE.Vector3(0, 1.0, -58), // Contactプラザ
    new THREE.Vector3(0, 0.97, -59.4), // 延長終点(u=PATH_END_OFFSETで視線z≈-58.2に静止)
  ],
  false,
  'centripetal'
)

// 弧長キャッシュをモジュール初期化時に温める(初回スクロールフレームでの計算スパイク回避)
for (const curve of [CAMERA_PATH, LOOKAT_PATH]) {
  curve.arcLengthDivisions = ARC_LENGTH_DIVISIONS
  curve.getLength()
}

/** ScrollControlsの仮想ページ数(スクロールの長さ) */
export const PAGES = 7
