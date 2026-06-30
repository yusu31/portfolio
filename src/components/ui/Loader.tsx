import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'
import gsap from 'gsap'

const BALL_SIZE = 320
const BAR_W     = 480
const MIN_DISPLAY_MS = 1800 // ゲージが0→100%になるまでの最小表示時間

export default function Loader() {
  const { progress, active } = useProgress()
  const containerRef   = useRef<HTMLDivElement>(null)
  const lottieWrapRef  = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressTxtRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(true)

  const doneRef      = useRef(false)
  const animRef      = useRef<AnimationItem | null>(null)
  const mountedRef   = useRef(true)
  const gaugeDoneRef = useRef(false) // ゲージアニメーションが100%まで完了したか
  const loadDoneRef  = useRef(false) // 実アセットのロードが完了したか

  const startExit = () => {
    if (doneRef.current) return
    doneRef.current = true
    gsap.to(containerRef.current, {
      opacity: 0, duration: 1.2, ease: 'power2.inOut', delay: 0.4,
      onComplete: () => setVisible(false),
    })
  }

  useEffect(() => {
    mountedRef.current = true
    const el = lottieWrapRef.current
    if (!el) return

    fetch('/sport-loading-white.json')
      .then(r => r.json())
      .then(data => {
        if (!mountedRef.current || !lottieWrapRef.current) return
        // 既存インスタンスを破棄してから生成（Strict Mode 対策）
        animRef.current?.destroy()
        animRef.current = lottie.loadAnimation({
          container: lottieWrapRef.current,
          renderer: 'canvas',
          loop: true,
          autoplay: true,
          animationData: data,
          rendererSettings: {
            dpr: 1,                       // Retina描画をスキップして軽量化
            clearCanvas: true,
            progressiveLoad: false,
            hideOnTransparent: true,
          } as Parameters<typeof lottie.loadAnimation>[0]['rendererSettings'],
        })
      })
      .catch(console.error)

    return () => {
      mountedRef.current = false
      animRef.current?.destroy()
      animRef.current = null
    }
  }, [])

  // ゲージを最小表示時間にかけて滑らかに0→100%へアニメーション
  useEffect(() => {
    const gauge = { value: 0 }
    const tween = gsap.to(gauge, {
      value: 100,
      duration: MIN_DISPLAY_MS / 1000,
      ease: 'power1.inOut',
      onUpdate: () => {
        const v = gauge.value
        if (progressBarRef.current) progressBarRef.current.style.width = `${v}%`
        if (progressTxtRef.current) {
          progressTxtRef.current.textContent = String(Math.round(v)).padStart(3, '0') + '%'
        }
      },
      onComplete: () => {
        gaugeDoneRef.current = true
        if (loadDoneRef.current) startExit()
      },
    })

    return () => {
      tween.kill()
    }
  }, [])

  // 実アセットのロード完了を検知（ゲージ完了済みなら即フェードアウト）
  useEffect(() => {
    loadDoneRef.current = !active && progress >= 100
    if (loadDoneRef.current && gaugeDoneRef.current) startExit()
  }, [active, progress])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        backgroundColor: '#0a0a0f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}
    >
      {/* Lottie canvas（白素材）— filterで#fb923cへ変換 */}
      <div
        ref={lottieWrapRef}
        style={{
          width: BALL_SIZE,
          height: BALL_SIZE,
          filter:
            'brightness(0) saturate(100%) invert(70%) sepia(64%) saturate(1147%) hue-rotate(335deg) brightness(101%) contrast(96%)',
        }}
      />

      {/* BAR_W幅の中に % を右端、バーを下 */}
      <div style={{ width: BAR_W, marginTop: 16 }}>
        <span
          ref={progressTxtRef}
          style={{
            display: 'block',
            textAlign: 'right',
            color: 'rgba(251,146,60,0.65)',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            marginBottom: 6,
          }}
        >
          000%
        </span>

        {/* プログレスバー */}
        <div
          style={{
            width: '100%',
            height: 4,
            backgroundColor: 'rgba(251,146,60,0.14)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            ref={progressBarRef}
            style={{
              height: '100%',
              width: '0%',
              backgroundColor: '#fb923c',
              boxShadow: '0 0 10px #fb923c',
              transition: 'width 0.3s ease',
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    </div>
  )
}
