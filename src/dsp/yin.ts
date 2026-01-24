import { DSP_CONFIG } from './config'

export interface PitchResult {
  hz: number
  confidence: number
}

/**
 * YIN pitch detection algorithm.
 * Returns detected pitch and confidence, or null if no clear pitch found.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
): PitchResult | null {
  const { YIN_THRESHOLD, YIN_MIN_HZ, YIN_MAX_HZ } = DSP_CONFIG

  const maxLag = Math.floor(sampleRate / YIN_MIN_HZ)
  const minLag = Math.floor(sampleRate / YIN_MAX_HZ)
  const halfLen = Math.min(Math.floor(samples.length / 2), maxLag + 1)

  if (halfLen <= minLag) return null

  // Step 1 & 2: Difference function + cumulative mean normalized
  const d = new Float32Array(halfLen)
  d[0] = 1
  let runningSum = 0

  for (let tau = 1; tau < halfLen; tau++) {
    let diff = 0
    for (let i = 0; i < halfLen; i++) {
      const delta = samples[i] - samples[i + tau]
      diff += delta * delta
    }
    d[tau] = diff
    runningSum += diff
    d[tau] = runningSum > 0 ? (d[tau] * tau) / runningSum : 1
  }

  // Step 3: Absolute threshold — find first tau below threshold
  let bestTau = -1
  for (let tau = minLag; tau < halfLen; tau++) {
    if (d[tau] < YIN_THRESHOLD) {
      // Find the local minimum after going below threshold
      while (tau + 1 < halfLen && d[tau + 1] < d[tau]) {
        tau++
      }
      bestTau = tau
      break
    }
  }

  if (bestTau === -1) return null

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let refinedTau: number
  if (bestTau > 0 && bestTau < halfLen - 1) {
    const s0 = d[bestTau - 1]
    const s1 = d[bestTau]
    const s2 = d[bestTau + 1]
    const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2))
    if (Math.abs(shift) <= 1) {
      refinedTau = bestTau + shift
    } else {
      refinedTau = bestTau
    }
  } else {
    refinedTau = bestTau
  }

  const hz = sampleRate / refinedTau
  const confidence = 1 - d[bestTau]

  if (hz < YIN_MIN_HZ || hz > YIN_MAX_HZ) return null

  return { hz, confidence: Math.max(0, Math.min(1, confidence)) }
}
