// groundMarks.ts のデータを CanvasTexture に焼く(ブラウザ専用)。
// データと描画を分けてあるので、パレットを差し替えるだけで同じ地面デザインが別の世界になる
// (参考例②が Day/Golden/Misty/Night で同じアセットを使い回していたのと同じ構造)。
import * as THREE from 'three'
import type { GroundMark } from './groundMarks'
import { shadeHex, type Palette } from './palette'

/**
 * テクスチャの一辺(px)。22ユニットの地面に対して1024だと約46px/ユニット。
 * 白線(正規化0.004 = 4px)がアンチエイリアス込みで潰れずに出る最小ライン
 */
export const TEXTURE_SIZE = 1024

/** マークの色を解決する。tone を持つものは**地面ベース色の明暗**、持たないものは白線色 */
function markColor(mark: { tone?: number }, palette: Palette): string {
  return mark.tone === undefined ? palette.groundMark : shadeHex(palette.ground, mark.tone)
}

/** 2Dコンテキストへマークを描く。テストしやすいよう副作用をこの関数に閉じる */
export function drawGroundMarks(
  ctx: CanvasRenderingContext2D,
  size: number,
  marks: readonly GroundMark[],
  palette: Palette
): void {
  ctx.fillStyle = palette.ground
  ctx.fillRect(0, 0, size, size)
  ctx.lineCap = 'round'

  for (const mark of marks) {
    const color = markColor(mark, palette)
    switch (mark.kind) {
      case 'band':
        ctx.fillStyle = color
        ctx.fillRect(mark.x * size, mark.y * size, mark.w * size, mark.h * size)
        break
      case 'line':
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, mark.lw * size)
        ctx.beginPath()
        ctx.moveTo(mark.x1 * size, mark.y1 * size)
        ctx.lineTo(mark.x2 * size, mark.y2 * size)
        ctx.stroke()
        break
      case 'rect':
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, mark.lw * size)
        ctx.strokeRect(mark.x * size, mark.y * size, mark.w * size, mark.h * size)
        break
      case 'circle':
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, mark.lw * size)
        ctx.beginPath()
        ctx.arc(mark.cx * size, mark.cy * size, mark.r * size, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'arc':
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, mark.lw * size)
        ctx.beginPath()
        ctx.arc(mark.cx * size, mark.cy * size, mark.r * size, mark.a0, mark.a1)
        ctx.stroke()
        break
      case 'dot':
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(mark.cx * size, mark.cy * size, mark.r * size, 0, Math.PI * 2)
        ctx.fill()
        break
    }
  }
}

/**
 * CanvasTexture を作る。呼び出し側で必ず dispose すること
 * (useMemo で作った資源はR3Fの自動disposeの対象外。既存プロジェクトの作法と同じ)
 */
export function createGroundTexture(marks: readonly GroundMark[], palette: Palette): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  drawGroundMarks(ctx, TEXTURE_SIZE, marks, palette)

  const texture = new THREE.CanvasTexture(canvas)
  // 色はパレット由来のsRGB値をそのまま描いているので、リニア変換をtexture側で行う
  texture.colorSpace = THREE.SRGBColorSpace
  // 俯瞰でも斜めから見るので、異方性フィルタが無いと遠側の白線が消える
  texture.anisotropy = 8
  return texture
}
