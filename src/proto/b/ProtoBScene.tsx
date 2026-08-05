// 街の描画。**データはすべて他のファイルで作り終えていて、ここは three.js に渡すだけ**。
//
// 描画の組み立て方針:
//   - 箱は種類を問わず1つの InstancedMesh にまとめる(建物・小物・上部構造で数百個あるため)
//   - 輪郭線も1つの lineSegments にまとめる。位置は描画と同じ `PlacedBox[]` から作るので
//     「線だけ位置がズレる」ことが起きない
//   - 色は頂点/インスタンスに焼く。パレットは場所ごとに引いてあるので、
//     毎フレーム色を書き換える必要がない(空とライトだけがカメラ位置に追従する)
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { placeStreet, type PlacedBox, type PlacedCone } from './boxes'
import { buildStreet } from './street'
import { buildEdgeBuffer, buildEdgeColorBuffer, segmentCount } from './outline'
import { paletteAt, parseHex, shadeHex } from './palette'
import {
  STRIPS,
  buildMarkGeometry,
  buildRoadMarks,
  buildStrip,
  isDarkMark,
  type StripGeometryData,
} from './roadSurface'
import { ROAD_END, ROAD_START } from './route'

/** 路面の分割数。曲がりと坂を折れ線で近似するので、少ないとカクつきが見える */
const ROAD_SEGMENTS = 260

const hexToRgb01 = (hex: string): [number, number, number] => {
  const [r, g, b] = parseHex(hex)
  return [r / 255, g / 255, b / 255]
}

/** 純データのジオメトリを three.js の BufferGeometry にする */
function useBufferGeometry(data: StripGeometryData, colors?: Float32Array) {
  return useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
    if (colors) g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setIndex(new THREE.BufferAttribute(data.indices, 1))
    g.computeBoundingSphere()
    return g
  }, [data, colors])
}

/**
 * 道の帯1本。**頂点色を位置ごとのパレットから焼く**ので、
 * 路面そのものが朝から夜へグラデーションする(建物だけ色が変わって道が置き去りになるのを防ぐ)
 */
function RoadStrip({ strip }: { strip: (typeof STRIPS)[number] }) {
  // strip は定数配列の要素なので同一性が保たれる
  const data = useMemo(
    () =>
      buildStrip(
        strip.innerOffset,
        strip.innerLift,
        strip.outerOffset,
        strip.outerLift,
        ROAD_SEGMENTS,
        ROAD_START,
        ROAD_END
      ),
    [strip]
  )
  const colors = useMemo(() => {
    const rows = ROAD_SEGMENTS + 1
    const out = new Float32Array(rows * 2 * 3)
    for (let i = 0; i < rows; i++) {
      const t = ROAD_START + (i / ROAD_SEGMENTS) * (ROAD_END - ROAD_START)
      const p = paletteAt(t)
      const hex =
        strip.surface === 'road' ? p.road : strip.surface === 'curb' ? shadeHex(p.sidewalk, -0.18) : p.sidewalk
      const rgb = hexToRgb01(hex)
      for (const o of [i * 6, i * 6 + 3]) {
        out[o] = rgb[0]
        out[o + 1] = rgb[1]
        out[o + 2] = rgb[2]
      }
    }
    return out
  }, [strip])

  const geometry = useBufferGeometry(data, colors)

  return (
    <mesh geometry={geometry} receiveShadow>
      {/* 路面はトゥーンにしない。長い斜面に段が出ると坂が階段に見える */}
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

/** 路面マーキング。明るいもの(白線)と暗いもの(マンホール・補修跡)で2枚に分ける */
function RoadMarks({ dark }: { dark: boolean }) {
  const marks = useMemo(() => buildRoadMarks().filter((m) => isDarkMark(m.kind) === dark), [dark])
  const data = useMemo(() => buildMarkGeometry(marks, dark ? 0.015 : 0.025), [marks, dark])
  const colors = useMemo(() => {
    const out = new Float32Array(marks.length * 4 * 3)
    marks.forEach((m, i) => {
      const p = paletteAt(m.t)
      // 暗いマークは路面をさらに沈めた色。パレット外の色を持ち込まない
      const rgb = hexToRgb01(dark ? shadeHex(p.road, -0.28) : p.roadMark)
      for (let v = 0; v < 4; v++) {
        const o = (i * 4 + v) * 3
        out[o] = rgb[0]
        out[o + 1] = rgb[1]
        out[o + 2] = rgb[2]
      }
    })
    return out
  }, [marks, dark])

  const geometry = useBufferGeometry(data, colors)

  return (
    <mesh geometry={geometry} receiveShadow>
      {/* 路面と同じ高さに近いので polygonOffset で必ず手前に出す */}
      <meshLambertMaterial vertexColors polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  )
}

/** 箱をまとめて1つの InstancedMesh にする */
function BoxField({ items }: { items: readonly PlacedBox[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

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
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {/* 単位立方体を各インスタンスのスケールで伸ばす */}
      <boxGeometry args={[1, 1, 1]} />
      {/* セル調の陰影。①の「アニメ調」はここと輪郭線の組み合わせで出る */}
      <meshToonMaterial />
    </instancedMesh>
  )
}

/** 三角コーンだけは円錐なので別のインスタンス群にする */
function ConeField({ items }: { items: readonly PlacedCone[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

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
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {/* 6角錐。低ポリのままで十分コーンに見える */}
      <coneGeometry args={[1, 1, 6]} />
      <meshToonMaterial />
    </instancedMesh>
  )
}

/**
 * 輪郭線。**参考例4例のうち①だけが持っていた要素**なので、
 * `?ol=0` で消せるようにして有無を同じ構図で比較できるようにしてある。
 *
 * 色は箱ごとにその場所のパレットから引く(夜の区間の線は暗く、朝の区間は明るい)。
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

export default function ProtoBScene({ outline }: { outline: boolean }) {
  // 街は1回だけ作る。**スクロールしても作り直さない**のが前提(位置ごとに色まで焼いてある)。
  // 生成量をコンソールに出すのは、「見えない」ときにデータが無いのか描画が壊れているのかを
  // 切り分けるため(見えない = 壊れている と即断しないための材料)
  const placed = useMemo(() => {
    const result = placeStreet(buildStreet())
    if (import.meta.env.DEV) {
      const segments = segmentCount(buildEdgeBuffer(result.outlined))
      console.debug(
        `[proto/b] boxes=${result.boxes.length} cones=${result.cones.length} outlineSegments=${segments}`
      )
    }
    return result
  }, [])

  return (
    <group>
      {STRIPS.map((strip) => (
        <RoadStrip key={strip.id} strip={strip} />
      ))}
      <RoadMarks dark={false} />
      <RoadMarks dark />
      <BoxField items={placed.boxes} />
      <ConeField items={placed.cones} />
      {outline && <Outline boxes={placed.outlined} />}
    </group>
  )
}
