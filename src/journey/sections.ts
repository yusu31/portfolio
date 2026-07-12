// 3Dスクロールジャーニーのセクション定義とカメラ経路(設計書§6)。
// スクロールoffset(0〜1)が唯一の真実の状態で、カメラ位置・カード表示はすべてここから導出する。
import * as THREE from 'three'

export type SectionId = 'home' | 'projects' | 'skills' | 'about' | 'contact'

export interface SectionRange {
  id: SectionId
  /** カードを表示するoffset区間 [start, end) */
  start: number
  end: number
}

// 区間は連続させる(隙間が広いと「カードが何もない区間」が長く感じられ、
// dampingの遅延も相まってカードの出現が遅れて見える)。切替自体が離散なのでフェードは保たれる
// 注意: CAMERA_PATHのgetPoint(t)は制御点数に依存するため、経路に点を足したら全区間を再調整すること
export const SECTION_RANGES: SectionRange[] = [
  { id: 'home', start: 0.0, end: 0.08 }, // クリスタル球接近前にフェードアウト(見出しとの重なり回避)
  { id: 'projects', start: 0.125, end: 0.32 },
  { id: 'skills', start: 0.32, end: 0.49 },
  { id: 'about', start: 0.49, end: 0.76 },
  { id: 'contact', start: 0.76, end: 1.01 }, // 終端はContactプラザで着地(設計書§8)
]

export function sectionAt(offset: number): SectionId | null {
  for (const r of SECTION_RANGES) {
    if (offset >= r.start && offset < r.end) return r.id
  }
  return null
}

// ヴェニュー(コート)の配置: 道の左右に交互に置き、カメラは道なりに蛇行しながら通過する。
// 終着のContactだけは道の正面(x=0)に置き、フィニッシュゲートをくぐって着地する
export const VENUES = {
  projects: { center: new THREE.Vector3(-4.5, 0, -17) },
  skills: { center: new THREE.Vector3(4.5, 0, -31) },
  about: { center: new THREE.Vector3(-4.5, 0, -45) },
  contact: { center: new THREE.Vector3(0, 0, -58) },
} as const

// カメラ位置の経路: 道(x≈0)を進みつつ、各ヴェニューの側で緩く膨らむ。
// 終端は2点をほぼ重ねて置き、最後の区間でカメラがほとんど動かない「静止」を作る
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
    new THREE.Vector3(0, 1.5, -55.3), // 終点: プラザ内で静止し表彰台を正面に見る
  ],
  false,
  'catmullrom',
  0.5
)

// 視線ターゲットの経路: 基本は前方、ヴェニュー通過時はコートへ視線を振る
export const LOOKAT_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.0, 0), // 前方(クリスタル方向)
    new THREE.Vector3(-2.0, 1.0, -6),
    new THREE.Vector3(-4.0, 1.0, -17), // Projectsヴェニュー
    new THREE.Vector3(0, 1.2, -25),
    new THREE.Vector3(4.0, 1.4, -31), // Skillsヴェニュー
    new THREE.Vector3(0, 1.2, -39),
    new THREE.Vector3(-4.0, 1.0, -44), // Aboutヴェニュー
    new THREE.Vector3(-1.5, 1.1, -50), // 視線をAboutから道の正面へ戻す
    new THREE.Vector3(0, 1.0, -58), // Contactプラザ(表彰台)
    new THREE.Vector3(0, 0.98, -58.3), // 終端でも視線は表彰台に固定
  ],
  false,
  'catmullrom',
  0.5
)

/** ScrollControlsの仮想ページ数(スクロールの長さ) */
export const PAGES = 7
