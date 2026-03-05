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

const NOISE_TYPES = [
  { id: 'white', label: 'wht' },
  { id: 'pink',  label: 'pnk' },
  { id: 'brown', label: 'brn' },
]

const FILTER_TYPES = [
  { id: 'lowpass',  label: 'LP',   title: 'Low-pass — lets lows through, sweeps up' },
  { id: 'highpass', label: 'HP',   title: 'High-pass — lets highs through, sweeps down' },
  { id: 'bandpass', label: 'BP',   title: 'Band-pass — narrow peak around cutoff' },
  { id: 'notch',    label: 'NT',   title: 'Notch — cuts a hole at the cutoff frequency' },
]

export function Lane({
  lane,
  laneIndex,
  playheadPosition,
  onSampleUpload,
  onSourceTypeChange,
  onNoiseTypeChange,
  onToneFrequencyChange,
  onToneWaveformChange,
  onFmIndexChange,
  onVolumeChange,
  onResonanceChange,
  onBaseCutoffChange,
  onFilterTypeChange,
  onAddTrigger,
  onUpdateTrigger,
  onDeleteTrigger,
  onCycleVelocity,
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

  const filterType = lane.filter?.type ?? 'lowpass'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '2px solid var(--border)',
      borderRadius: '0',
      padding: '8px 12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>

      {/* Row 1: label + source + sub-options / tone params */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Lane label */}
        <span style={{
          fontSize: '8px',
          color: 'var(--accent)',
          letterSpacing: '0.05em',
          minWidth: '28px',
          flexShrink: 0,
          fontFamily: "'Press Start 2P', monospace",
          textShadow: '1px 1px 0 var(--accent-dim)',
        }}>
          FM{laneIndex + 1}
        </span>

        {/* Source type selector */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button
            className={`source-pill ${lane.sourceType === 'noise' ? 'active' : ''}`}
            onClick={() => onSourceTypeChange(lane.id, 'noise')}
            title="Noise through the filter"
          >noise</button>
          <button
            className={`source-pill ${lane.sourceType === 'tone' ? 'active' : ''}`}
            onClick={() => onSourceTypeChange(lane.id, 'tone')}
            title="Oscillator"
          >tone</button>
          <button
            className={`source-pill ${lane.sourceType === 'sample' ? 'active' : ''}`}
            onClick={() => fileRef.current?.click()}
            title={sampleName ? 'Click to replace sample' : 'Upload a sample'}
          >{sampleName || '↑ smp'}</button>
        </div>

        {/* Noise type selector */}
        {lane.sourceType === 'noise' && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            {NOISE_TYPES.map(n => (
              <button
                key={n.id}
                className={`source-pill ${lane.noiseType === n.id ? 'active' : ''}`}
                onClick={() => onNoiseTypeChange(lane.id, n.id)}
                title={`${n.id} noise`}
              >{n.label}</button>
            ))}
          </div>
        )}

        {/* Tone: waveform + Freq + FM index knobs */}
        {lane.sourceType === 'tone' && (
          <>
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
              {WAVEFORMS.map(w => (
                <button
                  key={w.id}
                  className={`source-pill ${lane.toneWaveform === w.id ? 'active' : ''}`}
                  onClick={() => onToneWaveformChange(lane.id, w.id)}
                >{w.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <Knob
                label="Freq"
                min={20} max={2000}
                value={lane.toneFrequency}
                onChange={v => onToneFrequencyChange(lane.id, v)}
                decimals={0}
                unit="hz"
              />
              {lane.fmIndexes.map((val, i) => (
                <Knob
                  key={i}
                  label={`FM${i + 1}`}
                  min={0} max={500}
                  value={val}
                  onChange={v => onFmIndexChange(lane.id, i, v)}
                  decimals={0}
                  unit="hz"
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Row 2: filter type + Vol / Q / Cutoff */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Spacer pushes filter to align under source buttons */}
        <div style={{ minWidth: '28px', flexShrink: 0 }} />

        {/* Filter type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <span style={{ fontSize: '7px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>FILTER</span>
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTER_TYPES.map(f => (
              <button
                key={f.id}
                className={`source-pill ${filterType === f.id ? 'active' : ''}`}
                onClick={() => onFilterTypeChange(lane.id, f.id)}
                title={f.title}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Knobs: Vol, Q, Cutoff */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
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
            label="Cutoff"
            min={40} max={2000}
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
        onCycleVelocity={onCycleVelocity}
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
