import { useRef, useCallback } from 'react'
import { midiToHz } from '../dsp/notes'

// Additive synthesis: fundamental + 3 harmonics (matches piano-like timbre)
const HARMONICS_REAL = new Float32Array([0, 0, 0, 0, 0])
const HARMONICS_IMAG = new Float32Array([0, 0.6, 0.3, 0.15, 0.1])

// Equal-loudness compensation (simplified approximation of Fletcher-Munson curves)
// Reference: 440 Hz (A4) = multiplier 1.0
// Lower frequencies get boosted, higher get slightly reduced
function loudnessCompensation(hz: number): number {
  const refHz = 440
  const compensation = Math.pow(refHz / hz, 0.25)
  return Math.max(0.5, Math.min(2.0, compensation))
}

export function useOscillator() {
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const activeOscillatorsRef = useRef<OscillatorNode[]>([])

  const play = useCallback((midi: number) => {
    if (oscRef.current) {
      oscRef.current.stop()
      oscRef.current = null
    }

    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    const hz = midiToHz(midi)
    const wave = ctx.createPeriodicWave(HARMONICS_REAL, HARMONICS_IMAG)
    osc.setPeriodicWave(wave)
    osc.frequency.value = hz

    // Envelope: 10ms attack, exponential decay (time constant ~0.33s)
    // Apply loudness compensation for perceptually even volume
    const compensatedGain = 0.5 * loudnessCompensation(hz)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(compensatedGain, now + 0.01)
    gain.gain.setTargetAtTime(0, now + 0.01, 0.33)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 1.5)

    oscRef.current = osc
  }, [])

  const playNote = useCallback((midi: number, durationSec: number) => {
    // Don't stop previous oscillator - allow notes to play their full duration
    // Each note gets its own oscillator for proper polyphony

    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current

    // Resume if suspended (required for autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    const hz = midiToHz(midi)
    const wave = ctx.createPeriodicWave(HARMONICS_REAL, HARMONICS_IMAG)
    osc.setPeriodicWave(wave)
    osc.frequency.value = hz

    // Flat envelope with loudness compensation for perceptually even volume
    const compensatedGain = 0.5 * loudnessCompensation(hz)
    gain.gain.setValueAtTime(compensatedGain, now)
    gain.gain.setValueAtTime(compensatedGain, now + durationSec - 0.01)
    gain.gain.linearRampToValueAtTime(0, now + durationSec)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + durationSec + 0.01)

    // Track this oscillator
    activeOscillatorsRef.current.push(osc)

    // Clean up when it ends naturally
    osc.onended = () => {
      activeOscillatorsRef.current = activeOscillatorsRef.current.filter(o => o !== osc)
    }
  }, [])

  const stopAll = useCallback(() => {
    activeOscillatorsRef.current.forEach(osc => {
      try { osc.stop() } catch { /* already stopped */ }
    })
    activeOscillatorsRef.current = []
  }, [])

  return { play, playNote, stopAll }
}
