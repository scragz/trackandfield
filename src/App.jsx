import { useCallback, useRef } from 'react'
import { useAppState } from './state/useAppState.js'
import { Lane } from './components/Lane.jsx'
import { Knob } from './components/Knob.jsx'

export default function App() {
  const {
    bpm,
    setBpm,
    playing,
    togglePlay,
    playheadPosition,
    lanes,
    updateLaneSample,
    updateLaneSourceType,
    updateLaneFrequency,
    updateLaneVolume,
    addTrigger,
    updateTrigger,
    cycleVelocity,
    deleteTrigger,
  } = useAppState()

  const lanesRef = useRef(lanes)
  lanesRef.current = lanes

  const handleTogglePlay = useCallback(() => {
    togglePlay(lanesRef.current)
  }, [togglePlay])

  const handleAddTrigger = useCallback((laneId, position) => {
    return addTrigger(laneId, position)
  }, [addTrigger])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header / HUD ── */}
      <header style={{
        background: 'var(--hud-bg)',
        borderBottom: '3px solid var(--accent)',
        boxShadow: '0 3px 0 var(--accent-dim)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Main header row — logo + controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
        }}>
          {/* T&F Logo */}
          <span style={{
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#EE4444',
            textShadow: '1px 1px 0 #770000',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>T&amp;F</span>

          {/* BPM knob */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <Knob
              label="BPM"
              min={60} max={300}
              value={bpm}
              onChange={setBpm}
              decimals={0}
            />
            <span style={{ fontSize: '10px', color: 'var(--accent)', minWidth: '28px', fontFamily: "'Press Start 2P', monospace" }}>
              {Math.round(bpm)}
            </span>
          </div>

          {/* Play/Stop */}
          <button
            onClick={handleTogglePlay}
            style={{
              background: playing ? 'var(--accent)' : 'transparent',
              border: `2px solid ${playing ? 'var(--accent)' : 'var(--border)'}`,
              color: playing ? 'var(--hud-bg)' : 'var(--text)',
              padding: '6px 12px',
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              transition: 'all 0.1s',
              boxShadow: playing ? '3px 3px 0 var(--accent-dim)' : '3px 3px 0 #000',
              flexShrink: 0,
            }}
          >
            {playing ? '■ Stop' : '▶ Play'}
          </button>
        </div>
      </header>

      {/* Lanes */}
      <main style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {lanes.map((lane) => (
          <Lane
            key={lane.id}
            lane={lane}
            playheadPosition={playheadPosition}
            onSampleUpload={updateLaneSample}
            onSourceTypeChange={updateLaneSourceType}
            onFrequencyChange={updateLaneFrequency}
            onVolumeChange={updateLaneVolume}
            onAddTrigger={handleAddTrigger}
            onUpdateTrigger={updateTrigger}
            onDeleteTrigger={deleteTrigger}
            onCycleVelocity={cycleVelocity}
          />
        ))}
      </main>

      <footer style={{
        padding: '6px 16px',
        borderTop: '2px solid rgba(255,255,255,0.2)',
        fontSize: '8px',
        color: 'var(--accent-dim)',
        letterSpacing: '0.08em',
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        background: 'var(--hud-bg)',
      }}>
        TM &amp; © KONAMI · FILTER SEQUENCER
      </footer>
    </div>
  )
}
