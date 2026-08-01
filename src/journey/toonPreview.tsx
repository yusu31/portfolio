// 【検証用・Issue #345】シーン全体をトゥーンシェーディングへ実行時に差し替えるQAスイッチ。
//
// X で集めた参考例(probiex007 / threejsassets / McGreenBeats / kenyondigital)が
// 全て非写実だったため、「PBRをやめたら本当に良くなるか」を**全面採用の前に**見る。
//
// 既存のマテリアル定義を一切書き換えないのが要点:
// - 同じビルドで `?toon=1` の有無だけを変えて撮り比べられる(比較条件として最良)
// - 却下ならこのファイルと2行の呼び出しを消すだけで元に戻る
//
// 恒久採用が決まったら、実行時traverseではなく各コンポーネントのマテリアル定義側へ移すこと
// (毎フレームではなくマウント時1回とはいえ、traverseで他人のマテリアルを差し替えるのは
//  本番の設計としては筋が悪い)
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** QA用クエリパラメータ。`/scroll-poc?toon=1` でトゥーン化して開く */
export const TOON_QUERY = 'toon'

export function isToonPreview(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(TOON_QUERY) !== null
}

/**
 * 段階トーンのグラデーションマップ。
 *
 * `NearestFilter` にすることで陰影が連続でなく**段**になる(これがトゥーンの肝)。
 * 段数を増やすほどPBRに近づくので、参考例のセル画らしさを狙って4段にした
 */
function createGradientMap(steps: number): THREE.DataTexture {
  const data = new Uint8Array(steps)
  for (let i = 0; i < steps; i++) {
    // 最暗部を0にすると影が黒く潰れて夕景のパレットが死ぬので、下限を持ち上げる
    data[i] = Math.round(THREE.MathUtils.lerp(90, 255, i / (steps - 1)))
  }
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

const TOON_STEPS = 4

/** 差し替え対象外の判定。クリスタル球(transmission)と発光オーブは今の見た目が正解 */
function shouldSkip(material: THREE.Material): boolean {
  // MeshPhysicalMaterial = クリスタル球のtransmissionレシピ。既存判断「球は変更不要」を守る
  if ((material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return true
  // 自発光オーブ・タイトル文字はライティングを受けないので、トゥーンにしても意味がない
  if (!(material as THREE.MeshStandardMaterial).isMeshStandardMaterial) return true
  const standard = material as THREE.MeshStandardMaterial
  if (standard.emissiveIntensity > 1 && standard.toneMapped === false) return true
  return false
}

function toToon(source: THREE.MeshStandardMaterial, gradientMap: THREE.DataTexture): THREE.MeshToonMaterial {
  const toon = new THREE.MeshToonMaterial({
    color: source.color,
    map: source.map,
    emissive: source.emissive,
    emissiveIntensity: source.emissiveIntensity,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
    alphaTest: source.alphaTest,
    gradientMap,
  })
  // 風(netWind)と地面の穴(groundHole)はonBeforeCompile注入。MeshToonMaterialのシェーダーにも
  // <common> / <begin_vertex> / <alphamap_fragment> は存在するので、そのまま引き継げば効くはず。
  // 引き継がないと検証中だけネットが静止し地面の穴が塞がるため、絵の比較が成立しない
  if (source.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
    toon.onBeforeCompile = source.onBeforeCompile
    toon.customProgramCacheKey = () => `toon:${source.customProgramCacheKey()}`
  }
  return toon
}

export function ToonPreview() {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    if (!isToonPreview()) return
    const gradientMap = createGradientMap(TOON_STEPS)
    const created: THREE.Material[] = []
    // 差し替え前のマテリアルを覚えておき、アンマウント時に必ず戻す
    const restore: Array<{ mesh: THREE.Mesh; material: THREE.Material }> = []
    const done = new WeakSet<THREE.Mesh>()

    const swap = () => {
      let count = 0
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return
        if (done.has(mesh) || shouldSkip(mesh.material)) return
        done.add(mesh)
        restore.push({ mesh, material: mesh.material })
        const toon = toToon(mesh.material as THREE.MeshStandardMaterial, gradientMap)
        created.push(toon)
        mesh.material = toon
        count++
      })
      console.log(`[toon] swapped ${count} (total ${restore.length})`)
    }

    // シーンは段階的に組み上がる(Suspense・drei <Text> のフォント読み込み・Environment)。
    // マウント時の1回だけだと後から現れたメッシュがPBRのまま残り、絵の比較が成立しない
    swap()
    const timers = [400, 1200, 3000, 6000].map((ms) => window.setTimeout(swap, ms))

    return () => {
      for (const timer of timers) window.clearTimeout(timer)
      for (const entry of restore) entry.mesh.material = entry.material
      for (const material of created) material.dispose()
      gradientMap.dispose()
    }
  }, [scene])

  return null
}
