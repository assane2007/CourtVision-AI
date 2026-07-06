/**
 * Haptic feedback utility for CourtVision AI.
 *
 * Uses `navigator.vibrate()` on Android devices.
 * Falls back to a subtle audio click via Web Audio API on iOS / unsupported devices.
 * No-ops when neither is available.
 *
 * All functions are safe to call from anywhere (server-side returns are no-ops).
 */

// ─── Reduced-motion check ─────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ─── Vibration API (Android, some desktop browsers) ────────────────────────────

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

function vibrate(pattern: number | number[]): void {
  if (!canVibrate()) return
  try {
    ;(navigator as Navigator & { vibrate(pattern: number | number[]): boolean }).vibrate(pattern)
  } catch {
    // Silently fail
  }
}

// ─── Audio fallback (iOS) ──────────────────────────────────────────────────────

let _clickCtx: AudioContext | null = null

function getClickCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_clickCtx) {
    try {
      _clickCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return _clickCtx
}

/** Play a very short click tone as haptic feedback fallback. */
function playClick(freq: number, duration: number, volume: number): void {
  if (prefersReducedMotion()) return
  const ctx = getClickCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume()
    return
  }
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + duration + 0.01)
  } catch {
    // Silently fail — audio is non-critical
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Light tap — button presses, toggles */
export function hapticLight(): void {
  if (prefersReducedMotion()) return
  // Try vibration first (Android)
  if (canVibrate()) {
    vibrate(10)
    return
  }
  // Audio fallback (iOS)
  playClick(1200, 0.05, 0.15)
}

/** Medium impact — card selections, rep completed */
export function hapticMedium(): void {
  if (prefersReducedMotion()) return
  if (canVibrate()) {
    vibrate(20)
    return
  }
  playClick(900, 0.08, 0.2)
}

/** Heavy impact — achievement unlocked, workout complete */
export function hapticHeavy(): void {
  if (prefersReducedMotion()) return
  if (canVibrate()) {
    vibrate([30, 20, 30])
    return
  }
  // Double-tone for heavy
  playClick(600, 0.12, 0.3)
  setTimeout(() => playClick(800, 0.1, 0.25), 80)
}

/** Success pattern — notification */
export function hapticSuccess(): void {
  if (prefersReducedMotion()) return
  if (canVibrate()) {
    vibrate([15, 50, 15, 50, 40])
    return
  }
  playClick(1000, 0.06, 0.2)
  setTimeout(() => playClick(1200, 0.06, 0.2), 100)
  setTimeout(() => playClick(1500, 0.1, 0.25), 200)
}

/** Clean up AudioContext to prevent memory leak */
export function destroyHaptics(): void {
  if (_clickCtx) {
    try { _clickCtx.close() } catch { /* already closed */ }
    _clickCtx = null
  }
}