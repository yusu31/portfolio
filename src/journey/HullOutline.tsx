// 【検証用・Issue #345 段階2】方式B: 逆ハル(インバーテッドハル)による輪郭線。
//
// 対象メッシュに「頂点を法線方向へ押し出した裏面だけのコピー」を子として足す古典的手法。
// 方式A(深度エッジ)との決定的な違いは**線幅がワールド空間**であること。
// 遠くのものほど線が細くなるので、セル画というより「3Dアニメ」寄りの見え方になる。
//
// toonPreview.tsx と同じく実行時 `scene.traverse` の差し替えスイッチにしてある。
// 既存のジオメトリ・マテリアルを一切書き換えないので、同じビルドで撮り比べられる。
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { currentSearch, getHullTuning, isHullPreview, type HullTuning } from './nprPreview'

/**
 * ハル用マテリアル。`ShaderMaterial` を自前で書くのは `MeshBasicMaterial` +
 * `onBeforeCompile` だと `normal` 属性が宣言されている保証を仕様として持てないため。
 * `ShaderMaterial` なら position / normal / 各種行列は three.js が必ず注入する。
 *
 * フォグを効かせるのは必須。シーンには `<fog args={['#f2b8a0', 14, 65]}>` があるので、
 * フォグ無しだと遠景のヴェニューだけ輪郭線が夕靄を無視して黒々と残り、線が浮く
 */
function createHullMaterial(tuning: HullTuning): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    { hullWidth: { value: tuning.width }, hullColor: { value: new THREE.Color() } },
  ])
  uniforms.hullColor.value = new THREE.Color(tuning.color)

  return new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    // 裏面だけ描く = 表から見ると元のメッシュに隠れ、はみ出した縁だけが線として残る
    side: THREE.BackSide,
    vertexShader: /* glsl */ `
      uniform float hullWidth;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position + normal * hullWidth;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 hullColor;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(hullColor, 1.0);
        #include <fog_fragment>
      }
    `,
  })
}

/** ハルを付けない対象の判定 */
function shouldSkip(mesh: THREE.Mesh): boolean {
  const material = mesh.material as THREE.Material
  if (!material || Array.isArray(mesh.material)) return true

  // InstancedMesh(drei <Clouds>)はインスタンス行列を自前シェーダーで扱っていないので対象外。
  // そもそも雲に輪郭線は要らない
  if ((mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return true

  const standard = material as THREE.MeshStandardMaterial
  const physical = material as THREE.MeshPhysicalMaterial
  const toon = material as THREE.MeshToonMaterial
  // ライティングを受ける実体だけを対象にする。<Sky>(生ShaderMaterial)・drei <Text>・
  // ハル自身(ShaderMaterial)はここで落ちる。
  // MeshToonMaterial を含めるのは必須: `?toon=1&hull=1` では ToonPreview が先に走って
  // マテリアルがトゥーンに差し変わっているため、Standard/Physicalだけ見ると全部素通りする
  if (!standard.isMeshStandardMaterial && !physical.isMeshPhysicalMaterial && !toon.isMeshToonMaterial) {
    return true
  }

  // 自発光オーブ: 光の玉に黒縁を付けると光源に見えなくなる
  if (standard.emissiveIntensity > 1 && standard.toneMapped === false) return true

  // 風(netWind)・地面の穴(groundHole)は onBeforeCompile による**頂点/アルファの書き換え**。
  // ハル側はその変形を再現できないため、付けると本体からズレた線が residual として残る。
  // 「再現できないものには線を引かない」のが正しい(ネットは方式Aの担当)
  if (material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return true

  return false
}

const HULL_FLAG = '__nprHull'

export function HullOutline() {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    if (!isHullPreview(currentSearch())) return
    const material = createHullMaterial(getHullTuning(currentSearch()))
    const added: THREE.Mesh[] = []
    const done = new WeakSet<THREE.Mesh>()

    const attach = () => {
      // traverse中に子を足すと走査対象が増えるので、収集してから足す
      const targets: THREE.Mesh[] = []
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh || mesh.userData[HULL_FLAG]) return
        if (done.has(mesh) || shouldSkip(mesh)) return
        done.add(mesh)
        targets.push(mesh)
      })

      for (const mesh of targets) {
        // geometry を共有するので、ベイクVerletでネットが動いても
        // モーフ/位置更新はハル側にもそのまま反映される
        const hull = new THREE.Mesh(mesh.geometry, material)
        hull.userData[HULL_FLAG] = true
        // 元メッシュのローカル空間にぶら下げる = 親の変換を自動で受ける
        mesh.add(hull)
        added.push(hull)
      }
      console.log(`[hull] attached ${targets.length} (total ${added.length})`)
    }

    // シーンは Suspense / フォント読み込み / Environment で段階的に組み上がる。
    // toonPreview.tsx と同じ間隔で追走する
    attach()
    const timers = [400, 1200, 3000, 6000].map((ms) => window.setTimeout(attach, ms))

    return () => {
      for (const timer of timers) window.clearTimeout(timer)
      for (const hull of added) hull.removeFromParent()
      material.dispose()
    }
  }, [scene])

  return null
}
