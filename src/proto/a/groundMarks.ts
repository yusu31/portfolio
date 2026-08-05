// 地面のマーキング(純データ)。共通原則3「地面に情報を乗せる」の実体。
//
// 参考例は4例とも**地面が主役級の面積を持ち、そこに情報が乗っている**
// (①道路の白線とマンホール ②線路と地形 ③タイルの目地 ④木目とテーブルの縁)。
// 現行シーンは地面が単色で無地なので、面積は取っているのに画に効いていない。
//
// ここでは描画そのものは持たず、**線と帯の配置だけを正規化座標(0〜1)のデータで持つ**。
// 理由は2つ:
//   - テストで「情報量」を件数として縛れる(密度を目視でなく数値で担保する)
//   - 色はパレットから後で注ぐので、章の色を変えても地面のデザインは作り直さなくていい
// 実際に CanvasTexture へ描くのは groundTexture.ts。
import { mulberry32 } from './scatter'

/**
 * `tone` を持つマークは**パレットの地面ベース色を明暗させて**描く(shadeHex の amount)。
 * 持たないマークは groundMark 色(白線)で描く。
 * 木目・芝のストライプ・ひび割れに固有色を与えないのは、地面に情報を足しても
 * 1画面の色数が増えないようにするため
 */
export type GroundMark =
  /** 塗りつぶしの帯。芝のストライプ・板の継ぎ目・マット・紙 */
  | { kind: 'band'; x: number; y: number; w: number; h: number; tone?: number }
  /** 直線。lw は正規化幅(テクスチャの一辺に対する比) */
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; lw: number; tone?: number }
  /** 枠線 */
  | { kind: 'rect'; x: number; y: number; w: number; h: number; lw: number; tone?: number }
  /** 円(枠線) */
  | { kind: 'circle'; cx: number; cy: number; r: number; lw: number; tone?: number }
  /** 円弧。3Pラインなど */
  | { kind: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; lw: number; tone?: number }
  /** 塗りつぶしの円。センタースポット・マンホール */
  | { kind: 'dot'; cx: number; cy: number; r: number; tone?: number }

/** 白線の標準太さ(正規化)。22ユニットの地面に対して約5cm相当 */
const LINE = 0.004

/**
 * 乱数から作る線(木目・芝の粒・ひび割れ)がテクスチャの外へ出ないようにする。
 * はみ出すと `drawGroundMarks` は黙って描き落とすので、
 * 「密度を上げたのに件数ほど濃くならない」という気づきにくい失敗になる
 */
const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1)

/** 体育館: メープルの床(板目 + 木目) に バレーとバスケのラインが二重に引かれている */
function gymMarks(): GroundMark[] {
  const marks: GroundMark[] = []
  const rand = mulberry32(9101)

  // 床板の継ぎ目。縦に26枚。帯の明暗を交互に振ると「板が並んでいる」と読める
  const planks = 26
  for (let i = 0; i < planks; i++) {
    const x = i / planks
    marks.push({ kind: 'band', x, y: 0, w: 1 / planks, h: 1, tone: i % 2 === 0 ? 0.04 : -0.04 })
    marks.push({ kind: 'line', x1: x, y1: 0, x2: x, y2: 1, lw: 0.0015, tone: -0.22 })
  }
  // 木目。板の中に短い線を散らす。これが入るかどうかで「木」に見えるかが決まる
  for (let i = 0; i < 110; i++) {
    const len = 0.04 + rand() * 0.16
    const x = rand()
    // 線の長さを引いた範囲から始点を取れば、終点が必ずテクスチャ内に収まる
    const y = rand() * (1 - len)
    marks.push({
      kind: 'line',
      x1: x,
      y1: y,
      x2: clamp01(x + (rand() - 0.5) * 0.01),
      y2: y + len,
      lw: 0.0012,
      tone: -0.13,
    })
  }

  // バレーコート(白)。外枠 + センターライン + アタックライン
  marks.push({ kind: 'rect', x: 0.14, y: 0.1, w: 0.72, h: 0.8, lw: LINE })
  marks.push({ kind: 'line', x1: 0.14, y1: 0.5, x2: 0.86, y2: 0.5, lw: LINE })
  marks.push({ kind: 'line', x1: 0.14, y1: 0.34, x2: 0.86, y2: 0.34, lw: LINE })
  marks.push({ kind: 'line', x1: 0.14, y1: 0.66, x2: 0.86, y2: 0.66, lw: LINE })

  // バスケのライン(体育館は複数競技の線が重なっているのが実物のリアリティ)。
  // 白線と色を変えられるよう tone を持たせて少し沈ませる
  marks.push({ kind: 'circle', cx: 0.5, cy: 0.5, r: 0.1, lw: LINE, tone: -0.3 })
  marks.push({ kind: 'arc', cx: 0.5, cy: 0.14, r: 0.3, a0: 0.15, a1: Math.PI - 0.15, lw: LINE, tone: -0.3 })
  marks.push({ kind: 'arc', cx: 0.5, cy: 0.86, r: 0.3, a0: Math.PI + 0.15, a1: Math.PI * 2 - 0.15, lw: LINE, tone: -0.3 })
  marks.push({ kind: 'rect', x: 0.38, y: 0.1, w: 0.24, h: 0.16, lw: LINE, tone: -0.3 })
  marks.push({ kind: 'rect', x: 0.38, y: 0.74, w: 0.24, h: 0.16, lw: LINE, tone: -0.3 })

  return marks
}

/** 校庭: 芝の刈り跡ストライプ + サッカーのライン。夕日の斜光と合わせて帯が効く */
function fieldMarks(): GroundMark[] {
  const marks: GroundMark[] = []
  const rand = mulberry32(2277)

  // 芝の刈り跡。ローラーの向きで明暗が変わるやつ。**この帯だけで地面が持つ**
  const stripes = 16
  for (let i = 0; i < stripes; i++) {
    marks.push({ kind: 'band', x: 0, y: i / stripes, w: 1, h: 1 / stripes, tone: i % 2 === 0 ? 0.07 : -0.07 })
  }
  // 芝の粒。短い縦線を散らして単調な帯を壊す
  for (let i = 0; i < 130; i++) {
    const x = rand()
    const y = 0.02 + rand() * 0.97
    marks.push({
      kind: 'line',
      x1: x,
      y1: y,
      x2: clamp01(x + (rand() - 0.5) * 0.006),
      y2: clamp01(y - 0.012),
      lw: 0.001,
      tone: rand() > 0.5 ? 0.14 : -0.16,
    })
  }

  // サッカーコート
  marks.push({ kind: 'rect', x: 0.08, y: 0.06, w: 0.84, h: 0.88, lw: LINE })
  marks.push({ kind: 'line', x1: 0.08, y1: 0.5, x2: 0.92, y2: 0.5, lw: LINE })
  marks.push({ kind: 'circle', cx: 0.5, cy: 0.5, r: 0.13, lw: LINE })
  marks.push({ kind: 'dot', cx: 0.5, cy: 0.5, r: 0.008 })
  // ペナルティエリアとゴールエリア(上下)
  marks.push({ kind: 'rect', x: 0.28, y: 0.06, w: 0.44, h: 0.14, lw: LINE })
  marks.push({ kind: 'rect', x: 0.38, y: 0.06, w: 0.24, h: 0.06, lw: LINE })
  marks.push({ kind: 'rect', x: 0.28, y: 0.8, w: 0.44, h: 0.14, lw: LINE })
  marks.push({ kind: 'rect', x: 0.38, y: 0.88, w: 0.24, h: 0.06, lw: LINE })
  // コーナーアーク
  marks.push({ kind: 'arc', cx: 0.08, cy: 0.06, r: 0.03, a0: 0, a1: Math.PI / 2, lw: LINE })
  marks.push({ kind: 'arc', cx: 0.92, cy: 0.06, r: 0.03, a0: Math.PI / 2, a1: Math.PI, lw: LINE })
  marks.push({ kind: 'arc', cx: 0.08, cy: 0.94, r: 0.03, a0: -Math.PI / 2, a1: 0, lw: LINE })
  marks.push({ kind: 'arc', cx: 0.92, cy: 0.94, r: 0.03, a0: Math.PI, a1: Math.PI * 1.5, lw: LINE })

  return marks
}

/** 街のコート: アスファルトのタイル目地 + ひび割れ + ハーフコートのバスケライン */
function courtMarks(): GroundMark[] {
  const marks: GroundMark[] = []
  const rand = mulberry32(5533)

  // タイルの目地。参考例③のパステル床タイルに相当する「格子の情報」
  const cells = 12
  for (let i = 1; i < cells; i++) {
    const p = i / cells
    marks.push({ kind: 'line', x1: p, y1: 0, x2: p, y2: 1, lw: 0.0022, tone: -0.14 })
    marks.push({ kind: 'line', x1: 0, y1: p, x2: 1, y2: p, lw: 0.0022, tone: -0.14 })
  }
  // タイルごとの色ムラ。1枚ずつ微妙に明るさが違うと「敷いてある」と読める
  for (let ix = 0; ix < cells; ix++) {
    for (let iy = 0; iy < cells; iy++) {
      const t = (rand() - 0.5) * 0.09
      marks.push({ kind: 'band', x: ix / cells, y: iy / cells, w: 1 / cells, h: 1 / cells, tone: t })
    }
  }
  // ひび割れ。折れ線で数本。単調な格子に自然物のノイズを入れる
  for (let i = 0; i < 16; i++) {
    let x = rand()
    let y = rand()
    for (let seg = 0; seg < 4; seg++) {
      const nx = clamp01(x + (rand() - 0.5) * 0.12)
      const ny = clamp01(y + (rand() - 0.5) * 0.12)
      marks.push({ kind: 'line', x1: x, y1: y, x2: nx, y2: ny, lw: 0.0016, tone: -0.3 })
      x = nx
      y = ny
    }
  }
  // マンホール2つ(①の路地から借りたディテール)
  marks.push({ kind: 'dot', cx: 0.18, cy: 0.72, r: 0.025, tone: -0.28 })
  marks.push({ kind: 'circle', cx: 0.18, cy: 0.72, r: 0.025, lw: 0.003, tone: -0.42 })
  marks.push({ kind: 'dot', cx: 0.83, cy: 0.29, r: 0.022, tone: -0.28 })

  // ハーフコートのバスケライン(白)
  marks.push({ kind: 'rect', x: 0.16, y: 0.1, w: 0.68, h: 0.8, lw: LINE })
  marks.push({ kind: 'rect', x: 0.4, y: 0.1, w: 0.2, h: 0.26, lw: LINE })
  marks.push({ kind: 'circle', cx: 0.5, cy: 0.36, r: 0.1, lw: LINE })
  marks.push({ kind: 'arc', cx: 0.5, cy: 0.16, r: 0.32, a0: 0.2, a1: Math.PI - 0.2, lw: LINE })

  return marks
}

/** デスク: 木のテーブル(木目) + 方眼のデスクマット + ケーブル */
function deskMarks(): GroundMark[] {
  const marks: GroundMark[] = []
  const rand = mulberry32(7744)

  // 木目。参考例④の「木のテーブル」。横方向に長い線を大量に流す
  for (let i = 0; i < 120; i++) {
    const len = 0.15 + rand() * 0.45
    const x = rand() * (1 - len)
    const y = 0.01 + rand() * 0.98
    marks.push({
      kind: 'line',
      x1: x,
      y1: y,
      x2: x + len,
      y2: clamp01(y + (rand() - 0.5) * 0.012),
      lw: 0.0014,
      tone: -0.16,
    })
  }
  // 板の継ぎ目(横に4枚)
  for (let i = 1; i < 4; i++) {
    marks.push({ kind: 'line', x1: 0, y1: i / 4, x2: 1, y2: i / 4, lw: 0.0035, tone: -0.34 })
  }

  // デスクマット(方眼)。テーブルの上の別素材が入ると情報の層が増える。
  // **マットを暗く・方眼を明るく**する。逆(暗い線)にすると、夜のパレットでは
  // 地の色がもともと暗いのでマット全体が黒く潰れて情報が消える(実測で確認)
  marks.push({ kind: 'band', x: 0.2, y: 0.24, w: 0.6, h: 0.52, tone: -0.3 })
  const gridN = 14
  for (let i = 0; i <= gridN; i++) {
    const p = i / gridN
    marks.push({ kind: 'line', x1: 0.2 + p * 0.6, y1: 0.24, x2: 0.2 + p * 0.6, y2: 0.76, lw: 0.0014, tone: 0.18 })
    marks.push({ kind: 'line', x1: 0.2, y1: 0.24 + p * 0.52, x2: 0.8, y2: 0.24 + p * 0.52, lw: 0.0014, tone: 0.18 })
  }
  marks.push({ kind: 'rect', x: 0.2, y: 0.24, w: 0.6, h: 0.52, lw: 0.004, tone: 0.34 })

  // ケーブル。折れ線でマットの外へ這わせる
  let cx = 0.5
  let cy = 0.76
  for (let seg = 0; seg < 7; seg++) {
    const nx = clamp01(cx + (rand() - 0.35) * 0.1)
    const ny = clamp01(cy + 0.03 + rand() * 0.02)
    marks.push({ kind: 'line', x1: cx, y1: cy, x2: nx, y2: ny, lw: 0.005, tone: -0.5 })
    cx = nx
    cy = ny
  }

  // 紙。この章で唯一 tone を持たない = groundMark 色(紙のクリーム)で塗られるマーク。
  // 暗い夜のパレットの中で明るい面が数枚あると、机の上の情報が読めるようになる
  const papers: Array<[number, number, number, number]> = [
    [0.63, 0.3, 0.19, 0.26],
    [0.66, 0.33, 0.18, 0.25],
    [0.1, 0.56, 0.14, 0.19],
  ]
  for (const [px, py, pw, ph] of papers) {
    marks.push({ kind: 'band', x: px, y: py, w: pw, h: ph })
    // 紙の罫線。鉛筆の線に見えるよう地の明暗で引く
    for (let i = 1; i < 8; i++) {
      const ly = py + (ph * i) / 8
      marks.push({ kind: 'line', x1: px + 0.015, y1: ly, x2: px + pw - 0.015, y2: ly, lw: 0.0011, tone: -0.55 })
    }
  }

  return marks
}

const BUILDERS: Record<string, () => GroundMark[]> = {
  gym: gymMarks,
  field: fieldMarks,
  court: courtMarks,
  desk: deskMarks,
}

/** 章IDから地面マーキングを組み立てる。同じIDなら常に同じ結果(乱数はシード固定) */
export function buildGroundMarks(chapterId: string): GroundMark[] {
  const builder = BUILDERS[chapterId]
  if (!builder) throw new Error(`unknown chapter for ground marks: ${chapterId}`)
  return builder()
}
