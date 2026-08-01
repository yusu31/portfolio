// 地面の穴(groundHole.ts)のuniformをスクロールから駆動するフック。
//
// 穴を開ける面は「全区間を貫く地面(ScrollJourneyPoc.tsxのGround)」と
// 「バスケコート面(venues.tsxのBasketVenue)」の2枚あり、親グループが違う。
// 共有ストアを持たず**各自がoffsetから同じ値を導出する**設計にしているのは、
// このプロジェクトの「offsetが唯一の真実」原則(状態を持たない)に従うため。
// 同じuから同じ式で計算するので2枚がズレることはない。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { getBallPose } from './ball/ballPath'
import { diveHoleStrength } from './diveVeilEnvelope'
import { createGroundHoleUniforms, type GroundHoleUniforms } from './groundHole'

export function useGroundHole(): GroundHoleUniforms {
  const uniforms = useMemo(() => createGroundHoleUniforms(), [])
  const scroll = useScroll()
  // 直前フレームの強さ。0が2回続いたらuniform更新ごとスキップする(旅の約9割は穴が閉じている)
  const previousStrength = useRef(0)

  useFrame(() => {
    const strength = diveHoleStrength(scroll.offset)
    if (strength === 0 && previousStrength.current === 0) return
    previousStrength.current = strength
    uniforms.uHoleStrength.value = strength
    // getBallPose()は毎回Vector3を新規生成するので、穴が閉じている間は呼ばない
    if (strength > 0) {
      const ball = getBallPose(scroll.offset).position
      uniforms.uHoleCenter.value.set(ball.x, ball.z)
    }
  })

  return uniforms
}
