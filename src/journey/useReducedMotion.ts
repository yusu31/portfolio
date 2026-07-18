// prefers-reduced-motion検出フック(カメラ姿勢反転演出PR1 #271で導入)。
// ブラウザAPI(matchMedia)の副作用をここに閉じ込め、cameraAttitude.tsの純関数性を守る。
// カメラ姿勢はidle演出よりはるかに強い動きのため、Phase 7を待たず初回から対応する(設計書§reduced-motion)。
import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onStoreChange)
  return () => mql.removeEventListener('change', onStoreChange)
}

function getSnapshot(): 0 | 1 {
  return window.matchMedia(QUERY).matches ? 0 : 1
}

/**
 * 姿勢演出のスケール(0=reduced-motion有効で演出無効、1=フル振幅)を返す。
 * OS設定の変更にもリアルタイム追従する。ボール軌道自体は変更しないため、
 * reduced-motion時も「落下して受け止める」というボールの動きの意味は保たれる
 */
export function useReducedMotion(): 0 | 1 {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1)
}
