// バスケットネットのトポロジー・静止形状の不変条件。
// 物理(u軸ベイクVerlet)を載せる前に、格子が「均一なダイヤモンド網」であることと
// 「ボールが押し広げないと通れない絞り」になっていることを担保する。
import { describe, expect, it } from 'vitest'
import { RING_RADIUS } from '../ball/anchors'
import { BALL_RADIUS } from '../ball/roll'
import {
  NET_COLUMNS,
  NET_CORD_COUNT,
  NET_KNOT_TOTAL,
  NET_LENGTH,
  NET_ROWS,
  NET_SIMULATED_COUNT,
  knotIndex,
  netCords,
  netRestPositions,
} from './basketNetGeometry'

describe('バスケットネットのトポロジー', () => {
  it('結び目数・コード本数が設計値と一致する', () => {
    expect(NET_KNOT_TOTAL).toBe(72) // (5段+ピン留め1段) × 12列
    expect(NET_SIMULATED_COUNT).toBe(60) // 段1〜5 × 12列(段0はリングに固定)
    expect(NET_CORD_COUNT).toBe(120) // 遷移5回 × 12結び目 × 下向き2本
    expect(netRestPositions()).toHaveLength(NET_KNOT_TOTAL)
    expect(netCords()).toHaveLength(NET_CORD_COUNT)
  })

  it('各結び目が下向きにちょうど2本のコードを出す', () => {
    const outDegree = new Map<number, number>()
    for (const [from] of netCords()) outDegree.set(from, (outDegree.get(from) ?? 0) + 1)
    // 最下段(段NET_ROWS)は下向きのコードを持たない
    for (let row = 0; row < NET_ROWS; row++) {
      for (let c = 0; c < NET_COLUMNS; c++) {
        expect(outDegree.get(knotIndex(row, c)), `段${row}列${c}の下向き本数`).toBe(2)
      }
    }
    for (let c = 0; c < NET_COLUMNS; c++) {
      expect(outDegree.get(knotIndex(NET_ROWS, c))).toBeUndefined()
    }
  })

  it('各結び目が上向きにちょうど2本のコードを受ける(網目が均一=ダイヤモンド)', () => {
    const inDegree = new Map<number, number>()
    for (const [, to] of netCords()) inDegree.set(to, (inDegree.get(to) ?? 0) + 1)
    for (let row = 1; row <= NET_ROWS; row++) {
      for (let c = 0; c < NET_COLUMNS; c++) {
        expect(inDegree.get(knotIndex(row, c)), `段${row}列${c}の上向き本数`).toBe(2)
      }
    }
    // 段0はリングに掛かる側なので受けるコードは無い
    for (let c = 0; c < NET_COLUMNS; c++) {
      expect(inDegree.get(knotIndex(0, c))).toBeUndefined()
    }
  })

  it('同じコードが重複しない', () => {
    const seen = new Set<string>()
    for (const [a, b] of netCords()) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      expect(seen.has(key), `重複コード ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('コードは必ず隣接段どうしを繋ぐ(段飛ばしや同段内の接続がない)', () => {
    for (const [a, b] of netCords()) {
      const rowA = Math.floor(a / NET_COLUMNS)
      const rowB = Math.floor(b / NET_COLUMNS)
      expect(rowB - rowA, `コード ${a}-${b} の段差`).toBe(1)
    }
  })
})

describe('バスケットネットの静止形状', () => {
  const positions = netRestPositions()

  it('段0の半径がリング半径に一致する(単一ソース)', () => {
    for (let c = 0; c < NET_COLUMNS; c++) {
      const p = positions[knotIndex(0, c)]
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(RING_RADIUS, 6)
      expect(p.y).toBeCloseTo(0, 6) // リング平面がローカル原点
    }
  })

  it('全長がNET_LENGTH(実物0.40m×13.1倍)ぶん垂れる', () => {
    for (let c = 0; c < NET_COLUMNS; c++) {
      expect(positions[knotIndex(NET_ROWS, c)].y).toBeCloseTo(-NET_LENGTH, 6)
    }
  })

  it('下端半径がボール半径より小さい(ボールが押し広げないと通れない=スイッシュの要件)', () => {
    const p = positions[knotIndex(NET_ROWS, 0)]
    const bottomRadius = Math.hypot(p.x, p.z)
    expect(bottomRadius, `下端半径${bottomRadius} < ボール半径${BALL_RADIUS}`).toBeLessThan(BALL_RADIUS)
  })

  it('半径が段を下るごとに単調減少する(逆テーパーや膨らみがない)', () => {
    let previous = Infinity
    for (let row = 0; row <= NET_ROWS; row++) {
      const p = positions[knotIndex(row, 0)]
      const radius = Math.hypot(p.x, p.z)
      expect(radius, `段${row}の半径${radius} < 段${row - 1}の${previous}`).toBeLessThan(previous)
      previous = radius
    }
  })

  it('段が下るごとに必ず低くなる(等間隔)', () => {
    const step = NET_LENGTH / NET_ROWS
    for (let row = 0; row <= NET_ROWS; row++) {
      expect(positions[knotIndex(row, 0)].y).toBeCloseTo(-step * row, 6)
    }
  })

  it('隣接段は半ステップ千鳥にずれている(ダイヤモンド網の条件)', () => {
    const halfStep = Math.PI / NET_COLUMNS
    for (let row = 0; row < NET_ROWS; row++) {
      const a = positions[knotIndex(row, 0)]
      const b = positions[knotIndex(row + 1, 0)]
      const angleA = Math.atan2(a.z, a.x)
      const angleB = Math.atan2(b.z, b.x)
      expect(Math.abs(angleB - angleA), `段${row}→${row + 1}の角度ずれ`).toBeCloseTo(halfStep, 6)
    }
  })
})
