import type { SceneHotspot } from './types'

export const BASKETBALL_HOTSPOTS_3D: SceneHotspot[] = [
  { id: 'frontend',       pos: [-3.0, -1.2, -1.0], radius: 1.5, categoryId: 'frontend',       cardSide: 'left',  label: 'Frontend',       color: '#4fc3f7' },
  { id: 'backend',        pos: [ 2.5, -1.2, -3.0], radius: 1.5, categoryId: 'backend',        cardSide: 'right', label: 'Backend',         color: '#ffb300' },
  { id: 'infrastructure', pos: [-2.0, -1.2, -5.0], radius: 1.5, categoryId: 'infrastructure', cardSide: 'left',  label: 'Infrastructure', color: '#69f0ae' },
]

export const BASKETBALL_FINALE: SceneHotspot = {
  id: 'finale', pos: [0, -1.2, -7.0], radius: 2.0,
  categoryId: 'finale', cardSide: 'right', label: 'SHOOT!', color: '#ff7700',
}
