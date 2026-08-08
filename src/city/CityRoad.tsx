// 路面の描画。**PR 1 の暫定リボンを B の `roadSurface.ts` ベースへ置き換えたもの**(§10 PR 2)。
//
// PR 1 から増えたのは3つ:
//   - **縁石の段差**(車道 → 立ち上がり → 歩道)。段差が消えることが「敷地に入った」の
//     合図になるので(§1.2 装置2)、まず段差がある状態を作る。消すのは PR 3
//   - **路面マーキング**(白線・路側帯・マンホール・補修跡・横断歩道)。件数がそのまま
//     地面の情報量なので `roadSurface.test.ts` で下限を縛っている
//   - 材質を `meshStandardMaterial` から **`meshLambertMaterial`** へ(B と同じ)。
//     街の箱が `meshToonMaterial` なので、路面に PBR のスペキュラが乗ると質感が食い違う
//
// 作り方の要点は**色を頂点に焼くこと**(B の設計判断2)。パレットは `t` の関数なので、
// リボンの各断面で `paletteAt(t)` を引いて頂点色に入れておけば、毎フレーム材質を
// 書き換えなくても「道を進むと朝から夜へ空間的に移り変わる」が成立する。
import { useMemo } from 'react'
import * as THREE from 'three'
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

/**
 * 路面の分割数。曲がりと坂を折れ線で近似するので、少ないとカクつきが見える。
 * B の 260(全長 391)と**同じ密度**になるよう経路長の比で引き直した値(479 / 1.5)
 */
const ROAD_SEGMENTS = 320

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
        strip.surface === 'road'
          ? p.road
          : strip.surface === 'curb'
            ? shadeHex(p.sidewalk, -0.18)
            : strip.surface === 'ground'
              ? // 遠景の地面はパレットの歩道色から沈めて導出する。
                // 別の色を持ち込まないので、情報を足しても画面の色数が増えない
                shadeHex(p.sidewalk, -0.14)
              : p.sidewalk
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
    <mesh geometry={geometry} receiveShadow={strip.receiveShadow}>
      {/* 路面はトゥーンにしない。長い斜面に段が出ると坂が階段に見える */}
      <meshLambertMaterial vertexColors side={THREE.FrontSide} />
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

export default function CityRoad() {
  // 世界は静的なので1回だけ作る。パレットは頂点に焼いてあるので毎フレームの更新が要らない
  return (
    <group>
      {STRIPS.map((strip) => (
        <RoadStrip key={strip.id} strip={strip} />
      ))}
      <RoadMarks dark={false} />
      <RoadMarks dark />
    </group>
  )
}
