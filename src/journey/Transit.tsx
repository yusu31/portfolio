// transit区間(ヴェニュー間の道)の骨格。Phase 5-2では地面のみのプレースホルダー。
// 並木(Transit1)/観客席(Transit2)/雲間演出(Transit3)といった装飾はPhase 6-4で追加する。
import { TRANSIT_SPANS, type TransitSpan } from './path'

// Groundより気持ち濃いグレージュにして、ヴェニューとの切り替わりを地面色でも軽く示す
const TRANSIT_COLOR = '#c2a59c'

function TransitGround({ centerZ, length }: TransitSpan) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, centerZ]}>
      <planeGeometry args={[14, length]} />
      <meshStandardMaterial color={TRANSIT_COLOR} roughness={0.92} />
    </mesh>
  )
}

export function Transit1() {
  return <TransitGround {...TRANSIT_SPANS.transit1} />
}

export function Transit2() {
  return <TransitGround {...TRANSIT_SPANS.transit2} />
}

export function Transit3() {
  return <TransitGround {...TRANSIT_SPANS.transit3} />
}
