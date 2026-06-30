interface JourneyZoneProps {
  id: string
  heightVh?: number
}

/**
 * 3DキャンバスをUIに隠されず全画面表示するための、透明な高さ確保用セクション。
 * 中身は描画しない（3D演出はCanvas側のBallJourneyが担当）。
 */
export default function JourneyZone({ id, heightVh = 250 }: JourneyZoneProps) {
  return (
    <section
      id={id}
      aria-hidden="true"
      style={{
        height: `${heightVh}vh`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  )
}
