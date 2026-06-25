import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function Cursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isHover, setIsHover] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      if (!visible) setVisible(true)
    }
    const onEnter = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('a, button')) setIsHover(true)
    }
    const onLeave = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('a, button')) setIsHover(false)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [visible])

  if (!visible) return null

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'difference',
      }}
      animate={{ x: pos.x - 19, y: pos.y - 19 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
    >
      <motion.div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1.5px solid rgba(234,88,12,.7)',
          backgroundColor: 'rgba(249,115,22,.08)',
        }}
        animate={{ scale: isHover ? 1.6 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />
      <motion.div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: '#fb923c',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: isHover ? 2.5 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />
    </motion.div>
  )
}
