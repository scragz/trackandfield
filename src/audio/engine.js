import * as Tone from 'tone'

// Derive trigger envelope params from direction (-1 snappy → 0 neutral/ping → +1 swell)
// Neutral (direction=0) is an LPG-style ping: fast attack, short-ish decay.
// Up (+1) builds into a long swell. Down (-1) is super snappy.
export function getTriggerShape(direction) {
  const t = (direction + 1) / 2 // 0.0 (snappy) → 1.0 (swell)

  // Exponential interpolation keeps neutral feeling like a ping, not a blob
  // attack: ~5ms (snappy) → ~55ms (neutral) → 600ms (full swell)
  const attack = 0.005 * Math.pow(120, t)
  // decay:  ~60ms (snappy) → ~200ms (neutral) → 700ms (full swell)
  const decay = 0.06 * Math.pow(11.67, t)
  // peak cutoff: 8kHz (snappy) → 10kHz (neutral) → 12kHz (swell)
  const peak = lerp(8000, 12000, t)

  return { attack, decay, peak }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

const VELOCITY_GAIN = { high: 1.0, med: 0.5, low: 0.2 }

// Per-lane audio nodes
class LaneAudio {
  constructor(destination) {
    this.gateGain = new Tone.Gain(0)  // amplitude gate, starts silent
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 80,
      Q: 1,
    })
    this.gain = new Tone.Gain(0.8)
    this.gateGain.connect(this.filter)
    this.filter.connect(this.gain)
    this.gain.connect(destination)

    this.source = null
    this.buffer = null
    this.sourceType = 'noise'   // 'noise' | 'tone' | 'sample'
    this.noiseType = 'white'    // 'white' | 'pink' | 'brown'
    this.toneFrequency = 110    // Hz
    this.toneWaveform = 'sine'  // sine | triangle | sawtooth | square
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

  setFilterType(type) {
    this.filter.type = type
  }

  setNoiseType(type) {
    this.noiseType = type
  }

  startSource(loopEnd) {
    this.stopSource()

    if (this.sourceType === 'sample' && this.buffer) {
      this.source = new Tone.Player(this.buffer)
      this.source.loop = true
      this.source.loopEnd = Math.min(this.buffer.duration, loopEnd)
      this.source.connect(this.gateGain)
      this.source.sync().start(0)
    } else if (this.sourceType === 'tone') {
      this.source = new Tone.Oscillator(this.toneFrequency, this.toneWaveform)
      this.source.connect(this.gateGain)
      this.source.start()
    } else {
      // noise
      this.source = new Tone.Noise(this.noiseType || 'white')
      this.source.connect(this.gateGain)
      this.source.start()
    }
  }

  stopSource() {
    if (this.source) {
      try { this.source.unsync() } catch (_) {}
      try { this.source.stop() } catch (_) {}
      this.source.disconnect()
      this.source = null
    }
  }

  fireTrigger(time, direction, baseCutoff, velocity = 'high') {
    const { attack, decay, peak } = getTriggerShape(direction)
    const base = baseCutoff || this.baseCutoff || 80
    const now = Tone.now()
    const gainPeak = VELOCITY_GAIN[velocity] ?? 1.0

    // Cancel from context start to clear accumulated events from previous loop
    // iterations, then anchor current resting values at "now"
    const freq = this.filter.frequency
    freq.cancelScheduledValues(0)
    freq.setValueAtTime(base, now)
    freq.setValueAtTime(base, time)
    freq.linearRampToValueAtTime(peak, time + attack)
    freq.linearRampToValueAtTime(base, time + attack + decay)

    // Amplitude envelope: gate opens with trigger, closes after decay
    const g = this.gateGain.gain
    g.cancelScheduledValues(0)
    g.setValueAtTime(0, now)
    g.setValueAtTime(0, time)
    g.linearRampToValueAtTime(gainPeak, time + attack)
    g.linearRampToValueAtTime(0, time + attack + decay)
  }

  resetCutoff(baseCutoff) {
    const base = baseCutoff || this.baseCutoff || 80
    this.filter.frequency.rampTo(base, 0.1)
    this.gateGain.gain.rampTo(0, 0.1)
  }

  dispose() {
    this.stopSource()
    this.gateGain.dispose()
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
      lane.sourceType = 'sample'
      if (this.playing) {
        lane.startSource(this.barLength)
      }
    }
  }

  setLaneSourceType(id, type) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.sourceType = type
      if (this.playing) {
        lane.startSource(this.barLength)
      }
    }
  }

  setLaneNoiseType(id, type) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.noiseType = type
      if (this.playing && lane.sourceType === 'noise') {
        lane.startSource(this.barLength)
      }
    }
  }

  setLaneToneFrequency(id, hz) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.toneFrequency = hz
      if (this.playing && lane.sourceType === 'tone' && lane.source) {
        lane.source.frequency.rampTo(hz, 0.05)
      }
    }
  }

  setLaneToneWaveform(id, waveform) {
    const lane = this.lanes.get(id)
    if (lane) {
      lane.toneWaveform = waveform
      if (this.playing && lane.sourceType === 'tone' && lane.source) {
        lane.source.type = waveform
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

  setLaneFilterType(id, type) {
    this.lanes.get(id)?.setFilterType(type)
  }

  // Schedule all triggers for the lanes
  _scheduleTriggers(lanesData) {
    this._clearScheduled()

    const transport = Tone.getTransport()

    lanesData.forEach(lane => {
      const laneAudio = this.lanes.get(lane.id)
      if (!laneAudio) return

      lane.triggers.forEach(trigger => {
        const triggerTime = trigger.position * this.barLength
        const eventId = transport.schedule((time) => {
          laneAudio.fireTrigger(
            time,
            trigger.direction,
            lane.filter.baseCutoff,
            trigger.velocity ?? 'high'
          )
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

    this.lanes.forEach((laneAudio) => {
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
