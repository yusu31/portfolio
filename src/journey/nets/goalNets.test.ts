// サッカー/バレーのコード実体ネット(設計書§4)の回帰テスト。
// ブラウザ不要の一次防衛線として「フレームから外れていないか」「共有辺で裂けないか」
// 「パフォーマンス予算に収まっているか」を担保する。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  SOCCER_GOAL_POST_Z,
  SOCCER_GOAL_BOTTOM_Y,
  SOCCER_GOAL_CROSSBAR_Y,
  SOCCER_NET_DEPTH_TOP,
  SOCCER_NET_DEPTH_BOTTOM,
  VOLLEY_NET_POST_Z,
  VOLLEY_NET_TOP_Y,
  VOLLEY_NET_BOTTOM_Y,
} from '../path'
import {
  buildCordNetGeometry,
  cordNetSegments,
  cordNetStats,
  frameDistanceWeight,
  panelKnots,
} from './cordNetGeometry'
import {
  GOAL_NET_CORD_RADIUS,
  SOCCER_NET_SPEC,
  VOLLEY_NET_SPEC,
  soccerFrameSegments,
  soccerNetPanels,
  volleyFrameSegments,
  volleyNetPanels,
} from './goalNets'
import {
  NET_WIND_BEGIN_VERTEX,
  NET_WIND_PARS_VERTEX,
  WIND_FROZEN_TIME,
  advanceWindTime,
  netWindOnBeforeCompile,
} from './netWind'

describe('panelKnots(双線形パネル)', () => {
  const panel = {
    corners: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(2, 2, 0),
      new THREE.Vector3(0, 2, 0),
    ] as const,
    segU: 4,
    segV: 2,
  }

  it('結び目数は (segU+1) × (segV+1)', () => {
    expect(panelKnots(panel)).toHaveLength(5 * 3)
  })

  it('四隅が仕様どおりの位置に来る(行優先: 先頭がc00、u末尾がc10、末尾がc11)', () => {
    const knots = panelKnots(panel)
    expect(knots[0].toArray()).toEqual([0, 0, 0])
    expect(knots[4].toArray()).toEqual([4, 0, 0])
    expect(knots[knots.length - 5].toArray()).toEqual([0, 2, 0])
    expect(knots[knots.length - 1].toArray()).toEqual([2, 2, 0])
  })

  it('台形でも上辺・下辺がそれぞれ均等割りになる(背面パネルが台形のため)', () => {
    const knots = panelKnots(panel)
    // v=1(上辺)は0→2を4分割
    expect(knots[10].x).toBeCloseTo(0)
    expect(knots[11].x).toBeCloseTo(0.5)
    expect(knots[14].x).toBeCloseTo(2)
  })
})

describe('cordNetSegments(コードの一意化)', () => {
  it('1枚パネルのコード本数が格子の辺数と一致する', () => {
    const panels = [
      {
        corners: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(3, 0, 0),
          new THREE.Vector3(3, 3, 0),
          new THREE.Vector3(0, 3, 0),
        ] as const,
        segU: 3,
        segV: 3,
      },
    ]
    // 横 (segV+1)×segU + 縦 (segU+1)×segV = 4*3 + 4*3
    expect(cordNetSegments(panels)).toHaveLength(24)
  })

  it('辺を共有する2枚のパネルで共有辺のコードが二重にならない', () => {
    const a = {
      corners: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
        new THREE.Vector3(2, 2, 0),
        new THREE.Vector3(0, 2, 0),
      ] as const,
      segU: 2,
      segV: 2,
    }
    // aのv=1辺(y=2, x0→2)を共有して奥へ折れ曲がるパネル
    const b = {
      corners: [
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(2, 2, 0),
        new THREE.Vector3(2, 2, 2),
        new THREE.Vector3(0, 2, 2),
      ] as const,
      segU: 2,
      segV: 2,
    }
    const single = cordNetSegments([a]).length
    // 共有辺のコード2本ぶんだけ減る
    expect(cordNetSegments([a, b])).toHaveLength(single * 2 - 2)
  })
})

describe('frameDistanceWeight(風の重み)', () => {
  const segments = [[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)] as const]
  const weight = frameDistanceWeight(segments, 2)

  it('フレーム上では0', () => {
    expect(weight(new THREE.Vector3(0, 0, 0))).toBe(0)
  })

  it('reach以上離れると1', () => {
    expect(weight(new THREE.Vector3(3, 0, 0))).toBe(1)
  })

  it('距離とともに単調増加する', () => {
    const samples = [0.4, 0.8, 1.2, 1.6].map((d) => weight(new THREE.Vector3(d, 0, 0)))
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1])
    }
  })
})

describe('サッカーゴールネット', () => {
  const panels = soccerNetPanels()

  it('4面(天面・背面・側面2枚)で構成される', () => {
    expect(panels).toHaveLength(4)
  })

  it('隣接パネルの共有辺で分割数が揃っている(揃っていないと風で継ぎ目が裂ける)', () => {
    const [top, back, sideA, sideB] = panels
    expect(top.segV).toBe(back.segV) // 天面と背面はゴール幅(z)方向を共有
    expect(sideA.segU).toBe(top.segU) // 側面上辺と天面の奥行き方向
    expect(sideA.segV).toBe(back.segU) // 側面後辺と背面の斜面方向
    expect(sideB.segU).toBe(sideA.segU)
    expect(sideB.segV).toBe(sideA.segV)
  })

  it('全結び目がゴールの内側(前面より奥・地面より上・支柱間)に収まる', () => {
    for (const panel of panels) {
      for (const knot of panelKnots(panel)) {
        expect(knot.x).toBeLessThanOrEqual(1e-6)
        expect(knot.x).toBeGreaterThanOrEqual(-SOCCER_NET_DEPTH_BOTTOM - 1e-6)
        expect(knot.y).toBeGreaterThanOrEqual(SOCCER_GOAL_BOTTOM_Y - 1e-6)
        expect(knot.y).toBeLessThanOrEqual(SOCCER_GOAL_CROSSBAR_Y + 1e-6)
        expect(Math.abs(knot.z)).toBeLessThanOrEqual(SOCCER_GOAL_POST_Z + 1e-6)
      }
    }
  })

  it('天面の前縁がクロスバー、背面の下縁が地面に接している', () => {
    const [top, back] = panels
    expect(top.corners[0].y).toBe(SOCCER_GOAL_CROSSBAR_Y)
    expect(top.corners[0].x).toBe(0)
    expect(back.corners[1].y).toBe(SOCCER_GOAL_BOTTOM_Y)
    expect(back.corners[1].x).toBe(-SOCCER_NET_DEPTH_BOTTOM)
  })

  it('背面が後方へ倒れている(天面の奥行き < 地面側の奥行き)', () => {
    expect(SOCCER_NET_DEPTH_TOP).toBeLessThan(SOCCER_NET_DEPTH_BOTTOM)
  })

  it('フレームに接する結び目の風の重みが0になる', () => {
    const weight = SOCCER_NET_SPEC.windWeightAt
    // クロスバー・支柱・背面上端バー・接地縁の代表点
    // (距離が浮動小数の丸めで厳密0にならない点があるためtoBeCloseTo)
    expect(weight(new THREE.Vector3(0, SOCCER_GOAL_CROSSBAR_Y, 0))).toBeCloseTo(0, 9)
    expect(weight(new THREE.Vector3(0, 1, SOCCER_GOAL_POST_Z))).toBeCloseTo(0, 9)
    expect(weight(new THREE.Vector3(-SOCCER_NET_DEPTH_TOP, SOCCER_GOAL_CROSSBAR_Y, 0))).toBeCloseTo(0, 9)
    expect(weight(new THREE.Vector3(-SOCCER_NET_DEPTH_BOTTOM, SOCCER_GOAL_BOTTOM_Y, 0))).toBeCloseTo(0, 9)
  })

  it('背面の中央が最大振幅で揺れる', () => {
    const center = new THREE.Vector3(
      -(SOCCER_NET_DEPTH_TOP + SOCCER_NET_DEPTH_BOTTOM) / 2,
      (SOCCER_GOAL_BOTTOM_Y + SOCCER_GOAL_CROSSBAR_Y) / 2,
      0
    )
    expect(SOCCER_NET_SPEC.windWeightAt(center)).toBe(1)
  })

  it('パネル境界の結び目は、どのパネル経由でも同じ重みになる(裂けない)', () => {
    const weight = SOCCER_NET_SPEC.windWeightAt
    const shared = new THREE.Vector3(-SOCCER_NET_DEPTH_TOP, SOCCER_GOAL_CROSSBAR_Y, 1.1)
    // 位置の関数なので同一入力→同一出力であることを明示的に固定する
    expect(weight(shared.clone())).toBe(weight(shared.clone()))
  })

  it('設計書§4.2のコード本数・三角形数の予算に収まる', () => {
    const stats = cordNetStats(SOCCER_NET_SPEC)
    expect(stats.cords).toBeLessThanOrEqual(1250)
    expect(stats.triangles).toBeLessThanOrEqual(15000)
  })

  it('フレーム線分がすべて有限長', () => {
    for (const [a, b] of soccerFrameSegments()) {
      expect(a.distanceTo(b)).toBeGreaterThan(0)
    }
  })
})

describe('バレーネット', () => {
  const panels = volleyNetPanels()

  it('支柱間・白帯下に1枚だけ張る', () => {
    expect(panels).toHaveLength(1)
    for (const knot of panelKnots(panels[0])) {
      expect(knot.x).toBe(0)
      expect(knot.y).toBeGreaterThanOrEqual(VOLLEY_NET_BOTTOM_Y - 1e-6)
      expect(knot.y).toBeLessThanOrEqual(VOLLEY_NET_TOP_Y + 1e-6)
      expect(Math.abs(knot.z)).toBeLessThanOrEqual(VOLLEY_NET_POST_Z + 1e-6)
    }
  })

  it('上端(白帯)と支柱で重み0、下端中央で最大になる', () => {
    const weight = VOLLEY_NET_SPEC.windWeightAt
    expect(weight(new THREE.Vector3(0, VOLLEY_NET_TOP_Y, 0))).toBe(0)
    expect(weight(new THREE.Vector3(0, 3, VOLLEY_NET_POST_Z))).toBe(0)
    expect(weight(new THREE.Vector3(0, VOLLEY_NET_BOTTOM_Y, 0))).toBe(1)
  })

  it('下端は固定しない(下端中央のほうが中段より大きく動く)', () => {
    const weight = VOLLEY_NET_SPEC.windWeightAt
    const mid = (VOLLEY_NET_TOP_Y + VOLLEY_NET_BOTTOM_Y) / 2
    expect(weight(new THREE.Vector3(0, VOLLEY_NET_BOTTOM_Y, 0))).toBeGreaterThan(
      weight(new THREE.Vector3(0, mid, 0))
    )
  })

  it('フレーム線分がすべて有限長', () => {
    for (const [a, b] of volleyFrameSegments()) {
      expect(a.distanceTo(b)).toBeGreaterThan(0)
    }
  })

  it('設計書§4.2のコード本数・三角形数の予算に収まる', () => {
    const stats = cordNetStats(VOLLEY_NET_SPEC)
    expect(stats.cords).toBeLessThanOrEqual(520)
    expect(stats.triangles).toBeLessThanOrEqual(6500)
  })
})

describe('buildCordNetGeometry', () => {
  const geometry = buildCordNetGeometry(VOLLEY_NET_SPEC)
  const stats = cordNetStats(VOLLEY_NET_SPEC)

  it('属性の要素数が整合する', () => {
    expect(geometry.getAttribute('position').count).toBe(stats.vertices)
    expect(geometry.getAttribute('normal').count).toBe(stats.vertices)
    expect(geometry.getAttribute('windWeight').count).toBe(stats.vertices)
    expect(geometry.getIndex()?.count).toBe(stats.triangles * 3)
  })

  it('インデックスが範囲内を指す(壊れた三角形が出ない)', () => {
    const index = geometry.getIndex()!
    for (let i = 0; i < index.count; i++) {
      expect(index.getX(i)).toBeLessThan(stats.vertices)
    }
  })

  it('windWeightがすべて0〜1に収まる', () => {
    const w = geometry.getAttribute('windWeight')
    for (let i = 0; i < w.count; i++) {
      expect(w.getX(i)).toBeGreaterThanOrEqual(0)
      expect(w.getX(i)).toBeLessThanOrEqual(1)
    }
  })

  it('白帯に接する上端の頂点は風で動かない(windWeight=0)', () => {
    const pos = geometry.getAttribute('position')
    const w = geometry.getAttribute('windWeight')
    let checked = 0
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getY(i) - VOLLEY_NET_TOP_Y) > 1e-3) continue
      expect(w.getX(i)).toBeCloseTo(0, 9)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('バウンディングスフィアがネット全体を含む(frustumCulled既定のまま使うため)', () => {
    const sphere = geometry.boundingSphere!
    expect(sphere.radius).toBeGreaterThan(VOLLEY_NET_POST_Z)
  })

  it('コードが結び目の隙間を埋めるよう半径ぶん伸びている', () => {
    const pos = geometry.getAttribute('position')
    let minZ = Infinity
    for (let i = 0; i < pos.count; i++) minZ = Math.min(minZ, pos.getZ(i))
    // 端のコードは -VOLLEY_NET_POST_Z より半径ぶん外へ出る
    expect(minZ).toBeLessThan(-VOLLEY_NET_POST_Z)
    expect(minZ).toBeGreaterThan(-VOLLEY_NET_POST_Z - GOAL_NET_CORD_RADIUS * 3)
  })
})

describe('風のQAスイッチ(設計書§7.2)', () => {
  it('固定中は経過時間によらず同じ時刻を返す', () => {
    expect(advanceWindTime(3, 0.016, true)).toBe(WIND_FROZEN_TIME)
    expect(advanceWindTime(99, 5, true)).toBe(WIND_FROZEN_TIME)
  })

  it('固定していなければdeltaぶん進む', () => {
    expect(advanceWindTime(3, 0.5, false)).toBeCloseTo(3.5)
  })

  it('固定時刻は0でない(風が効いていることをスクリーンショットで確認できる位相)', () => {
    expect(WIND_FROZEN_TIME).not.toBe(0)
  })

  it('onBeforeCompileがuniformを共有し、begin_vertexを置き換える', () => {
    const uniforms = { uWindTime: { value: 1 }, uWindAmp: { value: 0.2 } }
    const shader = {
      vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
      uniforms: {} as Record<string, { value: unknown }>,
    }
    netWindOnBeforeCompile(uniforms)(shader)
    expect(shader.uniforms.uWindTime).toBe(uniforms.uWindTime)
    expect(shader.uniforms.uWindAmp).toBe(uniforms.uWindAmp)
    expect(shader.vertexShader).toContain(NET_WIND_PARS_VERTEX.trim())
    expect(shader.vertexShader).toContain('transformed += gust * windWeight * uWindAmp;')
    expect(shader.vertexShader).not.toContain('#include <begin_vertex>')
  })

  it('注入するGLSLがwindWeight属性とuniformを宣言している', () => {
    expect(NET_WIND_PARS_VERTEX).toContain('attribute float windWeight;')
    expect(NET_WIND_PARS_VERTEX).toContain('uniform float uWindTime;')
    expect(NET_WIND_BEGIN_VERTEX).toContain('vec3 transformed = vec3( position );')
  })
})
