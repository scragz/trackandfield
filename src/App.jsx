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
    updateLaneToneFrequency,
    updateLaneToneWaveform,
    updateLaneVolume,
    updateLaneResonance,
    updateLaneBaseCutoff,
    addTrigger,
    updateTrigger,
    deleteTrigger,
  } = useAppState()

  // Pass current lanes snapshot to togglePlay
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
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '14px 24px',
        borderBottom: '3px solid var(--accent)',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 0 var(--accent-dim)',
      }}>
        <h1 style={{
          fontSize: '11px',
          fontWeight: '400',
          letterSpacing: '0.05em',
          color: 'var(--accent)',
          margin: 0,
          flexShrink: 0,
          fontFamily: "'Press Start 2P', monospace",
          textShadow: '2px 2px 0 var(--accent-dim)',
        }}>
          Track and Field
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            BPM
          </span>
          <Knob
            label=""
            min={60} max={180}
            value={bpm}
            onChange={setBpm}
            decimals={0}
          />
          <span style={{ fontSize: '12px', color: 'var(--text)', minWidth: '30px' }}>
            {Math.round(bpm)}
          </span>
        </div>

        <button
          onClick={handleTogglePlay}
          style={{
            marginLeft: 'auto',
            background: playing ? 'var(--accent)' : 'var(--surface)',
            border: `2px solid ${playing ? 'var(--accent)' : 'var(--border)'}`,
            color: playing ? 'var(--bg)' : 'var(--text)',
            borderRadius: '0',
            padding: '6px 16px',
            fontSize: '9px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', monospace",
            transition: 'all 0.1s',
            boxShadow: playing ? '3px 3px 0 var(--accent-dim)' : '3px 3px 0 #000',
            imageRendering: 'pixelated',
          }}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </header>

      {/* Instructions */}
      <div style={{
        padding: '6px 24px',
        fontSize: '10px',
        color: 'var(--text-dim)',
        letterSpacing: '0.06em',
        borderBottom: '2px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
      }}>
        <span>Tap bar → place trigger</span>
        <span>Drag up/down → ping / swell</span>
        <span>Drag left/right → reposition</span>
        <span>Long-press → delete</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>Each lane plays noise or a sample through a filter · triggers sweep the cutoff</span>
      </div>

      {/* Lanes */}
      <main style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {lanes.map((lane, i) => (
          <Lane
            key={lane.id}
            lane={lane}
            laneIndex={i}
            playheadPosition={playheadPosition}
            onSampleUpload={updateLaneSample}
            onSourceTypeChange={updateLaneSourceType}
            onToneFrequencyChange={updateLaneToneFrequency}
            onToneWaveformChange={updateLaneToneWaveform}
            onVolumeChange={updateLaneVolume}
            onResonanceChange={updateLaneResonance}
            onBaseCutoffChange={updateLaneBaseCutoff}
            onAddTrigger={handleAddTrigger}
            onUpdateTrigger={updateTrigger}
            onDeleteTrigger={deleteTrigger}
          />
        ))}
      </main>

      <footer style={{
        padding: '8px 24px',
        borderTop: '3px solid var(--border)',
        fontSize: '9px',
        color: 'var(--accent-dim)',
        letterSpacing: '0.08em',
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        background: 'var(--surface)',
      }}>
        Track &amp; Field · filter-sequencer
      </footer>
    </div>
  )
}
