import type { MelodyNote } from '../data/melody'
import { EVAL_CONFIG, type EvalConfig } from '../config/eval'
import { centsFromTarget } from './notes'

/** A single pitch detection frame with timestamp */
export interface PitchFrame {
  tSec: number
  hz: number
  confidence: number
  voiced: boolean
}

/** Evaluation result for a single note */
export interface NoteResult {
  noteIndex: number
  pass: boolean
  /** Fraction of voiced frames within tolerance (0..1) */
  correctness: number
  /** Fraction of frames that were voiced (0..1) */
  coverage: number
  /** Average absolute cents error for voiced frames */
  avgAbsCents: number
  startSec: number
  endSec: number
}

/**
 * Evaluate a single melody note against recorded pitch frames.
 *
 * @param note - The melody note to evaluate
 * @param noteIndex - Index of the note in the melody
 * @param frames - Array of timestamped pitch frames
 * @param bpm - Beats per minute for timing conversion
 * @param config - Evaluation thresholds (optional, defaults to EVAL_CONFIG)
 */
export function evaluateNote(
  note: MelodyNote,
  noteIndex: number,
  frames: PitchFrame[],
  bpm: number,
  config: EvalConfig = EVAL_CONFIG
): NoteResult {
  const secPerBeat = 60 / bpm
  const startSec = note.startBeat * secPerBeat
  const endSec = (note.startBeat + note.durationBeats) * secPerBeat

  // Filter frames within the note's time window
  const windowFrames = frames.filter(f => f.tSec >= startSec && f.tSec < endSec)

  // No frames in window = fail
  if (windowFrames.length === 0) {
    return {
      noteIndex,
      pass: false,
      correctness: 0,
      coverage: 0,
      avgAbsCents: 0,
      startSec,
      endSec,
    }
  }

  // Filter for voiced frames with sufficient confidence
  const voicedFrames = windowFrames.filter(
    f => f.voiced && f.confidence >= config.minConfidence
  )
  const coverage = voicedFrames.length / windowFrames.length

  // No voiced frames = fail
  if (voicedFrames.length === 0) {
    return {
      noteIndex,
      pass: false,
      correctness: 0,
      coverage: 0,
      avgAbsCents: 0,
      startSec,
      endSec,
    }
  }

  // Calculate correctness and average cents error
  const targetMidi = note.midi
  let correctCount = 0
  let totalAbsCents = 0

  for (const f of voicedFrames) {
    const cents = centsFromTarget(f.hz, targetMidi)
    totalAbsCents += Math.abs(cents)
    if (Math.abs(cents) <= config.toleranceCents) {
      correctCount++
    }
  }

  const correctness = correctCount / voicedFrames.length
  const avgAbsCents = totalAbsCents / voicedFrames.length

  // Pass if both coverage and correctness meet thresholds
  const pass = coverage >= config.minCoverage && correctness >= config.minCorrectness

  return {
    noteIndex,
    pass,
    correctness,
    coverage,
    avgAbsCents,
    startSec,
    endSec,
  }
}

/**
 * Evaluate all notes in a melody against recorded pitch frames.
 *
 * @param notes - Array of melody notes
 * @param frames - Array of timestamped pitch frames
 * @param bpm - Beats per minute for timing conversion
 * @param config - Evaluation thresholds (optional)
 */
export function evaluateMelody(
  notes: MelodyNote[],
  frames: PitchFrame[],
  bpm: number,
  config: EvalConfig = EVAL_CONFIG
): NoteResult[] {
  return notes.map((note, index) => evaluateNote(note, index, frames, bpm, config))
}
