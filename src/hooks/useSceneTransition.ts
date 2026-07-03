// src/hooks/useSceneTransition.ts
//
// FOV ワープ遷移の状態管理（module-level ref = React 外から R3F が読める）
// 使い方:
//   遷移前: warpNavigate(() => navigate('/next'), '#ff8c00')
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

// 画面全体を覆うフラッシュ Overlay（遷移のカット感を光で隠蔽）
function getFlashEl(): HTMLElement {
  let el = document.querySelector('[data-warp-flash]') as HTMLElement | null
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('data-warp-flash', '')
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999',
      'background:white', 'opacity:0', 'pointer-events:none',
    ].join(';')
    document.body.appendChild(el)
  }
  return el
}

/**
 * シーン遷移を開始。
 * FOV を広角に膨らませ DOM をブラー → navigate 実行。
 * @param flashColor 行き先シーンのアクセントカラー（「次の世界の光」をイメージ）
 */
export function warpNavigate(navigate: () => void, flashColor = '#ffffff') {
  const tl = gsap.timeline()
  const proxy = { blur: 0, opacity: 1 }

  const flash = getFlashEl()
  flash.style.background = flashColor

  tl
    // 1. FOV 膨張 + DOM ブラー（0.38s / expo.in → クリック瞬間に鋭く引っ張られる）
    .to(fovRef, { current: WARP_FOV, duration: 0.38, ease: 'expo.in' })
    .to(proxy, {
      blur: 14, opacity: 0.1,
      duration: 0.30, ease: 'expo.in',
      onUpdate() {
        const el = getUIEl()
        if (el) {
          el.style.filter  = `blur(${proxy.blur}px)`
          el.style.opacity = `${proxy.opacity}`
        }
      },
    }, '<')
    // 2. フラッシュで画面を塗りつぶしてカット感を隠蔽
    .to(flash, { opacity: 1, duration: 0.12, ease: 'power2.in' }, '-=0.06')
    // 3. フラッシュ全開の瞬間にルート切替（ここで 3D シーンが差し替わる）
    .add(navigate)
}

/**
 * 新シーンのマウント時に呼ぶ。
 * DOM を即座にブラー状態にセットし、FOV と共に収束させる。
 */
export function warpIn() {
  const proxy = { blur: 14, opacity: 0.1 }
  const flash = getFlashEl()

  // 新シーンが描画される前にフラッシュを全開にセット
  flash.style.opacity = '1'

  // DOM を即ブラー状態に（フラッシュ防止）
  const el = getUIEl()
  if (el) {
    el.style.filter  = `blur(14px)`
    el.style.opacity = '0.1'
  }

  // FOV 収束（1.2s / expo.out → 氷の上を滑るような余韻）
  gsap.to(fovRef, { current: TARGET_FOV, duration: 1.2, ease: 'expo.out' })

  // フラッシュを素早くフェードアウト（0.3s — 「瞬き」の間に次の世界へ）
  gsap.to(flash, { opacity: 0, duration: 0.3, delay: 0.06, ease: 'expo.out' })

  // DOM クリア（0.1s ディレイ）
  gsap.to(proxy, {
    blur: 0, opacity: 1,
    duration: 0.95, delay: 0.1, ease: 'expo.out',
    onUpdate() {
      const el2 = getUIEl()
      if (el2) {
        el2.style.filter  = `blur(${proxy.blur}px)`
        el2.style.opacity = `${proxy.opacity}`
      }
    },
  })
}
