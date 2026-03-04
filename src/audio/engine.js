import * as Tone from 'tone'

// Derive trigger envelope params from direction (-1 swell → +1 ping)
export function getTriggerShape(direction) {
  // direction: -1.0 (swell) to +1.0 (ping)
  const t = (direction + 1) / 2 // 0.0 to 1.0

  const attack = lerp(0.6, 0.01, t)       // swell=600ms, ping=10ms
  const decay  = lerp(0.8, 0.08, t)       // swell=800ms, ping=80ms
  const peak   = lerp(6000, 12000, t)     // swell=6kHz, ping=12kHz

  return { attack, decay, peak }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// Per-lane audio nodes
class LaneAudio {
  constructor(destination) {
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 80,
      Q: 1,
    })
    this.gain = new Tone.Gain(0.8)
    this.filter.connect(this.gain)
    this.gain.connect(destination)

    this.source = null
    this.buffer = null
  }

  setBuffer(audioBuffer) {
    this.buffer = audioBuffer
  }

  setVolume(v) {
    this.gain.gain.rampTo(v, 0.05)
  }

  setResonance(q) {
    this.filter.Q.value = q
  }

  setBaseCutoff(hz) {
    this.baseCutoff = hz
  }

  startSource(loopEnd) {
    this.stopSource()
    if (!this.buffer) return

    this.source = new Tone.Player(this.buffer)
    this.source.loop = true
    this.source.loopEnd = Math.min(this.buffer.duration, loopEnd)
    this.source.connect(this.filter)
    this.source.sync().start(0)
  }

  stopSource() {
    if (this.source) {
      try { this.source.unsync() } catch (_) {}
      try { this.source.stop() } catch (_) {}
      this.source.disconnect()
      this.source = null
    }
  }

  fireTrigger(time, direction, baseCutoff) {
    const { attack, decay, peak } = getTriggerShape(direction)
    const base = baseCutoff || this.baseCutoff || 80

    const freq = this.filter.frequency
    freq.cancelScheduledValues(time)
    freq.setValueAtTime(base, time)
    freq.linearRampToValueAtTime(peak, time + attack)
    freq.linearRampToValueAtTime(base, time + attack + decay)
  }

  resetCutoff(baseCutoff) {
    const base = baseCutoff || this.baseCutoff || 80
    this.filter.frequency.rampTo(base, 0.1)
  }

  dispose() {
    this.stopSource()
    this.filter.dispose()
    this.gain.dispose()
  }
}

// Main audio engine
class AudioEngine {
  constructor() {
    this.master = new Tone.Gain(0.9)
    this.master.toDestination()
    this.lanes = new Map() // laneId → LaneAudio
    this.scheduledEvents = []
    this.bpm = 120
    this.barLength = this._calcBarLength(120)
    this.playing = false
    this._onPlayhead = null
    this._rafId = null
  }

  _calcBarLength(bpm) {
    // 4 bars × 4 beats
    return (60 / bpm) * 4 * 4
  }

  setBpm(bpm) {
    this.bpm = bpm
    this.barLength = this._calcBarLength(bpm)
    Tone.getTransport().bpm.value = bpm
  }

  addLane(id) {
    if (!this.lanes.has(id)) {
      this.lanes.set(id, new LaneAudio(this.master))
    }
  }

  removeLane(id) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.dispose()
      this.lanes.delete(id)
    }
  }

  getLane(id) {
    return this.lanes.get(id)
  }

  setLaneBuffer(id, audioBuffer) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.setBuffer(audioBuffer)
      if (this.playing) {
        lane.startSource(this.barLength)
      }
    }
  }

  setLaneVolume(id, v) {
    this.lanes.get(id)?.setVolume(v)
  }

  setLaneResonance(id, q) {
    this.lanes.get(id)?.setResonance(q)
  }

  setLaneBaseCutoff(id, hz) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.baseCutoff = hz
      if (!this.playing) {
        lane.filter.frequency.value = hz
      }
    }
  }

  // Schedule all triggers for the lanes
  _scheduleTriggers(lanesData) {
    // Clear old events
    this._clearScheduled()

    const transport = Tone.getTransport()

    lanesData.forEach(lane => {
      const laneAudio = this.lanes.get(lane.id)
      if (!laneAudio) return

      lane.triggers.forEach(trigger => {
        const triggerTime = trigger.position * this.barLength
        const eventId = transport.schedule((time) => {
          laneAudio.fireTrigger(time, trigger.direction, lane.filter.baseCutoff)
        }, triggerTime)
        this.scheduledEvents.push(eventId)
      })
    })
  }

  _clearScheduled() {
    const transport = Tone.getTransport()
    this.scheduledEvents.forEach(id => {
      try { transport.clear(id) } catch (_) {}
    })
    this.scheduledEvents = []
  }

  async start(lanesData) {
    await Tone.start()
    const transport = Tone.getTransport()

    transport.bpm.value = this.bpm
    transport.loop = true
    transport.loopStart = 0
    transport.loopEnd = this.barLength

    // Start sources
    this.lanes.forEach((laneAudio, id) => {
      laneAudio.startSource(this.barLength)
    })

    this._scheduleTriggers(lanesData)
    transport.start()
    this.playing = true
    this._startPlayheadRaf()
  }

  stop() {
    const transport = Tone.getTransport()
    transport.stop()
    this._clearScheduled()

    this.lanes.forEach(laneAudio => {
      laneAudio.stopSource()
      laneAudio.resetCutoff()
    })

    this.playing = false
    this._stopPlayheadRaf()
  }

  // Reschedule triggers without stopping playback
  rescheduleTriggers(lanesData) {
    if (!this.playing) return
    this._scheduleTriggers(lanesData)
  }

  onPlayhead(cb) {
    this._onPlayhead = cb
  }

  _startPlayheadRaf() {
    const tick = () => {
      if (!this.playing) return
      const transport = Tone.getTransport()
      const pos = transport.seconds % this.barLength
      const normalized = pos / this.barLength
      this._onPlayhead?.(normalized)
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  _stopPlayheadRaf() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this._onPlayhead?.(0)
  }
}

export const engine = new AudioEngine()
