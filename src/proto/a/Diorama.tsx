// 箱庭1つぶんの描画。土台 + 情報を乗せた地面 + 固定物 + 散布した小物 + 主役。
//
// 形はすべて箱・円柱・円錐の3種類しか使わない。参考例②③④の「1つ1つは単純な低ポリ、
// 物量で画が持つ」をそのまま採っている(docs/references/2026-08-02_x-4examples.md 共通点4)。
// マテリアルは MeshLambertMaterial 固定 = envMapもspecularも無いので、
// **画面に出る色はパレットが宣言した色そのもの**になる。色の管理をパレット1か所に閉じるための選択。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { DIORAMA_SIZE, HERO_HEIGHT, type Chapter } from './chapters'
import type { Palette } from './palette'
import { buildFixtures, type Block } from './fixtures'
import { KIND_MIXES, scatterProps, type PropKind, type ScatterItem } from './scatter'

/** 中央に空ける矩形の半辺。主役と、その周りの余白 */
const EXCLUSION_HALF = 5.5

/** 土台の厚み */
const PLINTH_HEIGHT = 1.8

type Resources = {
  props: THREE.MeshLambertMaterial[]
  accent: THREE.MeshLambertMaterial
  accentGlow: THREE.MeshLambertMaterial
  plinth: THREE.MeshLambertMaterial
  ground: THREE.MeshLambertMaterial
  box: THREE.BoxGeometry
  cylinder: THREE.CylinderGeometry
  cone: THREE.ConeGeometry
  sphere: THREE.SphereGeometry
}

/**
 * ジオメトリとマテリアルを章ごとに1組だけ作って全メッシュで共有する。
 * 200個超のメッシュがそれぞれ自前のマテリアルを持つとシェーダーコンパイルが200回走るため
 */
function useResources(palette: Palette, groundTexture: THREE.Texture): Resources {
  const resources = useMemo<Resources>(
    () => ({
      props: palette.props.map((c) => new THREE.MeshLambertMaterial({ color: c })),
      accent: new THREE.MeshLambertMaterial({ color: palette.accent }),
      // 自光。夜の章のモニターなど少量だけ。emissiveがあると影の中でも色が残る
      accentGlow: new THREE.MeshLambertMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.85 }),
      plinth: new THREE.MeshLambertMaterial({ color: palette.plinth }),
      ground: new THREE.MeshLambertMaterial({ map: groundTexture }),
      box: new THREE.BoxGeometry(1, 1, 1),
      // 低ポリを保つ。段数を上げると輪郭が丸くなってジオラマの手作り感が消える
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      cone: new THREE.ConeGeometry(0.5, 1, 7),
      sphere: new THREE.SphereGeometry(0.5, 14, 10),
    }),
    [palette, groundTexture]
  )

  // useMemoで作った資源はR3Fの自動disposeの対象外(既存プロジェクトの作法と同じ)
  useEffect(
    () => () => {
      resources.props.forEach((m) => m.dispose())
      resources.accent.dispose()
      resources.accentGlow.dispose()
      resources.plinth.dispose()
      resources.ground.dispose()
      resources.box.dispose()
      resources.cylinder.dispose()
      resources.cone.dispose()
      resources.sphere.dispose()
    },
    [resources]
  )

  return resources
}

function materialFor(res: Resources, colorIndex: number, emissive?: boolean): THREE.Material {
  if (colorIndex < 0) return emissive ? res.accentGlow : res.accent
  return res.props[colorIndex % res.props.length]
}

function geometryFor(res: Resources, kind: PropKind): THREE.BufferGeometry {
  if (kind === 'cylinder') return res.cylinder
  if (kind === 'cone') return res.cone
  // box / plate / post はすべて箱。寸法だけで描き分ける
  return res.box
}

/** 固定物(fixtures.ts)。`y` は底面なので中心へ半分持ち上げる */
function Blocks({ blocks, res }: { blocks: Block[]; res: Resources }) {
  return (
    <>
      {blocks.map((b, i) => (
        <mesh
          key={i}
          geometry={res.box}
          material={materialFor(res, b.colorIndex, b.emissive)}
          position={[b.x, b.y + b.h / 2, b.z]}
          rotation={[0, b.rotY ?? 0, 0]}
          scale={[b.w, b.h, b.d]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/** 散布した小物(scatter.ts)。**この物量が画を持たせる** */
function Scatter({ items, res }: { items: ScatterItem[]; res: Resources }) {
  return (
    <>
      {items.map((it, i) => (
        <mesh
          key={i}
          geometry={geometryFor(res, it.kind)}
          material={materialFor(res, it.colorIndex)}
          position={[it.x, it.height / 2, it.z]}
          rotation={[0, it.rotY, 0]}
          // plate は奥行きを削って板に、post は細いまま縦に伸ばす
          scale={[it.footprint, it.height, it.kind === 'plate' ? it.footprint * 0.68 : it.footprint]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/**
 * 主役。胴だけに accent を使う。
 * 参考例では主役が画面の1/4〜1/8しかないので、**形で目立たせるのではなく色で1点だけ立てる**
 */
function Hero({ chapter, res }: { chapter: Chapter; res: Resources }) {
  const h = HERO_HEIGHT
  const [x, z] = chapter.heroPos
  return (
    <group position={[x, 0, z]} rotation={[0, chapter.heroRotY, 0]}>
      {/* 脚 */}
      <mesh geometry={res.box} material={res.props[3]} position={[-0.13, h * 0.21, 0]} scale={[0.21, h * 0.42, 0.24]} castShadow receiveShadow />
      <mesh geometry={res.box} material={res.props[3]} position={[0.13, h * 0.21, 0]} scale={[0.21, h * 0.42, 0.24]} castShadow receiveShadow />
      {/* 胴(差し色) */}
      <mesh geometry={res.box} material={res.accent} position={[0, h * 0.6, 0]} scale={[0.56, h * 0.36, 0.32]} castShadow receiveShadow />
      {/* 腕 */}
      <mesh geometry={res.box} material={res.accent} position={[-0.36, h * 0.58, 0]} scale={[0.15, h * 0.32, 0.17]} castShadow receiveShadow />
      <mesh geometry={res.box} material={res.accent} position={[0.36, h * 0.58, 0]} scale={[0.15, h * 0.32, 0.17]} castShadow receiveShadow />
      {/* 頭 */}
      <mesh geometry={res.sphere} material={res.props[2]} position={[0, h * 0.88, 0]} scale={0.42} castShadow receiveShadow />
      {/* 足元のボール。全章に置いて、章をまたぐ連続性を作る唯一の物にする */}
      <mesh geometry={res.sphere} material={res.props[1]} position={[0.95, 0.36, 0.7]} scale={0.72} castShadow receiveShadow />
    </group>
  )
}

export default function Diorama({
  chapter,
  palette,
  groundTexture,
}: {
  chapter: Chapter
  palette: Palette
  groundTexture: THREE.Texture
}) {
  const res = useResources(palette, groundTexture)
  const fixtures = useMemo(() => buildFixtures(chapter.id), [chapter.id])
  const items = useMemo(
    () =>
      scatterProps({
        seed: chapter.seed,
        count: chapter.propCount,
        // 縁ちょうどに置くと土台からはみ出るので少し内側に寄せる
        half: DIORAMA_SIZE / 2 - 0.8,
        exclusionHalf: EXCLUSION_HALF,
        kinds: KIND_MIXES[chapter.id],
        colorCount: palette.props.length,
        minGap: 0.62,
      }),
    [chapter.id, chapter.seed, chapter.propCount, palette.props.length]
  )

  return (
    <group>
      {/* 土台。地面より一回り大きくして「切り取られた箱庭」に見せる */}
      <mesh
        geometry={res.box}
        material={res.plinth}
        position={[0, -PLINTH_HEIGHT / 2 - 0.02, 0]}
        scale={[DIORAMA_SIZE + 1.2, PLINTH_HEIGHT, DIORAMA_SIZE + 1.2]}
        castShadow
        receiveShadow
      />
      {/* 地面。**この面に情報が乗っているかがプロトタイプAの成否**(groundMarks.ts) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={res.ground} receiveShadow>
        <planeGeometry args={[DIORAMA_SIZE, DIORAMA_SIZE]} />
      </mesh>
      <Blocks blocks={fixtures} res={res} />
      <Scatter items={items} res={res} />
      <Hero chapter={chapter} res={res} />
    </group>
  )
}
