import { describe, it, expect } from 'vitest'
import { evaluateNote, evaluateMelody, type PitchFrame } from './evaluator'
import type { MelodyNote } from '../data/melody'
import { midiToHz } from './notes'

const BPM = 120 // 0.5 seconds per beat

// Helper to generate frames within a time range
function generateFrames(
  startSec: number,
  endSec: number,
  count: number,
  hz: number,
  voiced: boolean,
  confidence = 0.9
): PitchFrame[] {
  const frames: PitchFrame[] = []
  const step = (endSec - startSec) / count
  for (let i = 0; i < count; i++) {
    frames.push({
      tSec: startSec + i * step,
      hz,
      confidence,
      voiced,
    })
  }
  return frames
}

describe('evaluateNote', () => {
  // Note: C4 (MIDI 60), beats 0-1, at 120 BPM = 0.0s to 0.5s
  const testNote: MelodyNote = { midi: 60, startBeat: 0, durationBeats: 1 }
  const c4Hz = midiToHz(60) // ~261.63 Hz

  it('passes when sung correctly (all frames voiced and on-pitch)', () => {
    const frames = generateFrames(0, 0.5, 10, c4Hz, true)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(true)
    expect(result.correctness).toBeCloseTo(1.0, 2)
    expect(result.coverage).toBeCloseTo(1.0, 2)
    expect(result.avgAbsCents).toBeCloseTo(0, 1)
    expect(result.startSec).toBeCloseTo(0, 5)
    expect(result.endSec).toBeCloseTo(0.5, 5)
  })

  it('fails when pitch is wrong (E4 instead of C4)', () => {
    const e4Hz = midiToHz(64) // ~329.63 Hz, +400 cents from C4
    const frames = generateFrames(0, 0.5, 10, e4Hz, true)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(false)
    expect(result.correctness).toBe(0) // All frames out of tolerance
    expect(result.coverage).toBeCloseTo(1.0, 2)
    expect(result.avgAbsCents).toBeCloseTo(400, 1) // 4 semitones = 400 cents
  })

  it('fails when silent (no voiced frames)', () => {
    const frames = generateFrames(0, 0.5, 10, c4Hz, false)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(false)
    expect(result.correctness).toBe(0)
    expect(result.coverage).toBe(0)
  })

  it('fails when no frames in window', () => {
    // Frames outside the note's time window
    const frames = generateFrames(1.0, 1.5, 10, c4Hz, true)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(false)
    expect(result.correctness).toBe(0)
    expect(result.coverage).toBe(0)
  })

  it('passes with partial coverage above threshold', () => {
    // 4 voiced frames out of 10 = 40% coverage (above 35% threshold)
    const voicedFrames = generateFrames(0, 0.2, 4, c4Hz, true)
    const unvoicedFrames = generateFrames(0.2, 0.5, 6, c4Hz, false)
    const frames = [...voicedFrames, ...unvoicedFrames]

    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(true)
    expect(result.coverage).toBeCloseTo(0.4, 2)
    expect(result.correctness).toBeCloseTo(1.0, 2)
  })

  it('fails with partial coverage below threshold', () => {
    // 3 voiced frames out of 10 = 30% coverage (below 35% threshold)
    const voicedFrames = generateFrames(0, 0.15, 3, c4Hz, true)
    const unvoicedFrames = generateFrames(0.15, 0.5, 7, c4Hz, false)
    const frames = [...voicedFrames, ...unvoicedFrames]

    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(false)
    expect(result.coverage).toBeCloseTo(0.3, 2)
    expect(result.correctness).toBeCloseTo(1.0, 2) // Pitched correctly, just not enough
  })

  it('handles slightly sharp pitch within tolerance', () => {
    // 20 cents sharp (within ±25 cents tolerance)
    const sharpHz = c4Hz * Math.pow(2, 20 / 1200)
    const frames = generateFrames(0, 0.5, 10, sharpHz, true)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(true)
    expect(result.correctness).toBeCloseTo(1.0, 2)
    expect(result.avgAbsCents).toBeCloseTo(20, 1)
  })

  it('fails when pitch is just outside tolerance', () => {
    // 30 cents sharp (outside ±25 cents tolerance)
    const sharpHz = c4Hz * Math.pow(2, 30 / 1200)
    const frames = generateFrames(0, 0.5, 10, sharpHz, true)
    const result = evaluateNote(testNote, 0, frames, BPM)

    expect(result.pass).toBe(false)
    expect(result.correctness).toBe(0)
    expect(result.avgAbsCents).toBeCloseTo(30, 1)
  })

  it('respects custom config thresholds', () => {
    // 30 cents sharp - would fail with default ±25, but pass with ±35
    const sharpHz = c4Hz * Math.pow(2, 30 / 1200)
    const frames = generateFrames(0, 0.5, 10, sharpHz, true)

    const customConfig = {
      toleranceCents: 35,
      minCoverage: 0.35,
      minCorrectness: 0.60,
      minConfidence: 0.5,
    }

    const result = evaluateNote(testNote, 0, frames, BPM, customConfig)
    expect(result.pass).toBe(true)
    expect(result.correctness).toBeCloseTo(1.0, 2)
  })

  it('filters out low-confidence frames', () => {
    // 10 frames, but 6 have low confidence
    const highConfFrames = generateFrames(0, 0.2, 4, c4Hz, true, 0.9)
    const lowConfFrames = generateFrames(0.2, 0.5, 6, c4Hz, true, 0.3)
    const frames = [...highConfFrames, ...lowConfFrames]

    const result = evaluateNote(testNote, 0, frames, BPM)

    // Coverage = 4 high-conf voiced / 10 total = 0.4
    expect(result.coverage).toBeCloseTo(0.4, 2)
    expect(result.pass).toBe(true)
  })
})

describe('evaluateMelody', () => {
  it('evaluates multiple notes correctly', () => {
    const notes: MelodyNote[] = [
      { midi: 60, startBeat: 0, durationBeats: 1 }, // C4: 0.0s - 0.5s
      { midi: 62, startBeat: 1, durationBeats: 1 }, // D4: 0.5s - 1.0s
    ]

    const c4Hz = midiToHz(60)
    const d4Hz = midiToHz(62)

    // Sing C4 correctly, miss D4 (silent)
    const frames: PitchFrame[] = [
      ...generateFrames(0, 0.5, 10, c4Hz, true),
      ...generateFrames(0.5, 1.0, 10, d4Hz, false),
    ]

    const results = evaluateMelody(notes, frames, BPM)

    expect(results).toHaveLength(2)
    expect(results[0].pass).toBe(true)
    expect(results[0].noteIndex).toBe(0)
    expect(results[1].pass).toBe(false)
    expect(results[1].noteIndex).toBe(1)
  })
})
