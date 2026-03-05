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
    updateLaneNoiseType,
    updateLaneToneFrequency,
    updateLaneToneWaveform,
    updateLaneVolume,
    updateLaneResonance,
    updateLaneBaseCutoff,
    updateLaneFilterType,
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
        {/* Score bar — top strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          padding: '4px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
            <ScoreBlock label="BPM" value={Math.round(bpm).toString().padStart(3, '0')} />
            <ScoreBlock label="LANES" value={lanes.length.toString().padStart(2, '0')} />
            <ScoreBlock
              label="TRIGGERS"
              value={lanes.reduce((s, l) => s + l.triggers.length, 0).toString().padStart(2, '0')}
            />
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: playing ? '#00ffcc' : 'var(--text-dim)',
            letterSpacing: '0.1em',
            padding: '2px 8px',
            border: `1px solid ${playing ? '#00ffcc' : 'var(--text-dim)'}`,
            background: playing ? 'rgba(0,255,204,0.1)' : 'transparent',
            transition: 'all 0.15s',
          }}>
            {playing ? '● REC' : '○ STOP'}
          </div>
        </div>

        {/* Main header row — logo + controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '8px 16px',
        }}>
          {/* T&F Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0', flexShrink: 0, lineHeight: 1 }}>
            <span style={{
              fontSize: '36px',
              fontFamily: "'Press Start 2P', monospace",
              color: '#FF2222',
              textShadow: '3px 3px 0 #880000, -1px -1px 0 #FFE566',
              display: 'inline-block',
              transform: 'scaleX(0.85)',
              transformOrigin: 'left',
            }}>T</span>
            <span style={{
              fontSize: '13px',
              fontFamily: "'Press Start 2P', monospace",
              color: '#4499FF',
              textShadow: '2px 2px 0 #003399',
              letterSpacing: '-0.02em',
              marginBottom: '2px',
            }}>RACK</span>
            <span style={{
              fontSize: '26px',
              fontFamily: "'Press Start 2P', monospace",
              color: 'var(--accent)',
              textShadow: '2px 2px 0 var(--accent-dim)',
              margin: '0 4px',
            }}>&amp;</span>
            <span style={{
              fontSize: '13px',
              fontFamily: "'Press Start 2P', monospace",
              color: '#4499FF',
              textShadow: '2px 2px 0 #003399',
              letterSpacing: '-0.02em',
              marginBottom: '2px',
            }}>FIELD</span>
          </div>

          {/* BPM knob */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>
              BPM
            </span>
            <Knob
              label=""
              min={60} max={180}
              value={bpm}
              onChange={setBpm}
              decimals={0}
            />
            <span style={{ fontSize: '11px', color: 'var(--accent)', minWidth: '34px', fontFamily: "'Press Start 2P', monospace" }}>
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
              padding: '6px 14px',
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              transition: 'all 0.1s',
              boxShadow: playing ? '3px 3px 0 var(--accent-dim)' : '3px 3px 0 #000',
            }}
          >
            {playing ? '■ Stop' : '▶ Play'}
          </button>
        </div>
      </header>

      {/* Instructions */}
      <div style={{
        padding: '5px 16px',
        fontSize: '9px',
        color: 'var(--text-dim)',
        letterSpacing: '0.05em',
        borderBottom: '2px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span>tap bar → place trigger</span>
        <span>drag ↑↓ → swell / snappy</span>
        <span>drag ←→ → reposition</span>
        <span>tap trigger → cycle velocity ●◦·</span>
        <span>right-click / long-press → delete</span>
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>filter sweeps on trigger</span>
      </div>

      {/* Lanes */}
      <main style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {lanes.map((lane, i) => (
          <Lane
            key={lane.id}
            lane={lane}
            laneIndex={i}
            playheadPosition={playheadPosition}
            onSampleUpload={updateLaneSample}
            onSourceTypeChange={updateLaneSourceType}
            onNoiseTypeChange={updateLaneNoiseType}
            onToneFrequencyChange={updateLaneToneFrequency}
            onToneWaveformChange={updateLaneToneWaveform}
            onVolumeChange={updateLaneVolume}
            onResonanceChange={updateLaneResonance}
            onBaseCutoffChange={updateLaneBaseCutoff}
            onFilterTypeChange={updateLaneFilterType}
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

function ScoreBlock({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
      <span style={{
        fontSize: '7px',
        fontFamily: "'Press Start 2P', monospace",
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
      }}>{label}</span>
      <span style={{
        fontSize: '13px',
        fontFamily: "'Press Start 2P', monospace",
        color: 'var(--accent)',
        letterSpacing: '0.05em',
        textShadow: '1px 1px 0 var(--accent-dim)',
      }}>{value}</span>
    </div>
  )
}
