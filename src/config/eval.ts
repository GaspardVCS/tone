/**
 * Configuration for pitch evaluation in Mode B
 * All thresholds are tunable here.
 */
export const EVAL_CONFIG = {
  /** Pitch tolerance in cents (±50 = nearest semitone wins) */
  toleranceCents: 50,

  /** Minimum fraction of frames that must be voiced (0.35 = 35%) */
  minCoverage: 0.35,

  /** Minimum fraction of voiced frames that must be in-tolerance (0.60 = 60%) */
  minCorrectness: 0.60,

  /** Minimum confidence for a frame to count as "voiced" */
  minConfidence: 0.5,
}

export type EvalConfig = typeof EVAL_CONFIG
