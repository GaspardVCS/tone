/**
 * Calculate the Root Mean Square of a Float32Array of audio samples.
 * Returns 0 for empty buffers.
 */
export function calcRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}
