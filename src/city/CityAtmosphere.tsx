// 空・フォグ・ライト。B の `ProtoB.tsx` の `Atmosphere` を移植したもの。
//
// **色は state ではなく ref 経由で更新する**。カメラが連続移動してパレットも連続に変わるので、
// state にすると毎フレーム React 全体が再レンダリングされる。ここで直接 three.js の
// オブジェクトを書き換えれば、更新するのは数個の色と位置だけで済む。
//
// 影の色は `ambientLight` の色で作る。three.js では影の中に残るのは間接光だけなので
// **ambient の色 = 影の色**になる(A で確立した知見。hemisphereLight ではできない)。
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { paletteAt } from './palette'
import { ballAnchorAt } from './ball'

export default function CityAtmosphere({ distanceRef }: { distanceRef: React.MutableRefObject<number> }) {
  const { scene } = useThree()
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const target = useRef<THREE.Object3D>(null)

  const fogRef = useRef<THREE.Fog>(null)

  // 使い回す。毎フレーム new すると GC が回る
  const scratch = useMemo(
    () => ({ sky: new THREE.Color(), anchor: new THREE.Vector3(), ahead: new THREE.Vector3() }),
    []
  )

  useFrame(() => {
    const t = distanceRef.current
    const p = paletteAt(t)

    scratch.sky.set(p.sky)
    scene.background = scratch.sky
    if (fogRef.current) {
      fogRef.current.color.copy(scratch.sky)
      fogRef.current.near = p.fogNear
      fogRef.current.far = p.fogFar
    }

    if (ambient.current) {
      ambient.current.color.set(p.shadowColor)
      ambient.current.intensity = p.ambientIntensity
    }
    if (hemi.current) {
      hemi.current.color.set(p.skyColor)
      hemi.current.groundColor.set(p.shadowColor)
      hemi.current.intensity = p.ambientIntensity * 0.5
    }
    if (key.current && target.current) {
      const anchor = ballAnchorAt(t, scratch.anchor)
      key.current.color.set(p.key.color)
      key.current.intensity = p.key.intensity
      key.current.shadow.intensity = p.shadowOpacity
      // ライトを主役に追従させる。道が長いので固定位置だと影が付いてくれない
      key.current.position.set(
        anchor.x + p.key.offset[0],
        anchor.y + p.key.offset[1],
        anchor.z + p.key.offset[2]
      )
      // シャドウカメラの中心は主役の少し前。**カメラが見ているのは前方なので、
      // 主役に合わせると画面の手前3割にしか影が落ちない**
      const ahead = ballAnchorAt(t + 16, scratch.ahead)
      target.current.position.copy(ahead)
      target.current.updateMatrixWorld()
    }
  })

  const initial = paletteAt(0)

  return (
    <>
      {/*
        フォグは宣言的に置いて**最初のレンダーから存在させる**。B は `scene.fog` を
        useFrame の中で代入していて、実測ではそれでも同じ絵になる(出力がバイト単位で一致)。
        three.js はシーンの fog の有無が変わるとプログラムを組み直すので後から代入しても効くが、
        最初のフレームだけ差が出うる書き方をわざわざ残す理由が無いのでこちらにした。

        ⚠ 街区で地平線が硬い線に見えるのはフォグの不具合ではない。地面をほぼ真横から
        見ているので、**フォグの帯(70→210)が地平のすぐ下の数ピクセルに圧縮される**
        (レイキャスト実測: y=470 で視線軸距離 32.1、その 8px 上で無限遠)。
        PR 2 で建物が地平を覆えば見えなくなる
      */}
      <fog ref={fogRef} attach="fog" args={[initial.sky, initial.fogNear, initial.fogFar]} />
      {/* 影の色 = キーライトが届かない面に残る色 */}
      <ambientLight ref={ambient} intensity={1} />
      {/* 上下の差。空側だけ明るくして、路面と地面が同じ明るさにならないようにする */}
      <hemisphereLight ref={hemi} intensity={0.5} />
      <object3D ref={target} />
      <directionalLight
        ref={key}
        castShadow
        target={target.current ?? undefined}
        // 追従するので範囲は主役の周りだけでよい。狭いほど影が鮮明になる
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0012}
      />
    </>
  )
}
