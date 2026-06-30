/**
 * Hero(100vh)を65%スクロールした時点でクリスタルが画面上端から消える、という
 * Phase 3-7の演出設計に基づく閾値。CameraRig（カメラ制御）とCrystalContainer
 * （クリスタル表示制御）の両方がこの値を基準に「Hero区間かどうか」を判定するため、
 * 値のズレを防ぐためここに集約する。
 */
export function getHeroScrollRange(): number {
  return window.innerHeight * 0.65
}
