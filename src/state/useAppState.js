import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { engine } from '../audio/engine.js'

const DEFAULT_LANE = () => ({
  id: uuidv4(),
  sampleUrl: null,
  sampleBuffer: null,
  volume: 0.8,
  filter: {
    resonance: 1.0,
    baseCutoff: 80,
  },
  triggers: [],
})

const INITIAL_LANES = [
  DEFAULT_LANE(),
  DEFAULT_LANE(),
  DEFAULT_LANE(),
  DEFAULT_LANE(),
]

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
      return { ...l, sampleUrl: url, sampleBuffer: buffer }
    }))
    engine.setLaneBuffer(laneId, buffer)
  }, [])

  const updateLaneVolume = useCallback((laneId, vol) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, volume: vol } : l
    ))
    engine.setLaneVolume(laneId, vol)
  }, [])

  const updateLaneResonance = useCallback((laneId, q) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, filter: { ...l.filter, resonance: q } } : l
    ))
    engine.setLaneResonance(laneId, q)
  }, [])

  const updateLaneBaseCutoff = useCallback((laneId, hz) => {
    setLanes(prev => prev.map(l =>
      l.id === laneId ? { ...l, filter: { ...l.filter, baseCutoff: hz } } : l
    ))
    engine.setLaneBaseCutoff(laneId, hz)
  }, [])

  // Trigger mutations
  const addTrigger = useCallback((laneId, position) => {
    const newTrigger = {
      id: uuidv4(),
      position,
      direction: 0,
    }
    setLanes(prev => {
      const next = prev.map(l =>
        l.id === laneId
          ? { ...l, triggers: [...l.triggers, newTrigger] }
          : l
      )
      engine.rescheduleTriggers(next)
      return next
    })
    return newTrigger.id
  }, [])

  const updateTrigger = useCallback((laneId, triggerId, updates) => {
    setLanes(prev => {
      const next = prev.map(l =>
        l.id === laneId
          ? {
              ...l,
              triggers: l.triggers.map(t =>
                t.id === triggerId ? { ...t, ...updates } : t
              ),
            }
          : l
      )
      engine.rescheduleTriggers(next)
      return next
    })
  }, [])

  const deleteTrigger = useCallback((laneId, triggerId) => {
    setLanes(prev => {
      const next = prev.map(l =>
        l.id === laneId
          ? { ...l, triggers: l.triggers.filter(t => t.id !== triggerId) }
          : l
      )
      engine.rescheduleTriggers(next)
      return next
    })
  }, [])

  return {
    bpm,
    setBpm,
    playing,
    togglePlay,
    playheadPosition,
    lanes,
    updateLaneSample,
    updateLaneVolume,
    updateLaneResonance,
    updateLaneBaseCutoff,
    addTrigger,
    updateTrigger,
    deleteTrigger,
  }
}
