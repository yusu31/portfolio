// カメラの設置とスクロールの読み取り。
//
// **このファイルの要点は「カメラを1回置いたら二度と触らない」こと**。
// A は章ごとにカメラを置き直し(カット)、B は毎フレーム道の式から位置を決めていたが、
// C はカメラを固定してワールドのほうを動かす。
// `useFrame` の中にカメラを動かすコードが1行も無いことが、そのまま C の定義になっている。
//
// スクロールの進みは **ref で共有する**。空とライトは進みに応じて色が変わるが、
// それを React の state でやると毎フレーム全体が再レンダリングされる。
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { cameraPose, currentSearch, overrideProgress, progressAt, resolveCard } from './cards'

export default function ProtoCCamera({
  progressRef,
  onCardChange,
}: {
  progressRef: MutableRefObject<number>
  onCardChange: (index: number) => void
}) {
  const scroll = useScroll()
  const { camera } = useThree()
  const lastCard = useRef(-1)

  // クエリは実行中に変わらない前提なので1回だけ読む
  const override = useMemo(() => overrideProgress(currentSearch()), [])

  // **カメラを置くのはここ1回だけ**。以降どのフレームでも触らない
  useLayoutEffect(() => {
    const { position, target } = cameraPose()
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(target[0], target[1], target[2])
    camera.updateProjectionMatrix()
  }, [camera])

  // `?card=N` 固定時はスクロールを見ないので、カードの通知も1回で済ませる
  useEffect(() => {
    if (override !== null) {
      progressRef.current = override
      onCardChange(resolveCard(override).index)
    }
  }, [override, onCardChange, progressRef])

  useFrame(() => {
    if (override !== null) {
      progressRef.current = override
      return
    }
    const p = progressAt(scroll.offset)
    progressRef.current = p

    // カードが変わったときだけ React に知らせる(全体で3回しか起きない)
    const { index } = resolveCard(p)
    if (index !== lastCard.current) {
      lastCard.current = index
      onCardChange(index)
    }
  })

  return null
}
