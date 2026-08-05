// 章ごとの「手で置く固定物」(純データ)。散布(scatter.ts)が密度を作るのに対して、
// こちらは**その場所が何であるかを説明する**役割を持つ。ゴール・フープ・ネット・モニター。
//
// 全部を箱で作る。参考例②③④は「1つ1つは単純な低ポリ」なので、
// 試作の段階で形にコストをかける理由がない(共通原則4)。角の面取りやベベルは
// 方向が決まってから(⑤ Blenderベベルは保留中)。
//
// 座標系: 地面が y=0、x/z は ±DIORAMA_SIZE/2 の範囲。
// `y` は**底面の高さ**にしてある(中心ではない)。地面に物を置く記述が y:0 で済むため。
import { DIORAMA_SIZE, type ChapterId } from './chapters'

export type Block = {
  x: number
  /** 底面の高さ。地面に直置きなら0 */
  y: number
  z: number
  w: number
  h: number
  d: number
  rotY?: number
  /** パレットの props のインデックス。-1 は accent(差し色)を意味する */
  colorIndex: number
  /** 自光。夜の章のモニターなど、少量だけ使う */
  emissive?: boolean
}

const HALF = DIORAMA_SIZE / 2

/** バスケットゴール一式(支柱・バックボード・リング)。柱ものは箱の組み合わせで十分読める */
function hoop(x: number, z: number, facing: number, colorIndex: number): Block[] {
  return [
    { x, y: 0, z, w: 0.4, h: 4.2, d: 0.4, colorIndex },
    // バックボード。facing で前後どちらを向くか決める
    { x, y: 3.4, z: z + facing * 0.6, w: 3.4, h: 2.1, d: 0.18, colorIndex: 2 },
    { x, y: 3.5, z: z + facing * 1.5, w: 1.5, h: 0.12, d: 1.5, colorIndex: -1 },
  ]
}

/** サッカーゴール(2本の支柱 + クロスバー + ネット面) */
function soccerGoal(z: number, colorIndex: number): Block[] {
  const w = 2.7
  return [
    { x: -w, y: 0, z, w: 0.26, h: 2.6, d: 0.26, colorIndex },
    { x: w, y: 0, z, w: 0.26, h: 2.6, d: 0.26, colorIndex },
    { x: 0, y: 2.6, z, w: w * 2 + 0.26, h: 0.26, d: 0.26, colorIndex },
    // ネットは薄い面1枚で代用。試作なので網目は作らない
    { x: 0, y: 0, z: z - Math.sign(z) * 0.9, w: w * 2, h: 2.5, d: 0.06, colorIndex: 2 },
  ]
}

/** 柵。細い柱を等間隔に並べて横帯を渡す。**垂直の線が並ぶと密度が一気に上がる** */
function fence(
  from: [number, number],
  to: [number, number],
  count: number,
  height: number,
  colorIndex: number
): Block[] {
  const blocks: Block[] = []
  const dx = (to[0] - from[0]) / count
  const dz = (to[1] - from[1]) / count
  for (let i = 0; i <= count; i++) {
    blocks.push({ x: from[0] + dx * i, y: 0, z: from[1] + dz * i, w: 0.12, h: height, d: 0.12, colorIndex })
  }
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const angle = Math.atan2(to[0] - from[0], to[1] - from[1])
  for (const hy of [height * 0.45, height * 0.92]) {
    blocks.push({
      x: (from[0] + to[0]) / 2,
      y: hy,
      z: (from[1] + to[1]) / 2,
      w: 0.06,
      h: 0.08,
      d: len,
      rotY: angle,
      colorIndex,
    })
  }
  return blocks
}

/** 体育館。奥の壁 + 肋木 + バレーの支柱とネット + 跳び箱 + 平均台 + バスケゴール */
function gymFixtures(): Block[] {
  const blocks: Block[] = [
    // 奥と左の壁。2面だけ立てると「屋内」になり、残り2面は開いたままなので箱庭として見せられる
    { x: 0, y: 0, z: -HALF, w: DIORAMA_SIZE, h: 7, d: 0.5, colorIndex: 0 },
    { x: -HALF, y: 0, z: 0, w: 0.5, h: 7, d: DIORAMA_SIZE, colorIndex: 0 },
    // 壁の腰板。横の帯が1本入るだけで壁の高さが読めるようになる
    { x: 0, y: 1.6, z: -HALF + 0.3, w: DIORAMA_SIZE, h: 0.3, d: 0.12, colorIndex: 1 },
    { x: -HALF + 0.3, y: 1.6, z: 0, w: 0.12, h: 0.3, d: DIORAMA_SIZE, colorIndex: 1 },
    // 高窓。奥の壁に明るい帯を入れて光源の方向を示す。
    // 差し色(accent)を使うと**画面上部の広い面積を差し色が占めてしまい**、
    // 「差し色は少量だけ」というパレットの前提が崩れる(実測で確認)。明るい地の色にする
    { x: 0, y: 4.6, z: -HALF + 0.32, w: 16, h: 1.6, d: 0.1, colorIndex: 0 },
  ]
  // 肋木(壁面の横桟)。左の壁に等間隔で。
  // 赤(props[1])だと壁の上で強すぎて画面を横切る線になるので、沈む色にする
  for (let i = 0; i < 9; i++) {
    blocks.push({ x: -HALF + 0.45, y: 0.5 + i * 0.55, z: -3, w: 0.12, h: 0.14, d: 5, colorIndex: 3 })
  }
  // バレーの支柱とネット。地面の白線(センターライン my=0.5 → z=0)に合わせてある
  blocks.push({ x: -7.9, y: 0, z: 0, w: 0.22, h: 3.2, d: 0.22, colorIndex: 3 })
  blocks.push({ x: 7.9, y: 0, z: 0, w: 0.22, h: 3.2, d: 0.22, colorIndex: 3 })
  blocks.push({ x: 0, y: 2.2, z: 0, w: 15.8, h: 1, d: 0.05, colorIndex: 2 })
  // 跳び箱(段が重なっているので上に行くほど細くする)
  for (let i = 0; i < 5; i++) {
    blocks.push({ x: -6.4, y: i * 0.42, z: 6.2, w: 2.2 - i * 0.16, h: 0.42, d: 1.5 - i * 0.1, colorIndex: 1 })
  }
  // 平均台
  blocks.push({ x: 6.6, y: 1.1, z: 5.4, w: 0.3, h: 0.25, d: 6, colorIndex: 1 })
  blocks.push({ x: 6.6, y: 0, z: 3.0, w: 0.6, h: 1.1, d: 0.3, colorIndex: 3 })
  blocks.push({ x: 6.6, y: 0, z: 7.8, w: 0.6, h: 1.1, d: 0.3, colorIndex: 3 })
  // 壁付けのバスケゴール(体育館は壁側に畳まれている)
  blocks.push(...hoop(0, -HALF + 1.6, 1, 3))
  // ボールカゴ(枠だけの箱を4本の柱で表す)
  for (const [ox, oz] of [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7],
  ]) {
    blocks.push({ x: -8.6 + ox, y: 0, z: -6.2 + oz, w: 0.12, h: 1.5, d: 0.12, colorIndex: 3 })
  }
  return blocks
}

/** 校庭。サッカーゴール2つ + 校舎 + ベンチ + コーナーフラッグ + 木 */
function fieldFixtures(): Block[] {
  const blocks: Block[] = [
    // 校舎。箱庭の外に置いて背景として効かせる。窓の帯で「建物」と読ませる。
    // 幅26だと画面の左上4分の1を占めて主役の箱庭を食うので、18に絞って奥へ下げた(実測)
    { x: -1, y: 0, z: -HALF - 5, w: 18, h: 8, d: 5, colorIndex: 2 },
  ]
  for (let f = 0; f < 3; f++) {
    blocks.push({ x: -1, y: 1.5 + f * 2.3, z: -HALF - 2.4, w: 16, h: 1.1, d: 0.2, colorIndex: 3 })
  }
  blocks.push(...soccerGoal(-9.7, 2))
  blocks.push(...soccerGoal(9.7, 2))
  // コーナーフラッグ。地面のコーナーアークと同じ座標に立てる
  for (const [fx, fz] of [
    [-9.2, -9.7],
    [9.2, -9.7],
    [-9.2, 9.7],
    [9.2, 9.7],
  ]) {
    blocks.push({ x: fx, y: 0, z: fz, w: 0.1, h: 1.7, d: 0.1, colorIndex: 2 })
    blocks.push({ x: fx, y: 1.4, z: fz, w: 0.5, h: 0.35, d: 0.06, colorIndex: -1 })
  }
  // ベンチ(屋根付き)を右手に2つ
  for (const bz of [-2.5, 2.5]) {
    blocks.push({ x: 10.2, y: 0.5, z: bz, w: 1.2, h: 0.2, d: 3.4, colorIndex: 1 })
    blocks.push({ x: 10.2, y: 0, z: bz - 1.4, w: 0.9, h: 0.5, d: 0.2, colorIndex: 1 })
    blocks.push({ x: 10.2, y: 0, z: bz + 1.4, w: 0.9, h: 0.5, d: 0.2, colorIndex: 1 })
    blocks.push({ x: 10.6, y: 2.3, z: bz, w: 1.8, h: 0.14, d: 3.8, colorIndex: 3 })
    blocks.push({ x: 11.3, y: 0, z: bz, w: 0.14, h: 2.3, d: 0.14, colorIndex: 3 })
  }
  // 木。幹 + 葉を箱2段で。散布のconeより大きい個体を混ぜると縮尺が伝わる
  for (const [tx, tz] of [
    [-10.8, -5],
    [-10.4, 1.5],
    [-11, 7.5],
  ]) {
    blocks.push({ x: tx, y: 0, z: tz, w: 0.5, h: 2.2, d: 0.5, colorIndex: 1 })
    blocks.push({ x: tx, y: 2.0, z: tz, w: 3.2, h: 1.8, d: 3.2, colorIndex: 3 })
    blocks.push({ x: tx, y: 3.4, z: tz, w: 2.2, h: 1.4, d: 2.2, colorIndex: 3 })
  }
  return blocks
}

/** 街のコート。ハーフコートのフープ + 周囲のフェンス + 街灯 + 自販機 + 室外機の壁 */
function courtFixtures(): Block[] {
  const blocks: Block[] = [
    // 奥のビル(3棟)。高さを変えて街のスカイラインにする
    { x: -7, y: 0, z: -HALF - 4, w: 9, h: 14, d: 6, colorIndex: 3 },
    { x: 1.5, y: 0, z: -HALF - 5.5, w: 8, h: 19, d: 6, colorIndex: 1 },
    { x: 9.5, y: 0, z: -HALF - 3.5, w: 7, h: 11, d: 6, colorIndex: 3 },
  ]
  // ビルの窓。横帯を積む
  for (let f = 0; f < 6; f++) {
    blocks.push({ x: -7, y: 1.5 + f * 2.1, z: -HALF - 1.1, w: 7.6, h: 0.9, d: 0.2, colorIndex: 2 })
    blocks.push({ x: 1.5, y: 1.5 + f * 2.8, z: -HALF - 2.6, w: 6.6, h: 1.1, d: 0.2, colorIndex: 2 })
  }
  // フープ。地面の3Pアーク(cy=0.16 → z≈-7.5)の奥、ベースライン(cy=0.1 → z≈-8.8)の外に立てる
  blocks.push(...hoop(0, -9.6, 1, 0))
  // フェンス。コートを3辺囲む。**この柱の列が密度の主戦力**
  blocks.push(...fence([-10.5, -10.5], [-10.5, 10.5], 16, 3.4, 0))
  blocks.push(...fence([10.5, -10.5], [10.5, 10.5], 16, 3.4, 0))
  blocks.push(...fence([-10.5, 10.5], [10.5, 10.5], 16, 3.4, 0))
  // 街灯2本
  for (const lx of [-9.4, 9.4]) {
    blocks.push({ x: lx, y: 0, z: -2, w: 0.24, h: 7, d: 0.24, colorIndex: 0 })
    blocks.push({ x: lx * 0.86, y: 6.7, z: -2, w: 1.6, h: 0.2, d: 0.5, colorIndex: 0 })
    blocks.push({ x: lx * 0.78, y: 6.5, z: -2, w: 0.9, h: 0.25, d: 0.4, colorIndex: -1, emissive: true })
  }
  // 自販機とベンチ
  blocks.push({ x: -8.6, y: 0, z: 8.2, w: 1.4, h: 2.4, d: 0.9, colorIndex: 0 })
  blocks.push({ x: -8.6, y: 0.7, z: 8.68, w: 1.0, h: 1.4, d: 0.08, colorIndex: -1, emissive: true })
  blocks.push({ x: 7.2, y: 0.55, z: 8.6, w: 3.6, h: 0.18, d: 1.0, colorIndex: 1 })
  blocks.push({ x: 5.7, y: 0, z: 8.6, w: 0.2, h: 0.55, d: 0.9, colorIndex: 0 })
  blocks.push({ x: 8.7, y: 0, z: 8.6, w: 0.2, h: 0.55, d: 0.9, colorIndex: 0 })
  return blocks
}

/**
 * デスク。**地面そのものが机の天板**なので、置くのは机の上の物だけ。
 * 人物が机の上に立つ縮尺のズレは意図的で、参考例④(Katamari クローン)の
 * 「木のテーブルの上に日用品が散乱」をそのまま採っている
 */
function deskFixtures(): Block[] {
  const blocks: Block[] = [
    // モニター(メイン)。スタンド + パネル + 発光面
    { x: 0, y: 0, z: -5.4, w: 2.2, h: 0.25, d: 1.4, colorIndex: 3 },
    { x: 0, y: 0.25, z: -5.4, w: 0.5, h: 1.6, d: 0.4, colorIndex: 3 },
    { x: 0, y: 1.6, z: -5.4, w: 8.4, h: 4.8, d: 0.3, colorIndex: 3 },
    { x: 0, y: 1.75, z: -5.15, w: 8, h: 4.5, d: 0.06, colorIndex: -1, emissive: true },
    // サブモニター(縦置き)。2枚あると「作業机」になる
    { x: 6.4, y: 0, z: -3.6, w: 1.6, h: 0.22, d: 1.2, rotY: -0.5, colorIndex: 3 },
    { x: 6.4, y: 0.22, z: -3.6, w: 0.45, h: 1.3, d: 0.35, rotY: -0.5, colorIndex: 3 },
    { x: 6.4, y: 1.4, z: -3.6, w: 3.4, h: 5.4, d: 0.28, rotY: -0.5, colorIndex: 3 },
    { x: 6.28, y: 1.55, z: -3.48, w: 3.1, h: 5.1, d: 0.06, rotY: -0.5, colorIndex: -1, emissive: true },
    // キーボードとマウス。デスクマット(x -6.6〜6.6 / z -5.7〜5.7)の中に置く
    { x: -0.4, y: 0, z: 0.6, w: 6.4, h: 0.35, d: 2.1, rotY: 0.04, colorIndex: 0 },
    { x: 4.2, y: 0, z: 0.9, w: 1.1, h: 0.45, d: 1.6, colorIndex: 0 },
    // マグカップ(本体 + 取っ手)
    { x: -6.2, y: 0, z: -1.2, w: 1.2, h: 1.5, d: 1.2, colorIndex: 1 },
    { x: -5.4, y: 0.4, z: -1.2, w: 0.5, h: 0.7, d: 0.25, colorIndex: 1 },
    // 本の山(2つ)。厚みを変えて積む
    { x: -7.4, y: 0, z: 4.4, w: 3.4, h: 0.5, d: 2.4, rotY: 0.1, colorIndex: 2 },
    { x: -7.4, y: 0.5, z: 4.4, w: 3.2, h: 0.4, d: 2.3, rotY: -0.05, colorIndex: 1 },
    { x: -7.4, y: 0.9, z: 4.4, w: 3.3, h: 0.45, d: 2.2, rotY: 0.14, colorIndex: 3 },
    { x: 7.6, y: 0, z: 5.2, w: 2.8, h: 0.42, d: 2.0, rotY: -0.18, colorIndex: 3 },
    { x: 7.6, y: 0.42, z: 5.2, w: 2.7, h: 0.38, d: 1.9, rotY: 0.06, colorIndex: 2 },
    // 卓上ライト
    { x: 9.2, y: 0, z: -0.6, w: 1.4, h: 0.2, d: 1.4, colorIndex: 0 },
    { x: 9.2, y: 0.2, z: -0.6, w: 0.18, h: 3.4, d: 0.18, colorIndex: 0 },
    { x: 8.0, y: 3.2, z: -0.6, w: 2.6, h: 0.7, d: 0.9, rotY: 0, colorIndex: 0 },
    // スマホと小物入れ
    { x: 2.6, y: 0, z: 3.8, w: 1.0, h: 0.12, d: 1.9, rotY: 0.3, colorIndex: 3 },
    { x: -2.8, y: 0, z: 4.6, w: 1.3, h: 1.1, d: 1.3, colorIndex: 0 },
  ]
  // ペン立ての中身
  for (let i = 0; i < 5; i++) {
    blocks.push({ x: -3.0 + i * 0.14, y: 0.9, z: 4.6 + (i % 2) * 0.2, w: 0.1, h: 1.4, d: 0.1, rotY: i * 0.4, colorIndex: i % 4 })
  }
  return blocks
}

const FIXTURE_BUILDERS: Record<ChapterId, () => Block[]> = {
  gym: gymFixtures,
  field: fieldFixtures,
  court: courtFixtures,
  desk: deskFixtures,
}

export function buildFixtures(id: ChapterId): Block[] {
  return FIXTURE_BUILDERS[id]()
}
