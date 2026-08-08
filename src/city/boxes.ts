// 街のデータ(道の座標)をワールド座標の箱に変換する層。`proto/b/boxes.ts` の移植(§5.3)。
// 変えたのは import 元と、`heroParts()` を落としたこと(人物アバターは入れない)だけ。
//
// **描画と輪郭線がここを共有する**のが要点。同じ `PlacedBox[]` から
// InstancedMesh も稜線バッファも作るので、「線だけ位置がズレる」ことが原理的に起きない。
//
// 色はここで焼く。`paletteAt(t)` を物自身の位置で引くので、
// 世界の色が場所に紐づき、道を進むと朝の街から夜の街へ空間的に移り変わる
// (毎フレーム数百個のインスタンス色を書き換えなくて済む)。
import { CURB_HEIGHT } from './roadSurface'
import { FACADE_X, roadPoint, roadTangent } from './route'
import { paletteAt, shadeHex } from './palette'
import { shouldOutline, type OutlineBox } from './outline'
import type { Building, Overhead, Street, StreetProp } from './street'

/** 配置済みの箱。ワールド座標・確定した色を持つ */
export type PlacedBox = OutlineBox & {
  /** 道に沿った位置。輪郭線の色も位置ごとに引くので、置いたあとも参照できるように持たせる */
  t: number
  color: string
  /** 輪郭線を引くか。小さい物に線を引くと遠景で線が団子になる */
  outline: boolean
}

/** 三角コーンだけは箱にならないので別に持つ */
export type PlacedCone = {
  center: readonly [number, number, number]
  radius: number
  height: number
  color: string
}

/**
 * 輪郭線を引く最小の大きさ。
 * 1.6 だと電柱・標識・手すり・段差には線が乗り、室外機・ゴミ箱には乗らない。
 * 参考例①でも線が乗っているのは構造物で、細かい散乱物は色の塊として置かれていた
 */
export const OUTLINE_MIN_EXTENT = 1.6

/** 道の向き。box の local +Z が進行方向に一致する */
function yawAt(t: number): number {
  const tan = roadTangent(t)
  return Math.atan2(tan[0], tan[2])
}

/** 路面の高さ + 歩道の段差。建物と歩道の小物はこの高さに立つ */
function walkY(t: number): number {
  return roadPoint(t, 0)[1] + CURB_HEIGHT
}

function placeBuilding(b: Building): PlacedBox[] {
  const out: PlacedBox[] = []
  const palette = paletteAt(b.t)
  const base = walkY(b.t)
  const yaw = yawAt(b.t)
  // 壁面から奥行きの半分だけ外へ。setback があるぶん壁が引っ込む
  const lateral = b.side * (FACADE_X + b.setback + b.depth / 2)
  const p = roadPoint(b.t, lateral)
  const color = palette.buildings[b.colorIndex]

  out.push({
    t: b.t,
    center: [p[0], base + b.height / 2, p[2]],
    // local X = 道を横切る方向、local Z = 道に沿う方向
    size: [b.depth, b.height, b.width],
    rotY: yaw,
    color,
    outline: true,
  })

  // 屋上の塊。シルエットに変化が出て、建物が同じ高さの壁に見えなくなる
  if (b.capHeight > 0) {
    const capDepth = b.depth * 0.55
    const capWidth = b.width * 0.5
    const capP = roadPoint(b.t, b.side * (FACADE_X + b.setback + capDepth / 2 + 0.8))
    out.push({
      t: b.t,
      center: [capP[0], base + b.height + b.capHeight / 2, capP[2]],
      size: [capDepth, b.capHeight, capWidth],
      rotY: yaw,
      color: shadeHex(color, -0.08),
      outline: true,
    })
  }

  // 1階の庇(店先)。街の足元に情報ができて、壁が単なる面でなくなる
  if (b.awning > 0) {
    const p2 = roadPoint(b.t, b.side * (FACADE_X + b.setback - b.awning / 2))
    out.push({
      t: b.t,
      center: [p2[0], base + 3.05, p2[2]],
      size: [b.awning, 0.22, b.width * 0.86],
      rotY: yaw,
      color: shadeHex(palette.buildings[(b.colorIndex + 2) % 4], -0.12),
      outline: true,
    })
  }

  return out
}

function placeProp(p: StreetProp): { boxes: PlacedBox[]; cones: PlacedCone[] } {
  const palette = paletteAt(p.t)
  const boxes: PlacedBox[] = []
  const cones: PlacedCone[] = []
  const yaw = yawAt(p.t) + p.yaw
  const pos = roadPoint(p.t, p.lateral)
  // コーンだけ車道に置くので段差の上に乗らない
  const base = p.kind === 'cone' ? pos[1] : pos[1] + CURB_HEIGHT
  const color = p.accent ? palette.accent : palette.buildings[p.colorIndex]

  if (p.kind === 'cone') {
    cones.push({
      center: [pos[0], base + p.height / 2, pos[2]],
      radius: p.depth / 2,
      height: p.height,
      color: palette.accent,
    })
    return { boxes, cones }
  }

  const size: [number, number, number] = [p.depth, p.height, p.width]
  boxes.push({
    t: p.t,
    center: [pos[0], base + p.height / 2, pos[2]],
    size,
    rotY: yaw,
    color,
    outline: shouldOutline(size, OUTLINE_MIN_EXTENT),
  })

  // 標識は柱だけだと読めないので板を足す。**標識板は差し色を使える数少ない場所**
  if (p.kind === 'sign') {
    const plate: [number, number, number] = [0.06, 0.62, 0.62]
    boxes.push({
      t: p.t,
      center: [pos[0], base + p.height - 0.34, pos[2]],
      size: plate,
      rotY: yaw,
      color: palette.accent,
      outline: true,
    })
  }

  // 手すりは支柱が無いと浮いて見える
  if (p.kind === 'rail') {
    const post: [number, number, number] = [p.depth, p.height, p.depth]
    for (const s of [-1, 1]) {
      const end = roadPoint(p.t + (s * p.width) / 2, p.lateral)
      boxes.push({
        t: p.t,
        center: [end[0], base + p.height / 2, end[2]],
        size: post,
        rotY: yaw,
        color: shadeHex(color, -0.1),
        outline: false,
      })
    }
  }

  return { boxes, cones }
}

/**
 * 上部構造。**道をまたぐので幅は道幅ぜんぶ**。
 * 参考例①の「上部は歩道橋が横切って画面を締める」がこれにあたる
 */
function placeOverhead(o: Overhead): PlacedBox[] {
  const palette = paletteAt(o.t)
  const out: PlacedBox[] = []
  const yaw = yawAt(o.t)
  const center = roadPoint(o.t, 0)
  const y = center[1] + o.height
  const across = FACADE_X * 2 + 1.2
  const color = o.kind === 'banner' ? palette.accent : palette.buildings[o.colorIndex]

  if (o.kind === 'wire') {
    // 電線は複数本。細いので線として読ませる。輪郭線は引かない(線に線を重ねても太るだけ)
    for (let i = 0; i < 3; i++) {
      const c = roadPoint(o.t + (i - 1) * 0.5, 0)
      out.push({
        t: o.t,
        center: [c[0], y - i * 0.42, c[2]],
        size: [across, o.thickness, o.thickness],
        rotY: yaw,
        color: shadeHex(palette.outline, 0.15),
        outline: false,
      })
    }
    return out
  }

  // 渡す部材(歩道橋の床・梁・横断幕)
  out.push({
    t: o.t,
    center: [center[0], y, center[2]],
    size: [across, o.kind === 'banner' ? 1.1 : o.thickness, o.span],
    rotY: yaw,
    color,
    outline: true,
  })

  if (o.kind === 'bridge') {
    // 手すりを両側に。歩道橋が板一枚に見えないようにする
    for (const s of [-1, 1]) {
      const railP = roadPoint(o.t + (s * o.span) / 2, 0)
      out.push({
        t: o.t,
        center: [railP[0], y + 0.55, railP[2]],
        size: [across, 0.9, 0.12],
        rotY: yaw,
        color: shadeHex(color, 0.12),
        outline: true,
      })
    }
    // 両端の柱。地面まで下ろすと歩道橋が街に接続される
    for (const s of [-1, 1]) {
      const colP = roadPoint(o.t, s * (FACADE_X + 0.4))
      const ground = colP[1] + CURB_HEIGHT
      const h = y - ground
      out.push({
        t: o.t,
        center: [colP[0], ground + h / 2, colP[2]],
        size: [0.5, h, o.span * 0.9],
        rotY: yaw,
        color: shadeHex(color, -0.1),
        outline: true,
      })
    }
  }

  return out
}

export type PlacedStreet = {
  boxes: PlacedBox[]
  cones: PlacedCone[]
  /** 輪郭線を引く箱だけを抜いたもの */
  outlined: PlacedBox[]
}

/** 街ぜんぶをワールド座標に配置する。描画側はこの結果だけを見る */
export function placeStreet(street: Street): PlacedStreet {
  const boxes: PlacedBox[] = []
  const cones: PlacedCone[] = []

  for (const b of street.buildings) boxes.push(...placeBuilding(b))
  for (const o of street.overheads) boxes.push(...placeOverhead(o))
  for (const p of street.props) {
    const placed = placeProp(p)
    boxes.push(...placed.boxes)
    cones.push(...placed.cones)
  }

  return { boxes, cones, outlined: boxes.filter((b) => b.outline) }
}
