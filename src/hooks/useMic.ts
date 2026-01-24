import { useState, useRef, useCallback } from 'react'
import { DSP_CONFIG } from '../dsp/config'
import { calcRms } from '../dsp/rms'
import { detectPitch, PitchResult } from '../dsp/yin'

export interface MicState {
  active: boolean
  rms: number
  voiced: boolean
  pitch: PitchResult | null
}

export function useMic() {
  const [state, setState] = useState<MicState>({
    active: false,
    rms: 0,
    voiced: false,
    pitch: null,
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const start = useCallback(async () => {
    const ctx = new AudioContext()
    await ctx.resume() // iOS/Safari: must resume in user gesture handler

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = ctx.createMediaStreamSource(stream)

    const analyser = ctx.createAnalyser()
    analyser.fftSize = DSP_CONFIG.FFT_SIZE
    analyser.smoothingTimeConstant = DSP_CONFIG.ANALYSER_SMOOTHING
    source.connect(analyser)

    const buffer = new Float32Array(analyser.fftSize)

    ctxRef.current = ctx
    streamRef.current = stream

    const loop = () => {
      analyser.getFloatTimeDomainData(buffer)
      const rms = calcRms(buffer)
      const voiced = rms >= DSP_CONFIG.RMS_THRESHOLD
      const pitch = voiced ? detectPitch(buffer, ctx.sampleRate) : null
      setState({ active: true, rms, voiced, pitch })
      rafRef.current = requestAnimationFrame(loop)
    }

    setState({ active: true, rms: 0, voiced: false, pitch: null })
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctxRef.current?.close()
    streamRef.current = null
    ctxRef.current = null
    setState({ active: false, rms: 0, voiced: false, pitch: null })
  }, [])

  return { ...state, start, stop }
}
