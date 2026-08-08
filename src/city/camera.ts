// `/city` のカメラ。設計書 §3。
//
// 手順は ② の `journey/camera.ts` と同じ:
//   `getCityBallFrame(t)` → `getCameraOffset(t)` でオフセット4値 →
//   camPos = anchor − heading·dBack + (0, dUp, 0) /
//   lookTarget = anchor + heading·lookAhead + (0, lookUp, 0) → `camera.lookAt()`
//
// ② から変えたのは2つ。
//
// **1. blendT をテーブルにした(§3.4)**
//   ② は `arcBlendT` / `freeThrowBlendT` / `diveBlendT` の3つをハードコードで連鎖 lerp
//   していたので、章が増えるたびに関数が増えていた。台形の形(from / to / ease / peakAt)を
//   データにして、区間が重ならないことをテストで縛る。
//
// **2. ビートの位置を u ではなく t(道に沿った距離)で持つ**
//   設計書 §3.4 は `from: number // u` と書いていたが、**見せ場は世界の中の場所であって
//   スクロールの中の場所ではない**。PR 10 でワープ(offset → t の非線形写像)が入ると
//   u 基準のテーブルは敷地からズレる。t 基準にしておけばワープの影響を受けない。

import * as THREE from 'three'
import { BALL_RADIUS, getCityBallFrame } from './ball'
import { CAMERA_FOV, CHAPTERS, TOTAL_LENGTH, chapterStart, elevationAt, phaseRange, roadPoint } from './route'

/** カメラの組み立てパラメータ。すべて `anchor`(= **球の中心**)からの相対 */
export interface CameraOffset {
  /** anchor から真後ろ(−heading 方向)へ引く距離 */
  dBack: number
  /** anchor から持ち上げる高さ */
  dUp: number
  /** 視線ターゲットを anchor から前方へ出す距離。**これが「一点透視の強さ」の正体** */
  lookAhead: number
  /** 視線ターゲットを anchor から持ち上げる高さ */
  lookUp: number
}

/**
 * 街区・導入・退出のオフセット。**B の値を球中心基準へ換算したもの**。
 *
 * ⚠ ここが設計書 §3.2 の訂正箇所。§3.2 の検算は2つの行で**別々の基準点**を使っていた:
 *   - 街区(B値 44% / screenY −0.287) … **路面基準**(球中心は路面 +1.5)
 *   - 見せ場(②値 57% / screenY −0.726) … **球中心基準**
 *
 * §5.5 が守ると宣言している「カメラは `getBallFrame` の契約だけを消費する」に従うと
 * anchor は球中心になる。そこへ B の生値(dUp 2.6 / lookUp 2.2)をそのまま入れると
 * **screenY −0.725 / 上端 −0.285 = 球が画面の下半分に沈み、全身がフレームに入らない**。
 * それは街区ではなく見せ場の構図なので、街を見せるという街区の役目が消える。
 *
 * `BALL_RADIUS` を引いて球中心基準へ移すと、設計書が意図した5値が完全に再現される:
 *   depth 6.520 / screenY −0.287 / 見かけ 44.2% / 上端 +0.155 / 下端 −0.729
 */
export const STREET_OFFSET: CameraOffset = {
  // ⚠ B の 6.5 ではない。**主役を人(身長1.8)から球(直径3.0)に入れ替えたから**で、
  // 同じ 6.5 では球が画面高の 44.2% を占めて B の 26.5% の1.67倍に写る。
  // 設計書 §3.2 は「球は人より大きく写るがそれで正しい」としていたが、
  // 実機で撮り比べてユーザーが **B と同じ 26.5% に揃える**判断をした(2026-08-08)。
  //
  // 決め手は見せ場との落差だった。見せ場は ② 値の 57% 固定なので、
  // 街区 44% だと 44→57 の変化にしかならず**カメラの寄り引きがほぼ読めない**。
  // 26.5% にすると 26.5→57 で2倍以上に寄るので、「街を見せる → ボールに寄る」が絵として立つ
  dBack: 10.85,
  /**
   * B の路面基準 2.6 を球中心基準へ移すと 1.1 になるが、**それでは足りない**。
   *
   * B はカメラ位置を「主役の**後ろ**の路面」基準で置くことで下り坂のめり込みを避けていたが、
   * /city はカメラが `getBallFrame` の契約だけを消費する(設計原則3)ので高さは球中心からの
   * 相対になり、**下り勾配 × dBack のぶんだけ路面との余裕が減る**。dBack を 10.85 へ
   * 広げたことでこれが効いて、実測で最小クリアランスが 0.62(@t=124)まで落ちた。
   *
   * **カメラが球の半径(1.5)より路面に近づかない**ことを条件に引き直した値:
   *   1.1 + (1.5 − 0.6246) = 1.975 → 2.0
   * 見かけの大きさは 26.5% → 26.3% とほぼ動かず(B 準拠のまま)、
   * screenY は −0.164 → −0.251 と B の「画面中央やや下」寄りになる
   */
  dUp: 2.0,
  lookAhead: 14,
  // B の路面基準 2.2 − BALL_RADIUS
  lookUp: 2.2 - BALL_RADIUS,
}

/**
 * 敷地(見せ場)のオフセット。**② の値をそのまま**(② の anchor は元から球中心なので換算不要)。
 * 球に寄り、下側の3割をあえてクロップして「ボールを追う」構図にする(見かけ 57%)
 */
export const VENUE_OFFSET: CameraOffset = {
  dBack: 4.5,
  dUp: 3.0,
  lookAhead: 2,
  lookUp: 1.5,
}

/**
 * カメラの見せ場。台形(または三角形)のブレンド区間を**データとして**持つ。
 *
 * - `from` / `to` … 道に沿った距離 `t`。**区間は互いに重なってはいけない**(テストで縛る)
 * - `rampIn` / `rampOut` … 立ち上がり・立ち下がりの長さ(**ユニット**)。
 *   `rampOut = 0` は「区間の終わりまで保持する」の意味になる
 *
 * ⚠ 設計書 §3.4 は `ease`(区間長に対する**割合**)としていたが、ユニットに変えた。
 *   割合は ② の `arcBlendT`(前後12%)/`diveBlendT`(三角形)を再現するための表現で、
 *   /city の寄り引きは**フェーズ長(導入 10 / 退出 9)にぴったり合わせたい**からである。
 *   割合のままだと章ごとにフェーズ構成が違うときズレる。実際、第4章は `exit` を
 *   持たないため、割合で書くと**終着プラザの最後の 9.4 ユニットで街区の構図へ戻って
 *   しまっていた**(実測で発見)。ユニットなら `rampOut = 0` と書くだけで済む。
 *   ② の2つの形もそのまま表現できる(三角形 = rampIn + rampOut が区間長と一致)
 */
export type CameraBeat = {
  from: number
  to: number
  rampIn: number
  rampOut: number
  offset: Partial<CameraOffset>
}

/**
 * 見せ場のブレンド区間。各章の**開口フェーズ全体**(導入 → 敷地 → 退出)を1つの台形で覆う。
 *
 * ランプを導入フェーズ・退出フェーズの長さそのものに取るので、
 * **ブレンドが 1.0 で張り付く区間が敷地フェーズと正確に一致する**(見せ場の間は構図が動かない)。
 * 街区では厳密に 0 なので、街を見せている間はカメラが B 値のまま動かない
 */
export const CAMERA_BEATS: readonly CameraBeat[] = CHAPTERS.map((chapter, i) => {
  const open = phaseRange(i, 'open')
  const exit = phaseRange(i, 'exit')
  const from = open ? open.start : chapterStart(i)
  const to = chapterStart(i) + chapter.phases.reduce((s, p) => s + p.length, 0)
  return {
    from,
    to,
    rampIn: open ? open.end - open.start : 0,
    // 退出フェーズが無い章(= 終着プラザ)は引かずに終わる
    rampOut: exit ? exit.end - exit.start : 0,
    offset: VENUE_OFFSET,
  }
})

/** 両端で値・傾きゼロの smootherstep(6t⁵-15t⁴+10t³)。② と同じ手法 */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * ビートのブレンド係数(0 = 街区値、1 = ビート値)。区間外は厳密に 0。
 *
 * 立ち上がりと立ち下がりの **min** を取るのが実装の要点で、これ1つで台形も三角形も出る
 * (`rampIn + rampOut` が区間長に等しいとき、2つのランプがちょうど中央で交わって三角形になる)。
 * `rampOut = 0` のときだけ `t === to` でも 1 を返し、章末まで寄ったまま終われる
 */
export function beatBlendT(beat: CameraBeat, t: number): number {
  if (t <= beat.from || t > beat.to) return 0
  const rise = beat.rampIn > 0 ? smootherstep((t - beat.from) / beat.rampIn) : 1
  const fall = beat.rampOut > 0 ? smootherstep((beat.to - t) / beat.rampOut) : 1
  return Math.min(rise, fall)
}

/**
 * 距離 `t` におけるカメラのオフセット4値を返す純関数。
 *
 * ビート区間は互いに重ならない(テストで縛っている)ので、街区値から順に lerp を
 * 重ねるだけで安全に合成できる(② の `getCameraOffset` と同じ論法)
 */
export function getCameraOffset(t: number): CameraOffset {
  const out: CameraOffset = { ...STREET_OFFSET }
  for (const beat of CAMERA_BEATS) {
    const b = beatBlendT(beat, t)
    if (b <= 0) continue
    if (beat.offset.dBack !== undefined) out.dBack = THREE.MathUtils.lerp(out.dBack, beat.offset.dBack, b)
    if (beat.offset.dUp !== undefined) out.dUp = THREE.MathUtils.lerp(out.dUp, beat.offset.dUp, b)
    if (beat.offset.lookAhead !== undefined)
      out.lookAhead = THREE.MathUtils.lerp(out.lookAhead, beat.offset.lookAhead, b)
    if (beat.offset.lookUp !== undefined) out.lookUp = THREE.MathUtils.lerp(out.lookUp, beat.offset.lookUp, b)
  }
  return out
}

// useFrame 毎の呼び出しでアロケーションしないよう、モジュールスコープで使い回す
const frame = { anchor: new THREE.Vector3(), heading: new THREE.Vector3() }
const camPos = new THREE.Vector3()
const lookTarget = new THREE.Vector3()

/** カメラの位置と視線ターゲット。描画とテストがこの1つの実装だけを共有する */
export function cameraPoseAt(t: number): { position: THREE.Vector3; target: THREE.Vector3 } {
  getCityBallFrame(t, frame)
  const { dBack, dUp, lookAhead, lookUp } = getCameraOffset(t)
  const position = frame.anchor.clone().addScaledVector(frame.heading, -dBack)
  position.y += dUp
  const target = frame.anchor.clone().addScaledVector(frame.heading, lookAhead)
  target.y += lookUp
  return { position, target }
}

/** 距離 `t` のカメラ姿勢を `camera` へ直接適用する。毎フレーム用にアロケーションしない */
export function poseCityCamera(camera: THREE.Camera, t: number): void {
  getCityBallFrame(t, frame)
  const { dBack, dUp, lookAhead, lookUp } = getCameraOffset(t)

  camPos.copy(frame.anchor).addScaledVector(frame.heading, -dBack)
  camPos.y += dUp
  lookTarget.copy(frame.anchor).addScaledVector(frame.heading, lookAhead)
  lookTarget.y += lookUp

  camera.position.copy(camPos)
  camera.lookAt(lookTarget)
}

// --- 構図の計測 -----------------------------------------------------------
// 「強い一点透視」「主役の大きさ」を目分量ではなく数値で固定するための関数。
// A / B / ② で確立したやり方をそのまま継承する(§11)

const halfVFovRad = ((CAMERA_FOV / 2) * Math.PI) / 180
const tanHalfV = Math.tan(halfVFovRad)

/** カメラの正規直交基底(前・右・上)。画面上の位置を測る計算で使う */
function cameraBasis(t: number): {
  position: THREE.Vector3
  forward: THREE.Vector3
  right: THREE.Vector3
  up: THREE.Vector3
} {
  const { position, target } = cameraPoseAt(t)
  const forward = target.clone().sub(position).normalize()
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
  const up = right.clone().cross(forward)
  return { position, forward, right, up }
}

/**
 * 球が画面の縦どこに写るか。-1 = 下端、0 = 中央、+1 = 上端。
 * 街区は「画面中央やや下」なので、わずかに負の値になるのが正解(目標 −0.287)
 */
export function ballScreenY(t: number): number {
  const { position, forward, up } = cameraBasis(t)
  const v = getCityBallFrame(t).anchor.clone().sub(position)
  const depth = v.dot(forward)
  return v.dot(up) / depth / tanHalfV
}

/**
 * 球が画面高に占める割合。
 * 透視投影では**カメラ軸方向の奥行き**で割るのが正しいので、直線距離ではなく内積を使う。
 * 目標は街区 44% / 見せ場 57%(§3.2)
 */
export function apparentBallFraction(t: number): number {
  const { position, forward } = cameraBasis(t)
  const v = getCityBallFrame(t).anchor.clone().sub(position)
  const depth = v.dot(forward)
  return BALL_RADIUS / (depth * tanHalfV)
}

/**
 * **一点透視の強さの指標**。遠方の道がカメラの前方軸から何度ずれているか。
 * 0度なら消失点が画面のど真ん中にある = 完全な一点透視。
 * 横カーブを強くするとここが増えて、消失点が画面の外へ流れていく
 */
export function vanishingOffsetDeg(t: number, ahead: number = 70): number {
  const { position, forward } = cameraBasis(t)
  const far = roadPoint(t + ahead, 0)
  const dir = new THREE.Vector3(far[0], far[1], far[2]).sub(position).normalize()
  return (Math.acos(THREE.MathUtils.clamp(dir.dot(forward), -1, 1)) * 180) / Math.PI
}

/** 垂直画角の半分(度)。「画面の上端」を角度で表したもの */
export function halfVerticalFovDeg(): number {
  return CAMERA_FOV / 2
}

/**
 * **囲む構図の指標**(§11)。**路面から** `height` の高さの壁が横 `lateral` に立っているとき、
 * その壁の上端がカメラから見て何度の仰角にあるか(球 = カメラは道の中心を走るので
 * 壁までの水平距離は `lateral` そのものになる。`BALL_LATERAL = 0`)。
 *
 * これが `halfVerticalFovDeg()`(27.5°)を超えていれば、壁は画面の上端より上まで伸びている
 * = 「画面を左右から挟む」状態になる。参考例①の構図の成立条件そのもの。
 *
 * ⚠ **B の同名関数をそのまま持ってくることはできなかった。** B は
 *   `atan2(height − CAMERA_HEIGHT, lateral)` で、カメラ高が路面基準の定数 2.6 だった。
 *   /city のカメラは `getBallFrame` の契約に乗る(設計原則3)ので高さが球中心からの相対になり、
 *   **下り勾配 × dBack のぶんだけ路面との余裕が変わる**(実測 1.52〜3.5)。
 *   定数で代用すると壁の高さを 1 ユニット以上見誤るので、`cameraRoadClearance(t)` で
 *   その地点の実際の高さを引いて測る。街区では `t` によらず成立してほしいので、
 *   テストは全長にわたって最小値を見る
 */
export function enclosureElevationDeg(height: number, lateral: number, t: number): number {
  const camAboveRoad = cameraRoadClearance(t)
  return (Math.atan2(height - camAboveRoad, Math.abs(lateral)) * 180) / Math.PI
}

/**
 * カメラの真下の路面からの高さ。**下り坂で路面にめり込まないこと**を測る。
 *
 * B はこれを避けるためにカメラ位置を「主役の後ろの路面」基準で置いていた
 * (`roadPoint(t - CAMERA_BACK)` + 高さ)。/city は `getBallFrame` の契約に乗るので
 * カメラ高は球中心からの相対になり、**下り勾配のぶんだけ路面との余裕が減る**。
 * 経路長が伸びて `OVERALL_DROP` も 34 に増えたので、ここはテストで縛る
 */
export function cameraRoadClearance(t: number): number {
  const { position } = cameraPoseAt(t)
  const { dBack } = getCameraOffset(t)
  // カメラは球のおよそ dBack だけ後ろにいる。その位置の路面高と比べる
  return position.y - elevationAt(t - dBack)
}

/** 全長にわたる代表点。テストと QA が同じ刻みを見るために共有する */
export function sampleDistances(step: number = 1): number[] {
  const out: number[] = []
  for (let t = 0; t <= TOTAL_LENGTH; t += step) out.push(t)
  return out
}
