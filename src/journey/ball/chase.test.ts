// BallFrame(チェイスカム化 PR-1)の回帰テスト。ブラウザ不要の一次防衛線:
// ①純粋関数性(決定性・クランプ・out引数) ②headingの単位長・水平性
// ③隣接Δ角上限(ジッターの定量化) ④静止区間ホールド ⑤anchorの端点・バウンド除去契約
// 数値境界は全てscratchpad実測(2026-07-19)に余裕を掛けた値。軌道がPR-4/5で物理精度化
// されたら再実測して更新する(シグネチャは不変のままテストだけ追従する設計)
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getBallFrame, HEADING_KERNEL_U, type BallFrame } from './chase'
import { HOME_HOLD_END, DRIBBLE_START, DRIBBLE_END, REST_END } from './beats'
import { HOME_REST, CONTACT_REST } from './anchors'

const newFrame = (): BallFrame => ({ anchor: new THREE.Vector3(), heading: new THREE.Vector3() })

describe('純粋関数性', () => {
  it('同じuを2回呼ぶと同一の値が返る(決定性)', () => {
    // roll.test.tsと同じ流儀: 決定性はコンポーネントの完全一致で検証する
    for (const u of [0, 0.1234567, 0.4575, 0.727, REST_END, 1]) {
      const a = getBallFrame(u, newFrame())
      const b = getBallFrame(u, newFrame())
      expect(a.anchor.equals(b.anchor)).toBe(true)
      expect(a.heading.equals(b.heading)).toBe(true)
    }
  })

  it('u<0とu>1はクランプされ端の値と一致する', () => {
    expect(getBallFrame(-0.5).anchor.equals(getBallFrame(0).anchor)).toBe(true)
    expect(getBallFrame(-0.5).heading.equals(getBallFrame(0).heading)).toBe(true)
    expect(getBallFrame(1.5).anchor.equals(getBallFrame(1).anchor)).toBe(true)
    expect(getBallFrame(1.5).heading.equals(getBallFrame(1).heading)).toBe(true)
  })

  it('out引数を渡すと同一オブジェクトが返りアロケーションを回避できる', () => {
    const out = newFrame()
    const returned = getBallFrame(0.5, out)
    expect(returned).toBe(out)
    expect(out.anchor.equals(getBallFrame(0.5).anchor)).toBe(true)
  })
})

describe('headingの単位長と水平性', () => {
  it('全域1000サンプルで単位長かつy=0', () => {
    for (let i = 0; i <= 1000; i++) {
      const { heading } = getBallFrame(i / 1000)
      expect(Math.abs(heading.length() - 1)).toBeLessThan(1e-9)
      expect(heading.y).toBe(0) // XZのみから構築するのでyは丸め誤差すら乗らない
    }
  })
})

describe('隣接Δ角上限(ジッターの定量化)', () => {
  it('dribble区間(バウンド+ウィーブ)でもヨーが振動しない', () => {
    // 生の隣接差分では最大64.0°/サンプルだったものが、±0.006uカーネルで5.35°に収束(実測)。
    // 残差はウィーブの真の曲率(旋回方向フリップ3回=振動なし)なので、これ以上は削らない
    let maxDeg = 0
    const prev = getBallFrame(DRIBBLE_START).heading.clone()
    for (let i = Math.ceil(DRIBBLE_START * 2048) + 1; i <= Math.floor(DRIBBLE_END * 2048); i++) {
      const cur = getBallFrame(i / 2048).heading
      maxDeg = Math.max(maxDeg, THREE.MathUtils.radToDeg(prev.angleTo(cur)))
      prev.copy(cur)
    }
    expect(maxDeg, `dribble区間の最大Δ角 ${maxDeg.toFixed(2)}°`).toBeLessThan(6.5) // 実測5.35°×1.2
  })

  it('全域でビート継ぎ目を含め異常な向きの飛びがない', () => {
    // 実測最大42.96°@u≈0.1167(idle→dribble受け渡しの単発コーナー。PR-3スケール調整で
    // VENUES.x変更→RING_CENTER変更→ボール軌道の微妙な向き変化。総旋回50.6°が
    // 0.02u=41サンプルに分散しており、1フレームの視覚的な飛びにはならない)
    let maxDeg = 0
    let maxU = 0
    const prev = getBallFrame(0).heading.clone()
    for (let i = 1; i <= 2048; i++) {
      const cur = getBallFrame(i / 2048).heading
      const deg = THREE.MathUtils.radToDeg(prev.angleTo(cur))
      if (deg > maxDeg) {
        maxDeg = deg
        maxU = i / 2048
      }
      prev.copy(cur)
    }
    expect(maxDeg, `全域最大Δ角 ${maxDeg.toFixed(2)}° @u=${maxU.toFixed(4)}`).toBeLessThan(45)
  })
})

describe('静止区間ホールド', () => {
  // カーネルは先読み方向にも±HEADING_KERNEL_U伸びるため、ホールドが保証されるのは
  // 境界からカーネル幅ぶん内側まで(実測: 初変化u=0.0415、HOME_HOLD_END-0.0055)
  const margin = HEADING_KERNEL_U + 1 / 2048

  it('home holdではheadingがシード(0,0,-1)のまま動かない', () => {
    const seed = new THREE.Vector3(0, 0, -1)
    for (const u of [0, (HOME_HOLD_END - margin) / 2, HOME_HOLD_END - margin]) {
      expect(getBallFrame(u).heading.angleTo(seed)).toBeLessThan(1e-9)
    }
  })

  it('contact rest(終端静止)ではheadingが最後の進行方向を保持する', () => {
    // 実測ではrestビートのease-outの尻尾が変位下限を割るu=0.9614以降ずっとホールド。
    // テストはREST_END以降+カーネル余裕の保証範囲で確認する
    const held = getBallFrame(1).heading
    for (const u of [REST_END + margin, (REST_END + margin + 1) / 2, 0.98]) {
      expect(getBallFrame(u).heading.angleTo(held)).toBeLessThan(1e-9)
    }
  })
})

describe('anchorの契約(PR-2のカメラが依存する性質)', () => {
  it('u=0はHOME_REST、u=1はCONTACT_RESTに一致する(静止点でアンカーがずれない)', () => {
    // 実測: u=0は距離0(完全一致)、u=1は2.6e-5(y平滑窓がrestビートの尻尾を含むため)
    expect(getBallFrame(0).anchor.distanceTo(HOME_REST)).toBeLessThan(1e-9)
    expect(getBallFrame(1).anchor.distanceTo(CONTACT_REST)).toBeLessThan(1e-3)
  })

  it('dribble中盤のanchor.yはバウンドの縦揺れを吸収している', () => {
    // 生のボールyはバウンドで振幅1.30。±0.01uカーネルで残留リップル0.115(実測)。
    // これが崩れる=カメラが1バウンドごとに上下して酔う、を検出する
    let min = Infinity
    let max = -Infinity
    for (let i = Math.round(0.14 * 2048); i <= Math.round(0.19 * 2048); i++) {
      const y = getBallFrame(i / 2048).anchor.y
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
    expect(max - min, `dribble中盤のanchor.yリップル ${(max - min).toFixed(3)}`).toBeLessThan(0.2)
  })
})
