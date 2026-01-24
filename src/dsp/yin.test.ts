import { describe, it, expect } from 'vitest'
import { detectPitch } from './yin'

function makeSine(hz: number, sampleRate: number, duration: number): Float32Array {
  const length = Math.floor(sampleRate * duration)
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin(2 * Math.PI * hz * i / sampleRate)
  }
  return samples
}

const SAMPLE_RATE = 44100

describe('detectPitch', () => {
  it('detects 220 Hz sine wave', () => {
    const samples = makeSine(220, SAMPLE_RATE, 0.1)
    const result = detectPitch(samples, SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.hz).toBeCloseTo(220, 0)
    expect(result!.confidence).toBeGreaterThan(0.9)
  })

  it('detects 440 Hz sine wave', () => {
    const samples = makeSine(440, SAMPLE_RATE, 0.1)
    const result = detectPitch(samples, SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.hz).toBeCloseTo(440, 0)
    expect(result!.confidence).toBeGreaterThan(0.9)
  })

  it('detects 880 Hz sine wave', () => {
    const samples = makeSine(880, SAMPLE_RATE, 0.1)
    const result = detectPitch(samples, SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.hz).toBeCloseTo(880, 0)
    expect(result!.confidence).toBeGreaterThan(0.9)
  })

  it('returns null for silence', () => {
    const samples = new Float32Array(4096)
    const result = detectPitch(samples, SAMPLE_RATE)
    expect(result).toBeNull()
  })
})
