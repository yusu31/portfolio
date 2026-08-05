// 主役(人物)。**背面追従なので画面に映るのは背中**。
//
// 低ポリの箱の集合で、輪郭線もローカル座標で1回だけ組んでグループごと動かす
// (街の輪郭線はワールド座標で焼いてあるが、主役は動くのでこちらはローカルで持つ)。
//
// 歩行のバウンドは `frozen` で止められる。QAで区間を直接指定したときにアニメーションが
// 残っていると、スクリーンショットの「連続2枚が一致するまで待つ」が永久に成立しない
// (現行シーンの雲で実際に踏んだ失敗)。
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heroParts } from './boxes'
import { buildEdgeBuffer, buildEdgeColorBuffer } from './outline'
import { paletteAt, parseHex } from './palette'
import { HERO_HEIGHT, LEGS, legStart } from './route'

export default function Hero({
  legIndex,
  frozen,
  outline,
}: {
  /** 線の色を引く区間。距離で引くと毎フレーム作り直しになるので区間単位にとどめる */
  legIndex: number
  frozen: boolean
  outline: boolean
}) {
  const bob = useRef<THREE.Group>(null)
  const parts = useMemo(() => heroParts(HERO_HEIGHT), [])

  const outlineGeometry = useMemo(() => {
    const positions = buildEdgeBuffer(parts)
    // 主役の線もその区間のパレットから引く。街の線と色が揃う
    const at = legStart(legIndex) + LEGS[Math.min(legIndex, LEGS.length - 1)].length / 2
    const [r, g0, b] = parseHex(paletteAt(at).outline)
    const rgb: [number, number, number] = [r / 255, g0 / 255, b / 255]
    const colors = buildEdgeColorBuffer(parts, () => rgb)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeBoundingSphere()
    return g
  }, [parts, legIndex])

  useLayoutEffect(() => () => outlineGeometry.dispose(), [outlineGeometry])

  useFrame((state) => {
    if (!bob.current) return
    // 歩幅ぶんの上下動。止めるときは基準位置に戻す(撮影のたびに高さが変わらないように)
    bob.current.position.y = frozen ? 0 : Math.abs(Math.sin(state.clock.elapsedTime * 4.4)) * 0.05
  })

  return (
    <group ref={bob}>
      {parts.map((part, i) => (
        <mesh
          key={i}
          position={[part.center[0], part.center[1], part.center[2]]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
          <meshToonMaterial color={part.color} />
        </mesh>
      ))}
      {outline && (
        <lineSegments geometry={outlineGeometry}>
          <lineBasicMaterial vertexColors />
        </lineSegments>
      )}
    </group>
  )
}
