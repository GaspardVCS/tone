import { describe, it, expect } from 'vitest'
import { hzToMidi, midiToHz, hzToCents, noteName } from './notes'

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
