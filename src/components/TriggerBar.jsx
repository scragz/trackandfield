import { useRef, useCallback, useEffect, useState } from 'react'

const BAR_HEIGHT = 80
const TRIGGER_RADIUS = 6
const STEM_MAX = 30  // max stem px from center
const DRAG_THRESHOLD = 4 // px before we decide horizontal vs vertical

function triggerColor(direction) {
  // interpolate between swell (green) and ping (purple)
  const t = (direction + 1) / 2
  // ping: #a78bfa, swell: #34d399
  const r = Math.round(lerp(0x34, 0xa7, t))
  const g = Math.round(lerp(0xd3, 0x8b, t))
  const b = Math.round(lerp(0x99, 0xfa, t))
  return `rgb(${r},${g},${b})`
}

function lerp(a, b, t) { return a + (b - a) * t }

export function TriggerBar({ laneId, triggers, playheadPosition, onAdd, onUpdate, onDelete }) {
  const svgRef = useRef(null)
  // Tracking which triggers are recently fired for glow effect
  const [firedIds, setFiredIds] = useState(new Set())
  const prevPlayhead = useRef(playheadPosition)

  // Detect triggers firing as playhead passes them
  useEffect(() => {
    const prev = prevPlayhead.current
    const curr = playheadPosition

    const fired = new Set()
    triggers.forEach(t => {
      // Handle loop wraparound
      if (prev <= curr) {
        if (t.position >= prev && t.position < curr) fired.add(t.id)
      } else {
        // wrapped
        if (t.position >= prev || t.position < curr) fired.add(t.id)
      }
    })

    prevPlayhead.current = curr

    if (fired.size > 0) {
      setFiredIds(fired)
      const timer = setTimeout(() => setFiredIds(new Set()), 200)
      return () => clearTimeout(timer)
    }
  }, [playheadPosition, triggers])

  const getSvgX = useCallback((clientX) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return (clientX - rect.left) / rect.width
  }, [])

  const getTriggerAt = useCallback((clientX, clientY, hitRadius = TRIGGER_RADIUS + 4) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = clientX - rect.left
    const y = clientY - rect.top
    const cx = BAR_HEIGHT / 2 // center y

    for (let i = triggers.length - 1; i >= 0; i--) {
      const t = triggers[i]
      const tx = t.position * rect.width
      const dist = Math.sqrt((x - tx) ** 2 + (y - cx) ** 2)
      if (dist <= hitRadius) return t
    }
    return null
  }, [triggers])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return // right-click handled separately
    e.preventDefault()

    const target = getTriggerAt(e.clientX, e.clientY)

    if (!target) {
      // Place new trigger
      const pos = Math.max(0, Math.min(1, getSvgX(e.clientX)))
      const newId = onAdd(laneId, pos)

      // Immediately start direction drag
      const startY = e.clientY
      const startDir = 0

      const onMove = (me) => {
        const dy = startY - me.clientY
        const direction = Math.max(-1, Math.min(1, startDir + dy / STEM_MAX))
        onUpdate(laneId, newId, { direction })
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      return
    }

    // Existing trigger — determine move vs direction drag
    const startX = e.clientX
    const startY = e.clientY
    const startPos = target.position
    const startDir = target.direction
    let mode = null // 'move' | 'direction'
    const rect = svgRef.current?.getBoundingClientRect()

    const onMove = (me) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY

      if (!mode) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          mode = Math.abs(dx) > Math.abs(dy) ? 'move' : 'direction'
        }
        return
      }

      if (mode === 'move') {
        const deltaPos = dx / (rect?.width || 1)
        const pos = Math.max(0, Math.min(1, startPos + deltaPos))
        onUpdate(laneId, target.id, { position: pos })
      } else {
        const direction = Math.max(-1, Math.min(1, startDir - dy / STEM_MAX))
        onUpdate(laneId, target.id, { direction })
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [getTriggerAt, getSvgX, laneId, onAdd, onUpdate])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const target = getTriggerAt(e.clientX, e.clientY)
    if (target) onDelete(laneId, target.id)
  }, [getTriggerAt, laneId, onDelete])

  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    // Use a larger hit radius for touch
    const target = getTriggerAt(touch.clientX, touch.clientY, TRIGGER_RADIUS + 12)

    if (!target) {
      // Tap empty area → place new trigger, then drag to set direction
      const pos = Math.max(0, Math.min(1, getSvgX(touch.clientX)))
      const newId = onAdd(laneId, pos)

      const startY = touch.clientY

      const onMove = (te) => {
        if (te.touches.length !== 1) return
        const t = te.touches[0]
        const dy = startY - t.clientY
        const direction = Math.max(-1, Math.min(1, dy / STEM_MAX))
        onUpdate(laneId, newId, { direction })
      }

      const onEnd = () => {
        window.removeEventListener('touchmove', onMove)
        window.removeEventListener('touchend', onEnd)
      }

      window.addEventListener('touchmove', onMove, { passive: false })
      window.addEventListener('touchend', onEnd)
      return
    }

    // Existing trigger — long press (500ms) to delete, drag to move/adjust direction
    const startX = touch.clientX
    const startY = touch.clientY
    const startPos = target.position
    const startDir = target.direction
    let mode = null // 'move' | 'direction'
    let deleted = false
    const rect = svgRef.current?.getBoundingClientRect()

    const longPressTimer = setTimeout(() => {
      deleted = true
      onDelete(laneId, target.id)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }, 500)

    const onMove = (te) => {
      if (deleted || te.touches.length !== 1) return
      const t = te.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      if (!mode) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          clearTimeout(longPressTimer)
          mode = Math.abs(dx) > Math.abs(dy) ? 'move' : 'direction'
        }
        return
      }

      if (mode === 'move') {
        const deltaPos = dx / (rect?.width || 1)
        const pos = Math.max(0, Math.min(1, startPos + deltaPos))
        onUpdate(laneId, target.id, { position: pos })
      } else {
        const direction = Math.max(-1, Math.min(1, startDir - dy / STEM_MAX))
        onUpdate(laneId, target.id, { direction })
      }
    }

    const onEnd = () => {
      clearTimeout(longPressTimer)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [getTriggerAt, getSvgX, laneId, onAdd, onUpdate, onDelete])

  const cy = BAR_HEIGHT / 2
  const playX = `${playheadPosition * 100}%`

  return (
    <svg
      ref={svgRef}
      className="trigger-bar"
      width="100%"
      height={BAR_HEIGHT}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
    >
      {/* Center line */}
      <line
        x1="0" y1={cy} x2="100%" y2={cy}
        stroke="var(--border)" strokeWidth="1"
      />

      {/* Grid lines at 25%, 50%, 75% */}
      {[0.25, 0.5, 0.75].map(p => (
        <line
          key={p}
          x1={`${p * 100}%`} y1="0"
          x2={`${p * 100}%`} y2={BAR_HEIGHT}
          stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,4"
          opacity="0.5"
        />
      ))}

      {/* Triggers */}
      {triggers.map(t => {
        const color = triggerColor(t.direction)
        const stemLen = Math.abs(t.direction) * STEM_MAX
        const stemY1 = t.direction > 0 ? cy - stemLen : cy
        const stemY2 = t.direction > 0 ? cy : cy + stemLen
        const isFired = firedIds.has(t.id)
        const glowR = isFired ? 12 : 0

        return (
          <g key={t.id} data-id={t.id}>
            {/* Glow on fire */}
            {isFired && (
              <circle
                cx={`${t.position * 100}%`} cy={cy}
                r={glowR}
                fill={color}
                opacity="0.3"
              />
            )}
            {/* Stem */}
            {stemLen > 0.5 && (
              <line
                x1={`${t.position * 100}%`} y1={stemY1}
                x2={`${t.position * 100}%`} y2={stemY2}
                stroke={color} strokeWidth={isFired ? 2 : 1.5}
                opacity={isFired ? 1 : 0.8}
              />
            )}
            {/* Dot */}
            <circle
              cx={`${t.position * 100}%`} cy={cy}
              r={TRIGGER_RADIUS}
              fill={color}
              opacity={isFired ? 1 : 0.85}
              style={{ filter: isFired ? `drop-shadow(0 0 4px ${color})` : 'none' }}
            />
            {/* Direction indicator tick */}
            <circle
              cx={`${t.position * 100}%`} cy={cy}
              r={TRIGGER_RADIUS - 2}
              fill="none"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="1"
            />
          </g>
        )
      })}

      {/* Playhead */}
      <line
        x1={playX} y1="0"
        x2={playX} y2={BAR_HEIGHT}
        stroke="var(--accent)"
        strokeWidth="1.5"
        opacity="0.9"
        style={{ filter: 'drop-shadow(0 0 3px var(--accent))' }}
      />
    </svg>
  )
}
