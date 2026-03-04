import { useCallback, useRef } from 'react'
import { getContext } from 'tone'
import { Knob } from './Knob.jsx'
import { TriggerBar } from './TriggerBar.jsx'

const WAVEFORMS = [
  { id: 'sine',     label: 'sin' },
  { id: 'triangle', label: 'tri' },
  { id: 'sawtooth', label: 'saw' },
  { id: 'square',   label: 'sqr' },
]

export function Lane({
  lane,
  laneIndex,
  playheadPosition,
  onSampleUpload,
  onSourceTypeChange,
  onToneFrequencyChange,
  onToneWaveformChange,
  onVolumeChange,
  onResonanceChange,
  onBaseCutoffChange,
  onAddTrigger,
  onUpdateTrigger,
  onDeleteTrigger,
}) {
  const fileRef = useRef(null)

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const arrayBuffer = await file.arrayBuffer()

    const ctx = getContext().rawContext
    const decoded = await ctx.decodeAudioData(arrayBuffer)

    onSampleUpload(lane.id, decoded, url)
    e.target.value = ''
  }, [lane.id, onSampleUpload])

  const sampleName = lane.sampleUrl
    ? lane.sampleUrl.split('/').pop()?.substring(0, 14) || 'sample'
    : null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '10px 14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* Lane header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Lane label */}
        <span style={{
          fontSize: '10px',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          minWidth: '44px',
          flexShrink: 0,
        }}>
          Lane {laneIndex + 1}
        </span>

        {/* Source type selector */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button
            className={`source-pill ${lane.sourceType === 'noise' ? 'active' : ''}`}
            onClick={() => onSourceTypeChange(lane.id, 'noise')}
            title="White noise through the filter"
          >
            noise
          </button>
          <button
            className={`source-pill ${lane.sourceType === 'tone' ? 'active' : ''}`}
            onClick={() => onSourceTypeChange(lane.id, 'tone')}
            title="Oscillator — set frequency below"
          >
            tone
          </button>
          <button
            className={`source-pill ${lane.sourceType === 'sample' ? 'active' : ''}`}
            onClick={() => fileRef.current?.click()}
            title={sampleName ? 'Click to replace sample' : 'Upload a sample'}
          >
            {sampleName || '↑ sample'}
          </button>
        </div>

        {/* Waveform selector — only when tone */}
        {lane.sourceType === 'tone' && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            {WAVEFORMS.map(w => (
              <button
                key={w.id}
                className={`source-pill ${lane.toneWaveform === w.id ? 'active' : ''}`}
                onClick={() => onToneWaveformChange(lane.id, w.id)}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Knobs */}
        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
          {lane.sourceType === 'tone' && (
            <Knob
              label="Freq"
              min={20} max={2000}
              value={lane.toneFrequency}
              onChange={v => onToneFrequencyChange(lane.id, v)}
              decimals={0}
              unit="hz"
            />
          )}
          <Knob
            label="Vol"
            min={0} max={1}
            value={lane.volume}
            onChange={v => onVolumeChange(lane.id, v)}
            decimals={2}
          />
          <Knob
            label="Q"
            min={0.1} max={20}
            value={lane.filter.resonance}
            onChange={v => onResonanceChange(lane.id, v)}
            decimals={1}
          />
          <Knob
            label="Base"
            min={40} max={200}
            value={lane.filter.baseCutoff}
            onChange={v => onBaseCutoffChange(lane.id, v)}
            decimals={0}
            unit="hz"
          />
        </div>
      </div>

      {/* Trigger bar */}
      <TriggerBar
        laneId={lane.id}
        triggers={lane.triggers}
        playheadPosition={playheadPosition}
        onAdd={onAddTrigger}
        onUpdate={onUpdateTrigger}
        onDelete={onDeleteTrigger}
      />
    </div>
  )
}
