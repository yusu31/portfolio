// 経路モジュールの回帰テスト(ブラウザ不要の一次防衛線)。
// チェイスカム化(PR-2)でCAMERA_PATH/LOOKAT_PATH(独立経路)を全廃したため、
// これらに依存していた経路長・視線AABBテストは削除した(計画書に明記の方針)。
// 構造物クリアランス・終端静止のテストは、poseJourneyCamera(camera.ts)でカメラを構築した
// 位置サンプルで再構成する。ヴェニュー近傍性テストも「カメラが独立に近づく」という
// 旧来の前提が崩れたため、カメラの追従元であるBallFrame.anchor(=ボールの位置)基準に置換した
// (チェイスカムはボールから常にD_BACK分だけ後方に留まるため、カメラ自身のz到達を
// venue.z±5で判定するとcontactのように据え置き終着点で必ず失敗する。BallFrame.anchorは
// カメラが実際に追従する量そのものであり、より正しい近傍性の指標になる)。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { PATH_END_OFFSET, PAGES } from './curves'
import { SECTION_RANGES, sectionAt } from './sections'
import {
  VENUES,
  SOCCER_GOAL_GROUP_OFFSET,
  SOCCER_GOAL_POST_Z,
  VOLLEY_NET_GROUP_OFFSET,
  VOLLEY_NET_POST_Z,
  FINISH_GATE_OFFSET_Z,
  FINISH_GATE_POLE_X,
} from './venues'
import { HOOP_GROUP_OFFSET, HOOP_POST_LOCAL_OFFSET, CONTACT_REST } from '../ball/anchors'
import { getBallFrame } from '../ball/chase'
import { poseJourneyCamera } from '../camera'

const deg = THREE.MathUtils.radToDeg

/** poseJourneyCameraでカメラを構築するテスト用ヘルパー(CameraRig.tsxと同じビルダーを直接呼ぶだけ) */
function cameraAt(u: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
  poseJourneyCamera(camera, u, 1)
  camera.updateMatrixWorld()
  return camera
}

describe('SECTION_RANGES', () => {
  it('全区間で start < end', () => {
    for (const r of SECTION_RANGES) {
      expect(r.start).toBeLessThan(r.end)
    }
  })

  it('区間が昇順に並び、重なりがない', () => {
    for (let i = 1; i < SECTION_RANGES.length; i++) {
      expect(SECTION_RANGES[i].start).toBeGreaterThanOrEqual(SECTION_RANGES[i - 1].end)
    }
  })

  it('先頭はoffset 0から始まり、末尾はスクロール終端(1.0)を含む', () => {
    expect(SECTION_RANGES[0].start).toBe(0)
    expect(SECTION_RANGES[SECTION_RANGES.length - 1].end).toBeGreaterThan(1)
  })

  it('sectionAtが境界・隙間・終端で正しいセクションを返す', () => {
    expect(sectionAt(0)).toBe('home')
    expect(sectionAt(0.09)).toBeNull() // home→projects間の意図した隙間(見出し重なり回避)
    expect(sectionAt(0.41)).toBe('skills')
    expect(sectionAt(1.0)).toBe('contact')
  })
})

describe('u→ボール位置のヴェニュー近傍性(チェイスカムの追従元=BallFrame.anchorで判定)', () => {
  const venueSections = SECTION_RANGES.filter(
    (r): r is (typeof SECTION_RANGES)[number] & { id: keyof typeof VENUES } => r.id in VENUES
  )

  it.each(venueSections)('$id: 区間中にボール(anchor)がヴェニューのz近傍まで到達する', (r) => {
    const venue = VENUES[r.id].center
    const zStart = getBallFrame(Math.min(r.start, PATH_END_OFFSET)).anchor.z
    const zEnd = getBallFrame(Math.min(r.end, PATH_END_OFFSET)).anchor.z
    // 区間開始時はヴェニューがまだ前方にあり(z前方=負方向)、区間終了までにz±5以内へ到達する
    expect(venue.z).toBeLessThanOrEqual(zStart)
    expect(zEnd).toBeLessThanOrEqual(venue.z + 5)
  })
})

describe('構造物クリアランス(Phase 5-5固有のハザード+チェイスカム化で高さが大きく変わったための再実測)', () => {
  // 3倍化した構造物(ゴール・フープ支柱・ネット支柱)とゲートポールが「カメラに迫る」事故への
  // 一次防衛線。旧テスト(独立経路時代)は水平(xz)距離だけを見ていたが、チェイスカムは
  // フリースロー付近でカメラ高度がy≈10まで上がるため、水平距離だけでは「実際は構造物の
  // 遥か上を通過している」ケースを誤って危険と判定してしまう。そのため構造物を
  // 円柱(支柱)・箱(バックボード)としてモデル化し、カメラ位置との3D表面距離で判定する
  // (寸法はvenues.tsxのgeometryと同一値。単一ソースでない点は既知の軽微な重複)
  function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = b.clone().sub(a)
    const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1)
    return p.distanceTo(a.clone().addScaledVector(ab, t))
  }
  function distToBox(p: THREE.Vector3, c: THREE.Vector3, h: THREE.Vector3): number {
    const dx = Math.max(Math.abs(p.x - c.x) - h.x, 0)
    const dy = Math.max(Math.abs(p.y - c.y) - h.y, 0)
    const dz = Math.max(Math.abs(p.z - c.z) - h.z, 0)
    return Math.hypot(dx, dy, dz)
  }

  interface PoleCheck { name: string; a: THREE.Vector3; b: THREE.Vector3; threshold: number }
  const hoopGroup = VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET)
  const volleyGroup = VENUES.about.center.clone().add(VOLLEY_NET_GROUP_OFFSET)
  const soccerGroup = VENUES.projects.center.clone().add(SOCCER_GOAL_GROUP_OFFSET)
  const gateZ = VENUES.contact.center.z + FINISH_GATE_OFFSET_Z

  const poles: PoleCheck[] = [
    // サッカーゴールポスト(r=0.15、venues.tsxのcylinderGeometry[0.15,0.15,5.1,8]・底-0.4天4.7)
    { name: 'サッカーゴールポスト北', a: new THREE.Vector3(soccerGroup.x, -0.4, soccerGroup.z - SOCCER_GOAL_POST_Z), b: new THREE.Vector3(soccerGroup.x, 4.7, soccerGroup.z - SOCCER_GOAL_POST_Z), threshold: 1.2 },
    { name: 'サッカーゴールポスト南', a: new THREE.Vector3(soccerGroup.x, -0.4, soccerGroup.z + SOCCER_GOAL_POST_Z), b: new THREE.Vector3(soccerGroup.x, 4.7, soccerGroup.z + SOCCER_GOAL_POST_Z), threshold: 1.2 },
    // バスケフープ支柱(r=0.21、venues.tsxのcylinderGeometry[0.21,0.21,9,8]・底-0.4天8.6)
    {
      name: 'バスケフープ支柱',
      a: new THREE.Vector3(hoopGroup.x + HOOP_POST_LOCAL_OFFSET.x, -0.4, hoopGroup.z + HOOP_POST_LOCAL_OFFSET.z),
      b: new THREE.Vector3(hoopGroup.x + HOOP_POST_LOCAL_OFFSET.x, 8.6, hoopGroup.z + HOOP_POST_LOCAL_OFFSET.z),
      threshold: 1.2,
    },
    // バレーネット支柱(r=0.18、venues.tsxのcylinderGeometry[0.18,0.18,6.0,8]・底-0.4天5.6)
    { name: 'バレーネット支柱北', a: new THREE.Vector3(volleyGroup.x, -0.4, volleyGroup.z - VOLLEY_NET_POST_Z), b: new THREE.Vector3(volleyGroup.x, 5.6, volleyGroup.z - VOLLEY_NET_POST_Z), threshold: 1.2 },
    { name: 'バレーネット支柱南', a: new THREE.Vector3(volleyGroup.x, -0.4, volleyGroup.z + VOLLEY_NET_POST_Z), b: new THREE.Vector3(volleyGroup.x, 5.6, volleyGroup.z + VOLLEY_NET_POST_Z), threshold: 1.2 },
    // フィニッシュゲートポール(r=0.06、venues.tsxのcylinderGeometry[0.06,0.06,2.6,8]・底-0.38天2.22)
    { name: 'フィニッシュゲートポール西', a: new THREE.Vector3(VENUES.contact.center.x - FINISH_GATE_POLE_X, -0.38, gateZ), b: new THREE.Vector3(VENUES.contact.center.x - FINISH_GATE_POLE_X, 2.22, gateZ), threshold: 1.2 },
    { name: 'フィニッシュゲートポール東', a: new THREE.Vector3(VENUES.contact.center.x + FINISH_GATE_POLE_X, -0.38, gateZ), b: new THREE.Vector3(VENUES.contact.center.x + FINISH_GATE_POLE_X, 2.22, gateZ), threshold: 1.2 },
  ]

  it.each(poles)('%s とチェイスカム経路の表面距離が閾値以上ある', ({ name, a, b, threshold }) => {
    const N = 500
    let minDist = Infinity
    let minDistU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const camPos = cameraAt(u).position
      const dist = distToSegment(camPos, a, b)
      if (dist < minDist) { minDist = dist; minDistU = u }
    }
    expect(minDist, `${name}: 最接近 u=${minDistU.toFixed(4)} で表面距離${minDist.toFixed(2)}`).toBeGreaterThan(threshold)
  })

  // バスケのバックボードは、フリースロー直後(u≈0.47)にカメラがリング上空を通過する際
  // 最も接近する(構造物クリアランスの中で最もタイトな箇所。D_UP=3で表面距離0.74を実測確認済み)。
  // PR-2再調整(D_BACK 10→4.5、D_UPは3のまま据え置き)後も再実測で0.76を確認(同水準を維持)
  it('バスケバックボードとチェイスカム経路の表面距離が0.5以上ある', () => {
    const boardCenter = new THREE.Vector3(hoopGroup.x, hoopGroup.y + 7.5, hoopGroup.z)
    const boardHalf = new THREE.Vector3(2.25, 1.35, 0.09) // venues.tsxのboxGeometry[4.5,2.7,0.18]の半径
    const N = 1000
    let minDist = Infinity
    let minDistU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const camPos = cameraAt(u).position
      const dist = distToBox(camPos, boardCenter, boardHalf)
      if (dist < minDist) { minDist = dist; minDistU = u }
    }
    expect(minDist, `最接近 u=${minDistU.toFixed(4)} で表面距離${minDist.toFixed(2)}`).toBeGreaterThan(0.5)
  })
})

describe('終端静止(offsetクランプ)', () => {
  // PR-2再調整(D_BACK 10→4.5・LOOK_AHEAD 3→2・LOOK_UP 1→1.5、camera.ts参照)でカメラが
  // anchorへ寄ったため、終着位置も再実測した(チェイスカム実測: pos≈(1.6, 4.0, -242.1))。
  // x・yはD_UP据え置き(3)のためほぼ不変、zはD_BACK縮小分(10→4.5=5.5ユニット差)だけ
  // anchor側へ近づいた
  it('PATH_END_OFFSETでのカメラがContact終着の構図にある(チェイスカム実測: pos≈(1.6, 4.0, -242.1))', () => {
    const camera = cameraAt(PATH_END_OFFSET)
    expect(camera.position.x).toBeGreaterThan(1.0)
    expect(camera.position.x).toBeLessThan(2.2)
    expect(camera.position.y).toBeGreaterThan(3.5)
    expect(camera.position.y).toBeLessThan(4.5)
    expect(camera.position.z).toBeGreaterThan(-243.1)
    expect(camera.position.z).toBeLessThan(-241.1)
  })

  it('PATH_END_OFFSETでの視線がボール最終静止点(CONTACT_REST)の方向を向いている', () => {
    // 旧閾値10°は D_BACK=10(anchorから遠い)前提の値。カメラをanchorへ寄せたことで、
    // anchor(平滑化された追従点)と実際のCONTACT_REST(固定点)とのわずかな位置差が
    // 見込む角度に占める割合が大きくなり、実測20.71°まで増加した(scratchpad 2026-07-19)。
    // ただし見せ場サンプルの実測(ballPath.test.ts)ではrest終端でもndc.y=-0.81と
    // ボールは画面内に収まっており、実害はない角度増加と判断し閾値を再設定する
    const camera = cameraAt(PATH_END_OFFSET)
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    const toRest = CONTACT_REST.clone().sub(camera.position).normalize()
    expect(deg(fwd.angleTo(toRest))).toBeLessThan(23)
  })

  it('クランプ値が終端手前の妥当な範囲にある', () => {
    expect(PATH_END_OFFSET).toBeGreaterThan(0.95)
    expect(PATH_END_OFFSET).toBeLessThan(1)
  })
})

describe('スクロール設定', () => {
  it('PAGESはPhase 5-5でスクロール速度パリティにより21→27', () => {
    expect(PAGES).toBe(27)
  })
})
