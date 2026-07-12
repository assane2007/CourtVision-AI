/**
 * Web Audio API utility for programmatic sound generation.
 * No external audio files needed — all tones generated in real-time.
 *
 * Used by camera-workout screen for workout timing cues.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SoundType =
  | 'countdown-tick'   // Low pitch beep (3-2-1)
  | 'countdown-go'     // High pitch "GO!" beep
  | 'rep-ding'         // Short satisfying ding (rep completed)
  | 'half-warning'     // Medium beep (50% through workout)
  | 'time-up'          // Double high beep (workout finished)
  | 'rest-pulse'       // Slow pulse tone (rest period)

interface AudioEngine {
  ctx: AudioContext
  masterGain: GainNode
  muted: boolean
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _engine: AudioEngine | null = null

function getEngine(): AudioEngine {
  if (_engine) return _engine

  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.6
  masterGain.connect(ctx.destination)

  _engine = { ctx, masterGain, muted: true } // OFF by default
  return _engine
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Initialize audio engine (call on first user interaction). */
export function initAudio(): void {
  getEngine()
}

/** Check if audio is muted. */
export function isAudioMuted(): boolean {
  return getEngine().muted
}

/** Toggle mute state. Returns new muted state. */
export function toggleMute(): boolean {
  const engine = getEngine()
  engine.muted = !engine.muted
  // Resume context if it was suspended (autoplay policy)
  if (!engine.muted && engine.ctx.state === 'suspended') {
    engine.ctx.resume()
  }
  return engine.muted
}

/** Set mute state explicitly. */
export function setMuted(muted: boolean): void {
  const engine = getEngine()
  engine.muted = muted
  if (!muted && engine.ctx.state === 'suspended') {
    engine.ctx.resume()
  }
}

/** Play a sound. No-op if muted or AudioContext unavailable. */
export function playSound(type: SoundType): void {
  const engine = _engine
  if (!engine || engine.muted) return

  // Resume context if suspended
  if (engine.ctx.state === 'suspended') {
    engine.ctx.resume()
    return
  }

  try {
    switch (type) {
      case 'countdown-tick':
        playBeep(engine, 440, 0.12, 'sine', 0.5)
        break
      case 'countdown-go':
        playBeep(engine, 880, 0.25, 'sine', 0.7)
        // Double beep for emphasis
        setTimeout(() => playBeep(engine, 1100, 0.2, 'sine', 0.5), 120)
        break
      case 'rep-ding':
        playDing(engine)
        break
      case 'half-warning': playBeep(engine, 660, 0.15,'triangle', 0.5)
        break
      case 'time-up': playBeep(engine, 880, 0.15,'sine', 0.6)
        setTimeout(() => playBeep(engine, 1047, 0.25, 'sine', 0.7), 200)
        break
      case 'rest-pulse':
        playPulse(engine)
        break
    }
  } catch {
    // Silently fail — audio is non-critical
  }
}

/** Cleanup audio resources (call on unmount). */
export function destroyAudio(): void {
  if (_engine) {
    try {
      _engine.ctx.close()
    } catch {
      // Ignore
    }
    _engine = null
  }
}

// ─── Internal Tone Generators ────────────────────────────────────────────────

function playBeep(
  engine: AudioEngine,
  freq: number,
  duration: number,
  waveform: OscillatorType,
  volume: number,
): void {
  const { ctx, masterGain } = engine
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = waveform
  osc.frequency.setValueAtTime(freq, now)

  // Smooth envelope: quick attack, smooth release
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(now)
  osc.stop(now + duration + 0.05)
}

function playDing(engine: AudioEngine): void {
  const { ctx, masterGain } = engine
  const now = ctx.currentTime

  // Two-tone ding for a pleasant "completed" sound
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(1200, now)

  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1500, now + 0.06)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.4, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(masterGain)

  osc1.start(now)
  osc1.stop(now + 0.1)
  osc2.start(now + 0.06)
  osc2.stop(now + 0.25)
}

function playPulse(engine: AudioEngine): void {
  const { ctx, masterGain } = engine
  const now = ctx.currentTime

  // Slow pulse: fade in, sustain briefly, fade out
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(330, now)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.25, now + 0.2)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.6)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(now)
  osc.stop(now + 0.85)
}