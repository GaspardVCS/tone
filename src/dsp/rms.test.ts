import { describe, it, expect } from 'vitest'
import { calcRms } from './rms'

describe('calcRms', () => {
  it('returns 0 for an empty buffer', () => {
    expect(calcRms(new Float32Array(0))).toBe(0)
  })

  it('returns 0 for silence (all zeros)', () => {
    const silence = new Float32Array(1024)
    expect(calcRms(silence)).toBe(0)
  })

  it('returns the absolute value for a single sample', () => {
    const buf = new Float32Array([0.5])
    expect(calcRms(buf)).toBeCloseTo(0.5)
  })

  it('returns the DC offset value for a constant signal', () => {
    const dc = new Float32Array(256).fill(0.3)
    expect(calcRms(dc)).toBeCloseTo(0.3)
  })

  it('returns ~0.707 for a unit sine wave (1/sqrt2)', () => {
    const size = 4096
    const buf = new Float32Array(size)
    for (let i = 0; i < size; i++) {
      buf[i] = Math.sin((2 * Math.PI * i) / size)
    }
    expect(calcRms(buf)).toBeCloseTo(1 / Math.sqrt(2), 2)
  })
})
