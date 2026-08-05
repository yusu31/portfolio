// カット送りカメラ。スクロールoffsetからカットを解いて、カメラを**その場に置き直す**。
// 補間を持たないのが要点で、章の境界ではカメラが瞬間移動する(=カット)。
import { useEffect, useMemo, useRef } from 'react'
import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CHAPTERS,
  cameraPose,
  currentSearch,
  parseChapterOverride,
  parseLocalOverride,
  resolveCut,
} from './chapters'

export default function ProtoACamera({ onCutChange }: { onCutChange: (index: number) => void }) {
  const scroll = useScroll()
  const { camera } = useThree()
  const lastIndex = useRef(-1)

  // クエリは実行中に変わらない前提なので1回だけ読む
  const override = useMemo(() => parseChapterOverride(currentSearch()), [])
  const overrideLocal = useMemo(() => parseLocalOverride(currentSearch()), [])

  // `?ch=N` 固定時はスクロールを見ないので、章の通知も1回で済ませる
  useEffect(() => {
    if (override !== null) onCutChange(override)
  }, [override, onCutChange])

  useFrame(() => {
    const cut = override !== null ? { index: override, local: overrideLocal } : resolveCut(scroll.offset)
    const chapter = CHAPTERS[cut.index]
    const pose = cameraPose(chapter, cut.local)
    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2])

    if (cut.index !== lastIndex.current) {
      lastIndex.current = cut.index
      if (override === null) onCutChange(cut.index)
    }
  })

  return null
}
