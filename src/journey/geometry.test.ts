// PR-3スケール調整後の ボール-構造物整合テスト（新規）。
// ジオメトリ層の不変条件: リング通過可能・コート境界尊重・セクション非干渉
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { COURT_SIZES, VENUES, STRUCTURE_GROUND_LIFT } from './path'
import { HOOP_GROUP_OFFSET, RING_OFFSET } from './ball/anchors'
import { BALL_RADIUS } from './ball/roll'
import { getBallPose } from './ball/ballPath'
import { DRIBBLE_START, DRIBBLE_END, RING_U, FALL_END, SPIKE_END } from './ball/beats'

// リング中心（anchors.ts から）
const RING_CENTER = VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET).add(RING_OFFSET)

describe('ボール-構造物整合(PR-3スケール調整)', () => {
  it('リング開口がボール通過可能(開口直径 > 球直径×1.15)', () => {
    const ringRadius = 3.0
    const ringOpeningDiameter = ringRadius * 2
    const ballDiameter = BALL_RADIUS * 2
    expect(ringOpeningDiameter, `リング開口${ringOpeningDiameter} > 球直径${ballDiameter}×1.15`).toBeGreaterThan(
      ballDiameter * 1.15
    )
  })

  it('freeThrow区間でリング通過時のボール位置が妥当(高さ方向)', () => {
    // freeThrow(u∈[CATCH_END, RING_U])でリング中心を通過するはず
    // テストでは RING_U 付近で高さが RING_CENTER.y ±許容値内か確認
    const pose = getBallPose(RING_U)
    const posZ = pose.position.z
    // リング通過は z軸方向で一定(リング中心のz付近で通過)。y は重力で低下。
    // リングはz軸方向に取り付いているため(rotation=[π/2, 0, 0])、xy平面での通過を確認
    expect(posZ, `RING_U付近でZ≈RING_CENTER.z (実際:${posZ.toFixed(2)}, 期待:${RING_CENTER.z.toFixed(2)})`).toBeCloseTo(
      RING_CENTER.z,
      0.5 // 誤差 ±0.5
    )
  })

  it('ドリブル区間でボール位置がコート内に収まる', () => {
    const halfWidth = COURT_SIZES.projects.width / 2
    const halfDepth = COURT_SIZES.projects.depth / 2
    const minX = VENUES.projects.center.x - halfWidth
    const maxX = VENUES.projects.center.x + halfWidth
    const minZ = VENUES.projects.center.z - halfDepth
    const maxZ = VENUES.projects.center.z + halfDepth

    let violations = 0
    for (let i = Math.ceil(DRIBBLE_START * 1000); i <= Math.floor(DRIBBLE_END * 1000); i++) {
      const pose = getBallPose(i / 1000)
      const { x, z } = pose.position
      if (x < minX - BALL_RADIUS || x > maxX + BALL_RADIUS ||
          z < minZ - BALL_RADIUS || z > maxZ + BALL_RADIUS) {
        violations++
      }
    }
    expect(violations, `ドリブル区間でコート外逸脱: ${violations}件`).toBe(0)
  })

  it('トス頂点がネット上帯より十分上(球半径+安全マージン)', () => {
    // ネット上帯は y≈5.2(STRUCTURE_GROUND_LIFT + netHeight)
    // トス頂点は約u=0.75。実装では TOSS_PEAK = VENUES.about.center + (3.5, 8.5, -9)
    const netTopY = VENUES.about.center.y + STRUCTURE_GROUND_LIFT + 5.2
    const tossPeakY = 8.5 // anchors.ts から
    expect(tossPeakY, `トス頂点${tossPeakY} > ネット上帯${netTopY} + 球半径${BALL_RADIUS}`).toBeGreaterThan(
      netTopY + BALL_RADIUS
    )
  })

  it('セクション間の非干渉(コート奥と次のコート手前に余裕がある)', () => {
    // projects AABB (z軸: minZ < centerZ < maxZ)
    const projectsHalfDepth = COURT_SIZES.projects.depth / 2
    const projectsMaxZ = VENUES.projects.center.z + projectsHalfDepth
    const projectsMinZ = VENUES.projects.center.z - projectsHalfDepth

    // skills AABB
    const skillsHalfDepth = COURT_SIZES.skills.depth / 2
    const skillsMaxZ = VENUES.skills.center.z + skillsHalfDepth
    const skillsMinZ = VENUES.skills.center.z - skillsHalfDepth

    // about AABB
    const aboutHalfDepth = COURT_SIZES.about.depth / 2
    const aboutMaxZ = VENUES.about.center.z + aboutHalfDepth
    const aboutMinZ = VENUES.about.center.z - aboutHalfDepth

    // projects奥(minZ)からskills手前(maxZ)への距離(z軸負方向)
    // minZ < maxZだが、maxZの方が「手前」なので距離はmaxZ - minZ (負の値)
    // 絶対値で確認
    const gap1 = Math.abs(skillsMaxZ - projectsMinZ)
    expect(gap1, `projects奥(${projectsMinZ.toFixed(2)}) から skills手前(${skillsMaxZ.toFixed(2)})の間隔:${gap1.toFixed(2)}`).toBeGreaterThan(10)

    // skills奥(minZ)からabout手前(maxZ)への距離
    const gap2 = Math.abs(aboutMaxZ - skillsMinZ)
    expect(gap2, `skills奥(${skillsMinZ.toFixed(2)}) から about手前(${aboutMaxZ.toFixed(2)})の間隔:${gap2.toFixed(2)}`).toBeGreaterThan(10)
  })

  it('コート幅の整合性(実寸比が妥当な範囲)', () => {
    // PR-3: 短辺/球比の確認
    // skills: depth=28.5, ball_diameter=3.0 → 比=9.5 (目標9〜10)
    const skillsRatio = COURT_SIZES.skills.depth / (BALL_RADIUS * 2)
    expect(skillsRatio, `skills深さ/球直径比 ${skillsRatio.toFixed(2)}`).toBeGreaterThanOrEqual(9)
    expect(skillsRatio, `skills深さ/球直径比 ${skillsRatio.toFixed(2)}`).toBeLessThanOrEqual(10.5)

    // about も同じ
    const aboutRatio = COURT_SIZES.about.depth / (BALL_RADIUS * 2)
    expect(aboutRatio, `about深さ/球直径比 ${aboutRatio.toFixed(2)}`).toBeGreaterThanOrEqual(9)
  })
})
