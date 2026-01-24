export const DSP_CONFIG = {
  /** RMS below this is considered unvoiced/silent */
  RMS_THRESHOLD: 0.01,
  /** FFT size for AnalyserNode (must be power of 2) */
  FFT_SIZE: 2048,
  /** AnalyserNode smoothing time constant */
  ANALYSER_SMOOTHING: 0.8,
  /** YIN cumulative mean normalized difference threshold */
  YIN_THRESHOLD: 0.15,
  /** Minimum detectable pitch in Hz */
  YIN_MIN_HZ: 60,
  /** Maximum detectable pitch in Hz */
  YIN_MAX_HZ: 1000,
  /** Cents tolerance for "in tune" (±) */
  TUNER_TOLERANCE_CENTS: 10,
} as const
