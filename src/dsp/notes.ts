const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** Convert frequency in Hz to MIDI note number (fractional) */
export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440)
}

/** Convert MIDI note number to frequency in Hz */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Cents offset from nearest note (-50 to +50) */
export function hzToCents(hz: number): number {
  const midi = hzToMidi(hz)
  return Math.round((midi - Math.round(midi)) * 100)
}

/** Cents offset from a specific target MIDI note */
export function centsFromTarget(hz: number, targetMidi: number): number {
  return (hzToMidi(hz) - targetMidi) * 100
}

/** Note name with octave (e.g. "A4", "C#5") */
export function noteName(hz: number): string {
  const midi = Math.round(hzToMidi(hz))
  const note = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}
