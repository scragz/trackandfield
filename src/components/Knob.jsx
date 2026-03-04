import { useRef, useCallback } from 'react'

// min, max, value, onChange, label, decimals
export function Knob({ min, max, value, onChange, label, decimals = 1, unit = '' }) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)

  // Map value to rotation angle (-135° to +135°)
  const range = max - min
  const normalized = (value - min) / range
  const angle = -135 + normalized * 270

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startY.current = e.clientY
    startVal.current = value

    const onMove = (me) => {
      if (!dragging.current) return
      const dy = startY.current - me.clientY // up = increase
      const sensitivity = 0.5 // px per unit
      const delta = (dy / 100) * range * sensitivity
      const next = Math.min(max, Math.max(min, startVal.current + delta))
      onChange(next)
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, min, max, range, onChange])

  return (
    <div className="knob-wrap">
      <div
        className="knob"
        onMouseDown={onMouseDown}
        title={`${label}: ${value.toFixed(decimals)}${unit}`}
      >
        <div
          className="knob-indicator"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
      </div>
      <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '-1px' }}>
        {value.toFixed(decimals)}{unit}
      </span>
    </div>
  )
}
