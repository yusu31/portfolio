// src/hooks/useSceneTransition.ts
//
// FOV ワープ遷移の状態管理（module-level ref = React 外から R3F が読める）
// 使い方:
//   遷移前: warpNavigate(() => navigate('/next'))
//   新シーン mount 時: useEffect(() => warpIn(), [])

import gsap from 'gsap'

// JourneyCameraRig が毎フレーム読む FOV ref
export const fovRef = { current: 60 }

const TARGET_FOV  = 60   // 通常画角
const WARP_FOV    = 92   // ワープ時の広角（空間が歪む感覚）

// [data-scene-ui] を返す（新シーンマウント後に差し替わるのでキャッシュしない）
function getUIEl(): HTMLElement | null {
  return document.querySelector('[data-scene-ui]') as HTMLElement | null
}

/**
 * シーン遷移を開始。
 * FOV を広角に膨らませ DOM をブラー → navigate 実行。
 */
export function warpNavigate(navigate: () => void) {
  const tl = gsap.timeline()
  const proxy = { blur: 0, opacity: 1 }

  tl
    // 1. FOV 膨張 + DOM ブラー（0.55s）
    .to(fovRef, { current: WARP_FOV, duration: 0.55, ease: 'power2.in' })
    .to(proxy, {
      blur: 14, opacity: 0.1,
      duration: 0.40, ease: 'power2.in',
      onUpdate() {
        const el = getUIEl()
        if (el) {
          el.style.filter  = `blur(${proxy.blur}px)`
          el.style.opacity = `${proxy.opacity}`
        }
      },
    }, '<')
    // 2. ピーク時にルート切替
    .add(navigate)
}

/**
 * 新シーンのマウント時に呼ぶ。
 * DOM を即座にブラー状態にセットし、FOV と共に収束させる。
 */
export function warpIn() {
  const proxy = { blur: 14, opacity: 0.1 }

  // DOM を即ブラー状態に（フラッシュ防止）
  const el = getUIEl()
  if (el) {
    el.style.filter  = `blur(14px)`
    el.style.opacity = '0.1'
  }

  // FOV 収束（0.9s）
  gsap.to(fovRef, { current: TARGET_FOV, duration: 0.9, ease: 'power3.out' })

  // DOM クリア（0.1s ディレイで FOV 収束に合わせる）
  gsap.to(proxy, {
    blur: 0, opacity: 1,
    duration: 0.75, delay: 0.1, ease: 'power2.out',
    onUpdate() {
      const el2 = getUIEl()
      if (el2) {
        el2.style.filter  = `blur(${proxy.blur}px)`
        el2.style.opacity = `${proxy.opacity}`
      }
    },
  })
}
