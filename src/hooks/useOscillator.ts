import { useRef, useCallback } from 'react'
import { midiToHz } from '../dsp/notes'

// Additive synthesis: fundamental + 3 harmonics (matches piano-like timbre)
const HARMONICS_REAL = new Float32Array([0, 0, 0, 0, 0])
const HARMONICS_IMAG = new Float32Array([0, 0.6, 0.3, 0.15, 0.1])

export function useOscillator() {
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)

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

    const wave = ctx.createPeriodicWave(HARMONICS_REAL, HARMONICS_IMAG)
    osc.setPeriodicWave(wave)
    osc.frequency.value = midiToHz(midi)

    // Envelope: 10ms attack, exponential decay (time constant ~0.33s)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.5, now + 0.01)
    gain.gain.setTargetAtTime(0, now + 0.01, 0.33)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 1.5)

    oscRef.current = osc
  }, [])

  return { play }
}
