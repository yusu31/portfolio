import type { SceneHotspot } from './types'

export const SOCCER_HOTSPOTS_3D: SceneHotspot[] = [
  { id: 'webapp',  pos: [-3.5, -1.2,  -5.0], radius: 1.5, categoryId: 'webapp',  cardSide: 'right', label: 'Webアプリ',    color: '#4fc3f7' },
  { id: 'game',    pos: [ 3.5, -1.2,  -7.0], radius: 1.5, categoryId: 'game',    cardSide: 'left',  label: 'ゲーム',       color: '#ffb300' },
  { id: 'website', pos: [-3.0, -1.2, -10.0], radius: 1.5, categoryId: 'website', cardSide: 'right', label: 'Webサイト/LP', color: '#69f0ae' },
  { id: 'tool',    pos: [ 3.0, -1.2, -11.0], radius: 1.5, categoryId: 'tool',    cardSide: 'left',  label: 'ツール',       color: '#ce93d8' },
]

export const SOCCER_FINALE: SceneHotspot = {
  id: 'finale', pos: [0, -1.2, -15.0], radius: 2.0,
  categoryId: 'finale', cardSide: 'right', label: 'LONG PASS!', color: '#ffffff',
}
