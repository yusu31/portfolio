export interface SceneHotspot {
  id: string
  pos: [number, number, number]
  radius: number
  categoryId: string
  cardSide: 'left' | 'right'
  label: string
  color: string
}
