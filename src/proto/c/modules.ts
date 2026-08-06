// モジュールカタログ。**プロトタイプCの中心にある考え方**。
//
// 参考例②(threejs assets / Railway パック)は「決まった寸法のモジュールを敷き詰めて世界を作る」
// パックだった。1つ1つは単純な低ポリで、物量と組み合わせで画が持っている
// (docs/references/2026-08-02_x-4examples.md の ② と共通点4)。
//
// **借りるのは「モジュールを敷き詰める」という作り方だけで、題材は借りない。**
// ②は鉄道パックなので最初は線路を背骨にしていたが、このポートフォリオの世界では
// **移動するのは球体**であって列車ではない。線路は世界観と噛み合わないので、
// 背骨を「走路(レーン)」に置き換え、モジュールも体育館・校庭・コート・スタジアムの
// 語彙で揃えてある(観客席スタンド・照明塔・コートのライン・用具置き場)。
//
// ここではその思想を次の形で実装する:
//   - 島は `GRID × GRID` のタイル格子でしかない
//   - 1タイルに1モジュールが乗る。モジュールは**タイル中心を受け取って箱の集合を返すだけの純関数**
//   - **全カードが同じカタログを共有する**。カードごとに違うのは抽選の重みとシードだけ
//   - **モジュールは色を知らない**。`ColorSlot` という口しか持たないので、
//     パレットを差し替えると同じ配置のまま世界が入れ替わる(= ②の売り)
//
// 箱しか使わないのは、全部を1つの InstancedMesh に流し込めるようにするため
// (B で確立したやり方)。曲面が要る岩だけは島の側で別に持つ。

import type { ColorSlot } from './palette'

/**
 * 配置済みの1個。**島ローカル座標**で、島の天面が y=0。
 * 色ではなく `slot` を持つのがこのファイルの要点
 */
export type Piece = {
  /** 中心座標(島ローカル) */
  center: readonly [number, number, number]
  /** 各軸の寸法 */
  size: readonly [number, number, number]
  /** Y軸まわりの回転(ラジアン) */
  rotY: number
  slot: ColorSlot
}

/** モジュールに渡すもの。**タイルの位置と乱数だけ**で、パレットは渡らない */
export type ModuleContext = {
  /** タイル中心の島ローカルX */
  cx: number
  /** タイル中心の島ローカルZ */
  cz: number
  /** タイルの一辺 */
  tile: number
  /** 決定的乱数。同じカード・同じタイルなら常に同じ結果になる */
  rand: () => number
}

/**
 * モジュールの種類。
 *
 * `lane` だけは抽選に出さず**中央列に固定で敷く**。
 * カードが一列に並ぶので、走路が全カードを貫いて奥まで一直線につながる
 * (章は独立した世界だが1本の道でつながっている、という構図になる)
 */
export type ModuleKind =
  | 'lane'
  | 'stand'
  | 'block'
  | 'floodlight'
  | 'grove'
  | 'gear'
  | 'fence'
  | 'court'
  | 'empty'

/** 抽選に出るモジュール(= `lane` 以外)。カードの重みはこの集合の上で定義する */
export const SCATTER_KINDS: readonly ModuleKind[] = [
  'stand',
  'block',
  'floodlight',
  'grove',
  'gear',
  'fence',
  'court',
  'empty',
]

/**
 * mulberry32。短くて分布が十分な決定的PRNG。
 *
 * `Math.random` を使わないのは、カードが手前に流れて画面外へ抜け、
 * 戻ってきたときに配置が変わると「カードが1枚の決まった世界である」前提が崩れるため。
 * proto/a にも同じものがあるが、**C は proto/a を import しない**のが要件なので写している
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `[min, max)` の一様乱数 */
const range = (rand: () => number, min: number, max: number) => min + rand() * (max - min)

/** 構造物の色スロットを4つのうちから引く。**パレット外の色が入らない唯一の入口** */
const structureSlot = (rand: () => number): ColorSlot =>
  (['structure0', 'structure1', 'structure2', 'structure3'] as const)[Math.floor(rand() * 4)]

// --- 壁の情報(窓・看板) ---------------------------------------------------
//
// **建物が無地の板**というのが A / B / C を通した最大の弱点だった。
// 俯瞰なので壁の面積は屋根に次いで大きく、ここが単色だと
// 「地面に情報を乗せる」「密度を上げる」の投資が壁で止まる。
//
// 窓も看板も**箱を壁からわずかに浮かせて貼るだけ**。曲面を持ち込まないので
// 島まるごと1つの InstancedMesh に畳むという C の作りが崩れない。
//
// 色は `window` / `windowAlt` / `accent` のスロットしか触らない。**モジュールは何色かを知らない**ので、
// パレットを差し替えると同じ形のまま昼のビルが夜の街になる(②のモジュラー思想の実体)。

/** 壁に貼る板の厚み。0 だと壁と同一平面で Z ファイティングするので必ず浮かせる */
const PANEL_T = 0.06

/**
 * 窓の1枚の目安寸法。これで割って何行何列取れるかを決める。
 *
 * 建物の幅は 1.05〜1.9 しかないので、**ここを大きく取ると全部の建物が1列**になり、
 * 窓ではなくエレベーターシャフトのような縦の帯に見える。2〜3列入る寸法にしてある
 */
const WINDOW_W = 0.28
const WINDOW_H = 0.36
/** 窓の間隔(枠のぶん)。**詰めすぎると格子ではなく1枚の面に見える** */
const WINDOW_GAP_X = 0.16
const WINDOW_GAP_Y = 0.24

/** もう1種類の窓が出る割合。昼では「深く沈んだガラス」、夜では「もっと明るい部屋」になる */
const WINDOW_ALT_RATIO = 0.3

/**
 * 建物ローカルの (ox, oz) を rotY で回してワールド(島ローカル)のオフセットにする。
 * 建物は ±0.25 rad 傾いているので、**回さずに貼ると窓が壁からずれて宙に浮く**
 */
function rotateXZ(ox: number, oz: number, rotY: number): [number, number] {
  const s = Math.sin(rotY)
  const c = Math.cos(rotY)
  return [ox * c + oz * s, -ox * s + oz * c]
}

/**
 * 建物の壁に窓を貼る。
 *
 * **カメラから見える2面(+X / +Z)にしか貼らない**。カメラは +X+Z 側の高い位置に固定なので、
 * -X / -Z の面は最後まで一度も映らない。裏に貼るぶんは丸ごと無駄な箱になる
 * (4面に貼ると箱の数が倍になるが、絵は1ピクセルも変わらない)。
 *
 * 行数・列数は建物の寸法から決める。**固定にすると細い建物で窓がはみ出す**
 */
export function windowsOn(
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  rotY: number,
  rand: () => number
): Piece[] {
  const out: Piece[] = []
  // 足元と屋根際は空ける。ここまで窓を詰めると壁が窓だけになって建物の面が消える
  const usableH = h - 0.7
  const rows = Math.min(Math.floor(usableH / (WINDOW_H + WINDOW_GAP_Y)), 4)
  if (rows < 1) return out

  // 面ごとに [面の幅, 面の法線方向のローカルオフセット] が変わるだけで、あとは共通
  for (const face of ['x', 'z'] as const) {
    const faceW = face === 'x' ? d : w
    const cols = Math.min(Math.max(Math.floor((faceW - WINDOW_GAP_X) / (WINDOW_W + WINDOW_GAP_X)), 1), 3)
    const spanX = cols * WINDOW_W + (cols - 1) * WINDOW_GAP_X
    const spanY = rows * WINDOW_H + (rows - 1) * WINDOW_GAP_Y
    // 壁の中に収まらない場合は貼らない(はみ出した窓は「浮いた板」に見える)
    if (spanX > faceW - 0.16) continue

    const depth = face === 'x' ? w / 2 + PANEL_T / 2 : d / 2 + PANEL_T / 2
    // 縦は中央よりやや上に寄せる。足元に寄ると1階が窓だらけの妙な建物になる
    const baseY = h / 2 - spanY / 2 + 0.12

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = -spanX / 2 + WINDOW_W / 2 + c * (WINDOW_W + WINDOW_GAP_X)
        const [ox, oz] = face === 'x' ? rotateXZ(depth, u, rotY) : rotateXZ(u, depth, rotY)
        out.push({
          center: [x + ox, baseY + r * (WINDOW_H + WINDOW_GAP_Y), z + oz],
          size: face === 'x' ? [PANEL_T, WINDOW_H, WINDOW_W] : [WINDOW_W, WINDOW_H, PANEL_T],
          rotY,
          slot: rand() < WINDOW_ALT_RATIO ? 'windowAlt' : 'window',
        })
      }
    }
  }
  return out
}

/**
 * 看板。**壁看板と屋上看板の2種類**で、どちらも `accent` を使う。
 *
 * 新しい色を持ち込まないので、情報を足しても1画面の色数が増えない(共通原則1)。
 * 差し色が壁の高い位置に点在すると、無地だった壁面に視線の止まりどころができる
 */
export function signsOn(
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  rotY: number,
  rand: () => number
): Piece[] {
  const out: Piece[] = []

  // 壁看板。見える2面のどちらかに1枚だけ。両面に貼ると看板だらけの街になる
  if (rand() < 0.45) {
    const onX = rand() < 0.5
    const faceW = onX ? d : w
    const boardW = faceW * 0.62
    const depth = onX ? w / 2 + PANEL_T / 2 : d / 2 + PANEL_T / 2
    const [ox, oz] = onX ? rotateXZ(depth, 0, rotY) : rotateXZ(0, depth, rotY)
    // 上寄りに貼る。俯瞰なので下に貼ると手前の物に隠れる
    const y = h * 0.78
    out.push({
      center: [x + ox, y, z + oz],
      size: onX ? [PANEL_T, 0.38, boardW] : [boardW, 0.38, PANEL_T],
      rotY,
      slot: 'accent',
    })
  }

  // 屋上看板。**建物の輪郭を屋根の上へ伸ばす**ので、低い箱が並ぶ俯瞰に垂直の変化が出る。
  // 背の低い建物に立てると看板のほうが大きくなるので、高さのある建物にだけ立てる
  if (h > 2.2 && rand() < 0.3) {
    const boardW = w * 0.7
    const boardH = 0.75
    const baseY = h + 0.16
    // 支柱。板だけだと屋根から浮いて見える
    for (const side of [-1, 1]) {
      const [px, pz] = rotateXZ(side * boardW * 0.32, 0, rotY)
      out.push({
        center: [x + px, baseY + boardH * 0.3, z + pz],
        size: [0.08, boardH * 0.6, 0.08],
        rotY,
        slot: 'post',
      })
    }
    out.push({
      center: [x, baseY + boardH * 0.72, z],
      size: [boardW, boardH * 0.56, 0.1],
      rotY,
      slot: 'accent',
    })
  }
  return out
}

/**
 * 走路(レーン)。**C の背骨**で、球体が転がっていく道。
 *
 * 最初は②に引きずられて線路にしていたが、**このポートフォリオで移動するのは球体**なので
 * 線路は世界観と噛み合わない。体育館・校庭・グラウンド・コートに通じるのは走路のほうで、
 * 白線が奥まで伸びる絵はスタジアムのトラックそのものになる。
 *
 * 走路は必ず **Z軸に沿って**タイルを貫く。カードが Z 方向に並んでいるので、
 * 全カードの走路が1本につながって奥の消失点へ収束する。
 * タイル全長ぶん敷くので、隣のタイルの走路と途切れずに接続する
 */
function lane({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const width = tile * 0.82

  // 舗装。地面より一段沈めた色にして「踏み固められた道」にする
  out.push({ center: [cx, 0.04, cz], size: [width, 0.08, tile], rotY: 0, slot: 'lane' })

  // 路肩の土。走路の縁が地面に溶けないように挟む
  for (const side of [-1, 1]) {
    out.push({
      center: [cx + side * (width / 2 + tile * 0.05), 0.03, cz],
      size: [tile * 0.1, 0.06, tile],
      rotY: 0,
      slot: 'soil',
    })
  }

  // レーンを分ける白線。**これが「地面に情報を乗せる」の主役**(共通原則3)。
  // 3本の実線が奥まで途切れずに伸びるので、走路がトラックとして読める
  for (const offset of [-width * 0.3, 0, width * 0.3]) {
    out.push({
      center: [cx + offset, 0.09, cz],
      size: [0.11, 0.04, tile],
      rotY: 0,
      slot: 'laneMark',
    })
  }

  // 横切る距離マークはタイルに1本だけ。
  // **本数を増やすと横棒が枕木の間隔になり、走路が線路の梯子に見える**(QAで実測)。
  // 縦の3本を主、横を従にしておくと「奥へ伸びるレーン」として読める
  out.push({ center: [cx, 0.09, cz], size: [width * 0.86, 0.04, 0.1], rotY: 0, slot: 'laneMark' })

  // まれにコースを示すコーンや旗。差し色が走路沿いに点在すると視線が奥へ誘導される
  if (rand() < 0.32) {
    const side = rand() < 0.5 ? -1 : 1
    const x = cx + side * tile * 0.44
    out.push({ center: [x, 0.5, cz], size: [0.1, 1.0, 0.1], rotY: 0, slot: 'post' })
    out.push({ center: [x + side * 0.16, 1.02, cz], size: [0.34, 0.24, 0.06], rotY: 0, slot: 'accent' })
  }
  return out
}

/**
 * 観客席スタンド。**段が付いていることが要点**。
 *
 * 元は駅のホームだったが、走路の脇に来るべきなのはスタンドのほう。
 * 段を3段付けると俯瞰から見たときに水平の縞が並び、単なる台より情報量が増える。
 * 屋根が水平に張り出すので、俯瞰の画に**影の面**もできる
 */
function stand({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const d = tile * 0.9
  const tiers = 3
  const tierW = tile * 0.24
  const facing = rand() < 0.5 ? -1 : 1

  // 段。走路の側が低く、外側に向かって高くなる = 観客が走路を見下ろす向き
  for (let i = 0; i < tiers; i++) {
    const h = 0.34 + i * 0.34
    const x = cx + facing * (-tile * 0.36 + tierW * (i + 0.5))
    out.push({ center: [x, h / 2, cz], size: [tierW, h, d], rotY: 0, slot: i % 2 === 0 ? 'structure0' : 'structure2' })
    // 段の縁のライン。段差を読ませる
    out.push({ center: [x - facing * (tierW / 2 - 0.05), h + 0.02, cz], size: [0.1, 0.04, d * 0.96], rotY: 0, slot: 'laneMark' })
  }

  // 最前列の差し色ライン(危険帯)
  out.push({
    center: [cx - facing * tile * 0.37, 0.36, cz],
    size: [0.12, 0.04, d * 0.96],
    rotY: 0,
    slot: 'accent',
  })

  // 屋根。柱を立てて最上段の上に架ける
  const roofX = cx + facing * tile * 0.14
  for (const z of [cz - d * 0.34, cz + d * 0.34]) {
    out.push({ center: [cx + facing * tile * 0.36, 1.05, z], size: [0.12, 2.1, 0.12], rotY: 0, slot: 'post' })
  }
  out.push({ center: [roofX, 2.18, cz], size: [tile * 0.62, 0.14, d], rotY: 0, slot: 'roof' })

  // ベンチや掲示板。1つ置くだけでスタンドの用途が読める
  if (rand() < 0.6) {
    out.push({
      center: [cx - facing * tile * 0.44, 0.3, cz + range(rand, -d * 0.3, d * 0.3)],
      size: [0.28, 0.6, 0.7],
      rotY: 0,
      slot: 'wood',
    })
  }
  return out
}

/**
 * 建物。1〜3棟。**屋根を必ず一回り小さい別スロットで乗せる**。
 * 俯瞰では屋根の面積が大きいので、壁と同色だと箱がただの平面に見えてしまう。
 *
 * 壁には窓と看板を貼る。**ここが「建物が無地の板」への直接の答え**で、
 * 壁の情報だけはパレット側(`window` の色)が昼か夜かを決めている
 */
function block({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const count = 1 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    // 幅に対して高すぎると建物ではなく「柱」に見える(QAで実測)。
    // 高さ/幅をおおむね3以内に収めることで低ポリの箱が建物として読める
    const w = range(rand, 1.05, 1.9)
    const d = range(rand, 1.05, 1.9)
    const h = range(rand, 1.4, Math.min(w, d) * 2.6)
    const x = cx + range(rand, -tile * 0.28, tile * 0.28)
    const z = cz + range(rand, -tile * 0.28, tile * 0.28)
    const rotY = range(rand, -0.25, 0.25)
    out.push({ center: [x, h / 2, z], size: [w, h, d], rotY, slot: structureSlot(rand) })
    out.push({ center: [x, h + 0.08, z], size: [w * 1.12, 0.16, d * 1.12], rotY, slot: 'roof' })
    // 壁の情報。屋根を乗せた後に貼るのは、屋上看板が屋根の上に立つため
    out.push(...windowsOn(x, z, w, h, d, rotY, rand))
    out.push(...signsOn(x, z, w, h, d, rotY, rand))
    // 屋上の設備。小さい箱が1つ乗るだけで密度が上がって見える
    if (rand() < 0.55) {
      out.push({
        center: [x + range(rand, -w * 0.2, w * 0.2), h + 0.3, z + range(rand, -d * 0.2, d * 0.2)],
        size: [0.3, 0.28, 0.3],
        rotY,
        slot: 'post',
      })
    }
  }
  return out
}

/**
 * 照明塔。**垂直の線を1本立てるための枠**で、競技場の語彙にも合う。
 * 低い箱ばかりだと俯瞰の画が平らになるので、島に1〜2本だけ背の高い物が要る。
 *
 * 最初は給水塔として「細い暗い柱 + 頭の箱」で作っていたが、QAで撮ると
 * **黒い棒付きキャンディの森**になった。原因は2つで、
 * (a) 柱にパレットで最も暗い導出色を使っていたこと、
 * (b) 幅0.42に対して高さ8で、構造物ではなく「線」として読まれたこと。
 * 胴を段付きで太らせ、頭を照明パネルにして「塔」に見えるようにしてある
 */
function floodlight({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const h = range(rand, 4.4, 6.4)
  const body = structureSlot(rand)
  // 台座
  out.push({ center: [cx, 0.26, cz], size: [1.45, 0.52, 1.45], rotY: 0, slot: 'structure2' })
  // 胴は2段に分けて上を細くする。1本の箱だと寸胴で、細い柱だと線になる
  const lower = h * 0.58
  out.push({ center: [cx, 0.52 + lower / 2, cz], size: [1.0, lower, 1.0], rotY: 0, slot: body })
  const upper = h - lower
  out.push({ center: [cx, 0.52 + lower + upper / 2, cz], size: [0.76, upper, 0.76], rotY: 0, slot: body })
  // 頭。照明を載せる架台
  const headY = 0.52 + h
  out.push({ center: [cx, headY + 0.34, cz], size: [1.5, 0.68, 0.7], rotY: 0, slot: structureSlot(rand) })
  out.push({ center: [cx, headY + 0.76, cz], size: [1.2, 0.12, 0.6], rotY: 0, slot: 'roof' })
  // 照明パネル。**夜のパレットではここだけが光る**ので差し色を横に3枚並べる
  for (const dx of [-0.44, 0, 0.44]) {
    out.push({ center: [cx + dx, headY + 0.34, cz + 0.4], size: [0.34, 0.4, 0.12], rotY: 0, slot: 'accent' })
  }
  // 支線。斜めの線は入れられないので短い柱を四隅に置いて足元を締める
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    out.push({ center: [cx + sx * 0.78, 0.4, cz + sz * 0.78], size: [0.12, 0.8, 0.12], rotY: 0, slot: 'post' })
  }
  return out
}

/**
 * 木立。葉は `foliage`(= 芝をわずかに沈めた色)で塗る。
 * 緑を専用色として増やさずに済むので、②の「1つのトーンに沈んでいる」が保たれる。
 * 地面のパッチと**完全に同色にはしない**のは、芝の上に立つ木が地面に溶けるため
 */
function grove({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const count = 3 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    const x = cx + range(rand, -tile * 0.36, tile * 0.36)
    const z = cz + range(rand, -tile * 0.36, tile * 0.36)
    const trunk = range(rand, 0.5, 1.0)
    const crown = range(rand, 0.6, 1.05)
    out.push({ center: [x, trunk / 2, z], size: [0.18, trunk, 0.18], rotY: 0, slot: 'wood' })
    out.push({ center: [x, trunk + crown * 0.4, z], size: [crown, crown * 0.8, crown], rotY: range(rand, 0, 0.8), slot: 'foliage' })
    // 2段目を少し小さく乗せると、立方体1個より木らしくなる
    out.push({
      center: [x, trunk + crown * 0.95, z],
      size: [crown * 0.66, crown * 0.55, crown * 0.66],
      rotY: range(rand, 0, 0.8),
      slot: 'foliage',
    })
  }
  return out
}

/**
 * 用具置き場(マット・跳び箱・ボール箱)。**密度を作るためのモジュール**(共通原則4)。
 * 参考例④(Katamari)の「1つ1つは単純だが物量で画が持つ」をここが担当する
 */
function gear({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const count = 6 + Math.floor(rand() * 6)
  for (let i = 0; i < count; i++) {
    const s = range(rand, 0.4, 0.8)
    const x = cx + range(rand, -tile * 0.38, tile * 0.38)
    const z = cz + range(rand, -tile * 0.38, tile * 0.38)
    // 3割は上に積む。積むと高さ方向にも密度が出る
    const stacked = rand() < 0.3
    const y = stacked ? s * 1.5 : s / 2
    out.push({
      center: [x, y, z],
      size: [s, s, s * range(rand, 0.8, 1.3)],
      rotY: range(rand, -0.5, 0.5),
      slot: structureSlot(rand),
    })
  }
  return out
}

/** 柵。細い垂直材が等間隔に並ぶと、それだけで面が締まる */
function fence({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  // タイルの縁に沿って1辺だけ張る。全周に張ると閉じすぎて俯瞰が読めなくなる
  const alongZ = rand() < 0.5
  const offset = (rand() < 0.5 ? -1 : 1) * tile * 0.4
  const posts = 6
  for (let i = 0; i < posts; i++) {
    const u = -tile / 2 + (tile / posts) * (i + 0.5)
    const x = alongZ ? cx + offset : cx + u
    const z = alongZ ? cz + u : cz + offset
    out.push({ center: [x, 0.42, z], size: [0.1, 0.84, 0.1], rotY: 0, slot: 'post' })
  }
  for (const y of [0.34, 0.68]) {
    const x = alongZ ? cx + offset : cx
    const z = alongZ ? cz : cz + offset
    out.push({
      center: [x, y, z],
      size: alongZ ? [0.06, 0.08, tile] : [tile, 0.08, 0.06],
      rotY: 0,
      slot: 'post',
    })
  }
  return out
}

/**
 * コート。**ほぼ平らな面に白線を引くだけ**のモジュールで、
 * 地面に情報を乗せる(共通原則3)ことだけを担当する。
 *
 * 元は畑の畝だったが、体育館・グラウンド・コートの世界で地面に乗るべき情報は
 * 畝ではなくラインのほう。高い物ばかりだと島の天面が隠れて、
 * 面積のわりに情報が読めなくなるので、こういう「平らなだけ」の枠が必ず要る
 */
function court({ cx, cz, tile, rand }: ModuleContext): Piece[] {
  const out: Piece[] = []
  const half = tile * 0.42
  const alongZ = rand() < 0.5

  // コート面。土のまま
  out.push({ center: [cx, 0.03, cz], size: [half * 2, 0.06, half * 2], rotY: 0, slot: 'soil' })

  // 外周のライン
  for (const side of [-1, 1]) {
    out.push({ center: [cx + side * half, 0.07, cz], size: [0.1, 0.04, half * 2], rotY: 0, slot: 'laneMark' })
    out.push({ center: [cx, 0.07, cz + side * half], size: [half * 2, 0.04, 0.1], rotY: 0, slot: 'laneMark' })
  }

  // センターライン + サークル代わりの短い十字。競技の種類は決めずに「線が引いてある」だけを出す
  if (alongZ) out.push({ center: [cx, 0.07, cz], size: [0.1, 0.04, half * 2], rotY: 0, slot: 'laneMark' })
  else out.push({ center: [cx, 0.07, cz], size: [half * 2, 0.04, 0.1], rotY: 0, slot: 'laneMark' })
  out.push({ center: [cx, 0.07, cz], size: [half * 0.7, 0.04, 0.1], rotY: 0, slot: 'laneMark' })
  out.push({ center: [cx, 0.07, cz], size: [0.1, 0.04, half * 0.7], rotY: 0, slot: 'laneMark' })

  // ゴールやポール。1本立つだけでコートとして読める
  if (rand() < 0.55) {
    const side = rand() < 0.5 ? -1 : 1
    out.push({ center: [cx, 0.7, cz + side * half * 0.9], size: [0.1, 1.4, 0.1], rotY: 0, slot: 'post' })
    out.push({ center: [cx, 1.35, cz + side * half * 0.9], size: [0.85, 0.1, 0.1], rotY: 0, slot: 'post' })
  }
  return out
}

/** 何も置かないタイル。**空きが無いと密度が「詰まり」になる**ので、抽選に必ず混ぜる */
function empty(): Piece[] {
  return []
}

/**
 * カタログ本体。**全カードがこの1つを共有する**。
 * カードが違うのは抽選の重みとシードだけで、作られる形の種類はどのカードでも同じ
 */
export const MODULES: Record<ModuleKind, (ctx: ModuleContext) => Piece[]> = {
  lane,
  stand,
  block,
  floodlight,
  grove,
  gear,
  fence,
  court,
  empty,
}

/** 重み付き抽選。重みは `SCATTER_KINDS` の上で定義される */
export type ModuleWeight = { kind: ModuleKind; weight: number }

export function pickModule(weights: readonly ModuleWeight[], r: number): ModuleKind {
  const total = weights.reduce((s, w) => s + w.weight, 0)
  if (total <= 0) return 'empty'
  let acc = Math.min(Math.max(r, 0), 0.999999) * total
  for (const w of weights) {
    acc -= w.weight
    if (acc <= 0) return w.kind
  }
  return weights[weights.length - 1].kind
}

/**
 * 主役(人物)。**カードごとに1人ずつ置く**。
 *
 * 4枚のカードそれぞれに「そのときの自分」が立っているという読み方になり、
 * 「章が独立した小さな世界」が主役の側でも成立する。
 * 箱だけで作るのは他の物と同じ InstancedMesh に流し込むため
 */
export function heroFigure(
  x: number,
  z: number,
  rotY: number,
  height: number
): Piece[] {
  // 合計が身長ちょうどになるよう割り振る(足していって height を超えると
  // 「主役は画面の1/4以下」の計算と実物がズレる)
  const legH = height * 0.44
  const bodyH = height * 0.36
  const headH = height * 0.2
  const w = height * 0.22
  const sin = Math.sin(rotY)
  const cos = Math.cos(rotY)
  // 左右の足はローカルX方向に開くので、向きに合わせて回してから足す
  const offset = (dx: number): [number, number] => [x + cos * dx, z - sin * dx]

  const out: Piece[] = []
  for (const side of [-1, 1]) {
    const [lx, lz] = offset(side * w * 0.28)
    out.push({ center: [lx, legH / 2, lz], size: [w * 0.32, legH, w * 0.32], rotY, slot: 'heroLimb' })
  }
  out.push({ center: [x, legH + bodyH / 2, z], size: [w, bodyH, w * 0.62], rotY, slot: 'heroBody' })
  // 腕。胴より少し外に出すだけで人型に見える
  for (const side of [-1, 1]) {
    const [ax, az] = offset(side * w * 0.66)
    out.push({ center: [ax, legH + bodyH * 0.62, az], size: [w * 0.24, bodyH * 0.8, w * 0.24], rotY, slot: 'heroBody' })
  }
  out.push({ center: [x, legH + bodyH + headH / 2, z], size: [w * 0.62, headH, w * 0.62], rotY, slot: 'heroSkin' })
  return out
}
