import { useCallback, useRef } from 'react'
import { getContext } from 'tone'
import { Knob } from './Knob.jsx'
import { TriggerBar } from './TriggerBar.jsx'

export function Lane({
  lane,
  laneIndex,
  playheadPosition,
  onSampleUpload,
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
    ? lane.sampleUrl.split('/').pop()?.substring(0, 16) || 'sample'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Lane label */}
        <span style={{
          fontSize: '10px',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          minWidth: '44px',
        }}>
          Lane {laneIndex + 1}
        </span>

        {/* Upload */}
        <button
          className={`upload-btn ${lane.sampleUrl ? 'has-sample' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          {sampleName || 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Knobs */}
        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
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
