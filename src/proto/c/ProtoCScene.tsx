// カードの列の描画。**データはすべて他のファイルで作り終えていて、ここは three.js に渡すだけ**。
//
// 組み立て方針:
//   - **1カード = 1つの InstancedMesh**。島1枚あたり数百個の箱を1回の描画に畳む
//   - 行列と色は**マウント時に1回だけ焼く**。カードは動くが、動くのは
//     カードを包む `<group>` の位置だけで、島の中身は最後まで作り直さない
//   - カードごとに `<group>` を分けるのは、`z` と揺れをカード単位で動かすため。
//     これが C の運動のすべてで、**カメラは1ミリも動かない**
//
// 輪郭線は入れていない。参考例4例のうち線があるのは①だけで、
// C が寄せている②③④はどれも線を使っていない。俯瞰で島が空を背に浮いていて
// 縁が立っているので、線を引かなくても物の切れ目が読める(共通原則6)。

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BALL_COLOR,
  BALL_EMISSIVE,
  BALL_RADIUS,
  CARDS,
  ballSpin,
  cardBob,
  cardPalette,
  cardZ,
  resolveCard,
  stageBob,
} from './cards'
import { buildIsland, paintIsland, type IslandLayout } from './island'
import type { Palette } from './palette'

/** 1枚のカード(浮島)。中身は焼いたら二度と触らない */
function Island({ layout, palette }: { layout: IslandLayout; palette: Palette }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  // **ここが②の売りの実行時の姿**。ジオメトリは `layout` のまま、色だけがパレットで変わる
  const painted = useMemo(() => paintIsland(layout, palette), [layout, palette])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const color = new THREE.Color()

    painted.forEach((piece, i) => {
      euler.set(0, piece.rotY, 0)
      quaternion.setFromEuler(euler)
      position.set(piece.center[0], piece.center[1], piece.center[2])
      scale.set(piece.size[0], piece.size[1], piece.size[2])
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, color.set(piece.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [painted])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, painted.length]} castShadow receiveShadow>
      {/* 単位立方体を各インスタンスのスケールで伸ばす。**島は岩まで含めて全部これ1種類** */}
      <boxGeometry args={[1, 1, 1]} />
      {/* A と同じく Lambert 固定。envMap も specular も無いので、
          画のトーンはパレットとライトだけで決まる(②の「パレットが商品」に合わせる) */}
      <meshLambertMaterial />
    </instancedMesh>
  )
}

export default function ProtoCScene({
  progressRef,
  paletteOverride,
  chain,
  frozen,
}: {
  /** 進み `p` の共有先。ProtoCCamera が毎フレーム書く */
  progressRef: MutableRefObject<number>
  /** `?pal=N`。null なら各カードが自分のパレット */
  paletteOverride: number | null
  /** `?chain=0` で false。ステージのカードだけを描く */
  chain: boolean
  /** `?card=N` 指定時。揺れを止めてスクリーンショットを収束させる */
  frozen: boolean
}) {
  // 4枚とも最初に1回だけ組む。**カードが画面外へ抜けても作り直さない**
  const layouts = useMemo(() => {
    const built = CARDS.map((card) => buildIsland(card))
    if (import.meta.env.DEV) {
      console.debug(
        `[proto/c] ${built
          .map((l) => `${l.id}: pieces=${l.pieces.length} filledTiles=${l.filledTiles} marks=${l.groundMarkCount}`)
          .join(' | ')}`
      )
    }
    return built
  }, [])

  const groups = useRef<Array<THREE.Group | null>>([])
  const ball = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const p = progressRef.current
    // 凍結時は時刻を止める。揺れが残っていると連続2枚が一致せず、
    // QAスクリプトが上限まで撮り続けてしまう(B で踏んだ)
    const time = frozen ? 0 : clock.getElapsedTime()
    const active = resolveCard(p).index

    for (let i = 0; i < CARDS.length; i++) {
      const g = groups.current[i]
      if (!g) continue
      // **C の運動のすべてがこの1行**。カメラではなくカードのほうが動く
      g.position.set(0, cardBob(i, time), cardZ(i, p))
      g.visible = chain || i === active
    }

    if (ball.current) {
      // 球体はステージから動かない。上下だけステージの島の揺れに乗せて接地させる
      ball.current.position.set(0, stageBob(p, time) + BALL_RADIUS, 0)
      // 進んだ距離に噛み合った転がり。**島が流れるのと同じ量だけ回る**ので空回りしない
      ball.current.rotation.x = ballSpin(p)
    }
  })

  return (
    <group>
      {CARDS.map((card, i) => (
        <group
          key={card.id}
          ref={(el) => {
            groups.current[i] = el
          }}
        >
          <Island layout={layouts[i]} palette={cardPalette(i, paletteOverride)} />
        </group>
      ))}

      {/*
        旅をする球体。**カードの外側に置く**ので、島が入れ替わっても球体は残る。
        パレットに従わない唯一の物で、4つの世界を通して同じ色のまま走り続ける。
        (見た目は試作用の暫定。最終的には既存 Crystal.tsx のレシピ
         = 透明感 + 発光パルス を移植する想定で、ここでは形と位置だけ確かめる)
      */}
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 24]} />
        <meshStandardMaterial
          color={BALL_COLOR}
          emissive={BALL_EMISSIVE}
          emissiveIntensity={0.55}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>
    </group>
  )
}
