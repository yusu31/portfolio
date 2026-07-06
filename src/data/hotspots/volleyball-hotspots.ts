import type { SceneHotspot } from './types'

export const VOLLEYBALL_HOTSPOTS_3D: SceneHotspot[] = [
  // z=1.0 はカメラ([0,1.8,3.5] lookAt[0,0.5,-3])の垂直FOV外で画面下に見切れるため z=-0.5 に配置
  { id: 'background', pos: [ 2.5, -1.2, -0.5], radius: 1.5, categoryId: 'background', cardSide: 'right', label: 'バックグラウンド', color: '#69f0ae' },
  { id: 'style',      pos: [-2.5, -1.2, -0.5], radius: 1.5, categoryId: 'style',      cardSide: 'left',  label: '仕事スタイル',    color: '#a0ffd0' },
  { id: 'seeking',    pos: [ 1.0, -1.2, -1.5], radius: 1.5, categoryId: 'seeking',    cardSide: 'right', label: '求める環境',      color: '#69f0ae' },
]

export const VOLLEYBALL_FINALE: SceneHotspot = {
  id: 'finale', pos: [0, -1.2, -2.5], radius: 1.8,
  categoryId: 'finale', cardSide: 'right', label: 'SPIKE!', color: '#ffffff',
}
