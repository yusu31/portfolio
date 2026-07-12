// 3Dスクロールジャーニーのセクション定義とカメラ経路(設計書§6)。
// スクロールoffset(0〜1)が唯一の真実の状態で、カメラ位置・カード表示はすべてここから導出する。
import * as THREE from 'three'

export type SectionId = 'home' | 'projects' | 'skills' | 'about'

export interface SectionRange {
  id: SectionId
  /** カードを表示するoffset区間 [start, end) */
  start: number
  end: number
}

// 区間は連続させる(隙間が広いと「カードが何もない区間」が長く感じられ、
// dampingの遅延も相まってカードの出現が遅れて見える)。切替自体が離散なのでフェードは保たれる
export const SECTION_RANGES: SectionRange[] = [
  { id: 'home', start: 0.0, end: 0.11 }, // クリスタル球接近前にフェードアウト(見出しとの重なり回避)
  { id: 'projects', start: 0.17, end: 0.44 },
  { id: 'skills', start: 0.44, end: 0.68 },
  { id: 'about', start: 0.68, end: 1.01 }, // 終端はAboutで着地(ContactはPhase 4で延長)
]

export function sectionAt(offset: number): SectionId | null {
  for (const r of SECTION_RANGES) {
    if (offset >= r.start && offset < r.end) return r.id
  }
  return null
}

// ヴェニュー(コート)の配置: 道の左右に交互に置き、カメラは道なりに蛇行しながら通過する
export const VENUES = {
  projects: { center: new THREE.Vector3(-4.5, 0, -17) },
  skills: { center: new THREE.Vector3(4.5, 0, -31) },
  about: { center: new THREE.Vector3(-4.5, 0, -45) },
} as const

// カメラ位置の経路: 道(x≈0)を進みつつ、各ヴェニューの側で緩く膨らむ
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
    new THREE.Vector3(-0.9, 1.35, -46.5), // 終点: Aboutヴェニューの横で停止(Phase 4でContactへ延長)
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
    new THREE.Vector3(-4.5, 1.0, -45.5), // 終端でも視線はAboutコートに留める
  ],
  false,
  'catmullrom',
  0.5
)

/** ScrollControlsの仮想ページ数(スクロールの長さ) */
export const PAGES = 6
