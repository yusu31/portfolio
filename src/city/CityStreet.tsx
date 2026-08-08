// 街の描画。**データはすべて他のファイルで作り終えていて、ここは three.js に渡すだけ**。
// `proto/b/ProtoBScene.tsx` の街の部分だけを移植したもの(路面は `CityRoad.tsx` が持つ)。
//
// 描画の組み立て方針(B と同じ):
//   - 箱は種類を問わず1つの InstancedMesh にまとめる(建物・小物・上部構造で千個規模になる)
//   - 輪郭線も1つの lineSegments にまとめる。位置は描画と同じ `PlacedBox[]` から作るので
//     「線だけ位置がズレる」ことが起きない
//   - 色は頂点/インスタンスに焼く。パレットは場所ごとに引いてあるので、
//     毎フレーム色を書き換える必要がない(空とライトだけがカメラ位置に追従する)
//
// B に足したのは**縦グラデーションの焼き込み**だけ(`shading.ts`)。
// 単色の板に見えるのが B の既知の弱点だったので、壁の足元に陰を入れて塊として読ませる
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { placeStreet, type PlacedBox, type PlacedCone } from './boxes'
import { buildStreet } from './street'
import { buildEdgeBuffer, buildEdgeColorBuffer, segmentCount } from './outline'
import { paletteAt, parseHex } from './palette'
import { bakeVerticalGradient } from './shading'

const hexToRgb01 = (hex: string): [number, number, number] => {
  const [r, g, b] = parseHex(hex)
  return [r / 255, g / 255, b / 255]
}

/**
 * 箱の高さ方向の分割数。**縦グラデーションに曲線を効かせるために要る**
 * (分割0だと上端と下端の2値だけになり、足元に陰を集められない)。
 * 3分割で 0 / 1/3 / 2/3 / 1 の4段になり、`GRADIENT_CURVE = 0.6` の立ち上がりが読める
 */
const BOX_HEIGHT_SEGMENTS = 3

/** 箱をまとめて1つの InstancedMesh にする */
function BoxField({ items }: { items: readonly PlacedBox[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  // 単位立方体は全インスタンスで共有するので、縦グラデーションもここで1回焼けば全部に効く
  const geometry = useMemo(
    () => bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, BOX_HEIGHT_SEGMENTS, 1)),
    []
  )
  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const color = new THREE.Color()

    items.forEach((item, i) => {
      euler.set(0, item.rotY, 0)
      quaternion.setFromEuler(euler)
      position.set(item.center[0], item.center[1], item.center[2])
      scale.set(item.size[0], item.size[1], item.size[2])
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, color.set(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      {/*
        セル調の陰影。アニメ調はここと輪郭線の組み合わせで出る。
        `vertexColors` を立てることで「焼いた縦グラデーション × インスタンスのパレット色」になる
      */}
      <meshToonMaterial vertexColors />
    </instancedMesh>
  )
}

/** 三角コーンだけは円錐なので別のインスタンス群にする */
function ConeField({ items }: { items: readonly PlacedCone[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  // 6角錐。低ポリのままで十分コーンに見える。箱と同じ縦グラデーションを焼いて質感を揃える
  const geometry = useMemo(() => bakeVerticalGradient(new THREE.ConeGeometry(1, 1, 6, 2)), [])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const color = new THREE.Color()

    items.forEach((item, i) => {
      position.set(item.center[0], item.center[1], item.center[2])
      scale.set(item.radius, item.height, item.radius)
      matrix.compose(position, new THREE.Quaternion(), scale)
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, color.set(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshToonMaterial vertexColors />
    </instancedMesh>
  )
}

/**
 * 輪郭線。**採否は PR 5 で決める**(§9)ので、`?ol=0` で消せる状態にしてある。
 *
 * 色は箱ごとにその場所のパレットから引く(夜の章の線は暗く、朝の章は明るい)。
 * 位置と色を同じ打ち切り規則で作るので、線の色がひとつずつズレることがない
 */
function Outline({ boxes }: { boxes: readonly PlacedBox[] }) {
  const geometry = useMemo(() => {
    const positions = buildEdgeBuffer(boxes)
    const colors = buildEdgeColorBuffer(boxes, (box) => hexToRgb01(paletteAt((box as PlacedBox).t).outline))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeBoundingSphere()
    return g
  }, [boxes])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors />
    </lineSegments>
  )
}

export default function CityStreet({ outline }: { outline: boolean }) {
  // 街は1回だけ作る。**スクロールしても作り直さない**(位置ごとに色まで焼いてある)。
  // 生成量を DEV でログに出すのは、「見えない」ときにデータが無いのか描画が壊れているのかを
  // 切り分けるため(見えない = 壊れている と即断しないための材料)
  const placed = useMemo(() => {
    const result = placeStreet(buildStreet())
    if (import.meta.env.DEV) {
      const segments = segmentCount(buildEdgeBuffer(result.outlined))
      console.debug(`[city] boxes=${result.boxes.length} cones=${result.cones.length} outlineSegments=${segments}`)
    }
    return result
  }, [])

  return (
    <group>
      <BoxField items={placed.boxes} />
      <ConeField items={placed.cones} />
      {outline && <Outline boxes={placed.outlined} />}
    </group>
  )
}
