import { describe, it, expect } from 'vitest'
import { hzToMidi, midiToHz, hzToCents, centsFromTarget, noteName } from './notes'

describe('hzToMidi', () => {
  it('A4 = 440 Hz → MIDI 69', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 5)
  })

  it('C4 = 261.63 Hz → MIDI 60', () => {
    expect(hzToMidi(261.63)).toBeCloseTo(60, 0)
  })

  it('A3 = 220 Hz → MIDI 57', () => {
    expect(hzToMidi(220)).toBeCloseTo(57, 5)
  })

  // Edge cases for pitch detection range
  it('C3 = 130.81 Hz → MIDI 48 (low boundary)', () => {
    expect(hzToMidi(130.81)).toBeCloseTo(48, 0)
  })

  it('B4 = 493.88 Hz → MIDI 71 (high boundary)', () => {
    expect(hzToMidi(493.88)).toBeCloseTo(71, 0)
  })

  it('very low frequency (sub-bass) returns fractional MIDI', () => {
    expect(hzToMidi(30)).toBeLessThan(24)
  })

  it('very high frequency returns fractional MIDI', () => {
    expect(hzToMidi(4000)).toBeGreaterThan(95)
  })

  it('fractional Hz returns fractional MIDI', () => {
    // 445 Hz is slightly sharp of A4
    const midi = hzToMidi(445)
    expect(midi).toBeGreaterThan(69)
    expect(midi).toBeLessThan(70)
  })
})

describe('midiToHz', () => {
  it('MIDI 69 → 440 Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5)
  })

  it('MIDI 60 → 261.63 Hz', () => {
    expect(midiToHz(60)).toBeCloseTo(261.63, 1)
  })
})

describe('hzToCents', () => {
  it('exact A4 → 0 cents', () => {
    expect(hzToCents(440)).toBe(0)
  })

  it('slightly sharp A4 → positive cents', () => {
    expect(hzToCents(445)).toBeGreaterThan(0)
    expect(hzToCents(445)).toBeLessThanOrEqual(50)
  })

  it('slightly flat A4 → negative cents', () => {
    expect(hzToCents(435)).toBeLessThan(0)
    expect(hzToCents(435)).toBeGreaterThanOrEqual(-50)
  })
})

describe('centsFromTarget', () => {
  it('exact A4 (440 Hz) vs target MIDI 69 → 0 cents', () => {
    expect(centsFromTarget(440, 69)).toBeCloseTo(0, 5)
  })

  it('one semitone above target → +100 cents', () => {
    // A#4 = MIDI 70, target A4 = MIDI 69
    const aSharp4 = 440 * Math.pow(2, 1 / 12)
    expect(centsFromTarget(aSharp4, 69)).toBeCloseTo(100, 3)
  })

  it('slightly flat → negative cents', () => {
    expect(centsFromTarget(435, 69)).toBeLessThan(0)
    expect(centsFromTarget(435, 69)).toBeGreaterThan(-50)
  })

  it('one octave above target → +1200 cents', () => {
    expect(centsFromTarget(880, 69)).toBeCloseTo(1200, 3)
  })
})

describe('noteName', () => {
  it('440 Hz → A4', () => {
    expect(noteName(440)).toBe('A4')
  })

  it('261.63 Hz → C4', () => {
    expect(noteName(261.63)).toBe('C4')
  })

  it('880 Hz → A5', () => {
    expect(noteName(880)).toBe('A5')
  })

  it('130.81 Hz → C3', () => {
    expect(noteName(130.81)).toBe('C3')
  })
})
