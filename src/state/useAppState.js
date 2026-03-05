import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { engine } from '../audio/engine.js'

const DEFAULT_LANE = () => ({
  id: uuidv4(),
  sourceType: 'noise',  // 'noise' | 'tone' | 'sample'
  frequency: 220,       // Hz (tone pitch or noise bandpass center)
  sampleUrl: null,
  sampleBuffer: null,
  volume: 0.8,
  triggers: [],
})

const INITIAL_LANES = [
  DEFAULT_LANE(),
  DEFAULT_LANE(),
  DEFAULT_LANE(),
  DEFAULT_LANE(),
]

const VELOCITY_ORDER = ['high', 'med', 'low']

export function useAppState() {
  const [bpm, setBpmState] = useState(120)
  const [playing, setPlaying] = useState(false)
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [lanes, setLanes] = useState(INITIAL_LANES)

  // Register lanes with engine on init
  useState(() => {
    INITIAL_LANES.forEach(l => engine.addLane(l.id))
    engine.onPlayhead(pos => setPlayheadPosition(pos))
  })

  const setBpm = useCallback((val) => {
    setBpmState(val)
    engine.setBpm(val)
  }, [])

  const togglePlay = useCallback(async (currentLanes) => {
    if (playing) {
      engine.stop()
      setPlaying(false)
      setPlayheadPosition(0)
    } else {
      await engine.start(currentLanes)
      setPlaying(true)
    }
  }, [playing])

  // Lane mutations
  const updateLaneSample = useCallback((laneId, buffer, url) => {
    setLanes(prev => prev.map(l => {
      if (l.id !== laneId) return l
      return { ...l, sourceType: 'sample', sampleUrl: url, sampleBuffer: buffer }
    }))
    engine.setLaneBuffer(laneId, buffer)
  }, [])

  const updateLaneSourceType = useCallback((laneId, type) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, sourceType: type } : l
    ))
    engine.setLaneSourceType(laneId, type)
  }, [])

  const updateLaneFrequency = useCallback((laneId, hz) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, frequency: hz } : l
    ))
    engine.setLaneFrequency(laneId, hz)
  }, [])

  const updateLaneVolume = useCallback((laneId, vol) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, volume: vol } : l
    ))
    engine.setLaneVolume(laneId, vol)
  }, [])

  // Sync engine scheduling whenever lanes change while playing
  useEffect(() => {
    engine.rescheduleTriggers(lanes)
  }, [lanes])

  // Trigger mutations
  const addTrigger = useCallback((laneId, position) => {
    const newTrigger = {
      id: uuidv4(),
      position,
      direction: 0,
      velocity: 'high',
    }
    setLanes(prev => prev.map(l =>
      l.id === laneId
        ? { ...l, triggers: [...l.triggers, newTrigger] }
        : l
    ))
    return newTrigger.id
  }, [])

  const updateTrigger = useCallback((laneId, triggerId, updates) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId
        ? {
            ...l,
            triggers: l.triggers.map(t =>
              t.id === triggerId ? { ...t, ...updates } : t
            ),
          }
        : l
    ))
  }, [])

  const cycleVelocity = useCallback((laneId, triggerId) => {
    setLanes(prev => prev.map(l => {
      if (l.id !== laneId) return l
      return {
        ...l,
        triggers: l.triggers.map(t => {
          if (t.id !== triggerId) return t
          const idx = VELOCITY_ORDER.indexOf(t.velocity ?? 'high')
          const next = VELOCITY_ORDER[(idx + 1) % VELOCITY_ORDER.length]
          return { ...t, velocity: next }
        }),
      }
    }))
  }, [])

  const deleteTrigger = useCallback((laneId, triggerId) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId
        ? { ...l, triggers: l.triggers.filter(t => t.id !== triggerId) }
        : l
    ))
  }, [])

  return {
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
  }
}
