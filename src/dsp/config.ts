export const DSP_CONFIG = {
  /** RMS below this is considered unvoiced/silent */
  RMS_THRESHOLD: 0.01,
  /** FFT size for AnalyserNode (must be power of 2) */
  FFT_SIZE: 2048,
  /** AnalyserNode smoothing time constant */
  ANALYSER_SMOOTHING: 0.8,
} as const
