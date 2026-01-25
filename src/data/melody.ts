export interface MelodyNote {
  midi: number
  startBeat: number
  durationBeats: number
}

export interface Melody {
  name: string
  notes: MelodyNote[]
}

// "Au clair de la lune" - first phrase
// C4 C4 C4 D4 | E4 - D4 - | C4 E4 D4 D4 | C4 - - -
export const AU_CLAIR_DE_LA_LUNE: Melody = {
  name: 'Au clair de la lune',
  notes: [
    { midi: 60, startBeat: 0, durationBeats: 1 },  // C4 "Au"
    { midi: 60, startBeat: 1, durationBeats: 1 },  // C4 "clair"
    { midi: 60, startBeat: 2, durationBeats: 1 },  // C4 "de"
    { midi: 62, startBeat: 3, durationBeats: 1 },  // D4 "la"
    { midi: 64, startBeat: 4, durationBeats: 2 },  // E4 "lu-"
    { midi: 62, startBeat: 6, durationBeats: 2 },  // D4 "-ne"
    { midi: 60, startBeat: 8, durationBeats: 1 },  // C4 "Mon"
    { midi: 64, startBeat: 9, durationBeats: 1 },  // E4 "a-"
    { midi: 62, startBeat: 10, durationBeats: 1 }, // D4 "-mi"
    { midi: 62, startBeat: 11, durationBeats: 1 }, // D4 "Pier-"
    { midi: 60, startBeat: 12, durationBeats: 4 }, // C4 "-rot"
  ],
}

/** Get total duration in beats */
export function melodyDuration(melody: Melody): number {
  let max = 0
  for (const note of melody.notes) {
    const end = note.startBeat + note.durationBeats
    if (end > max) max = end
  }
  return max
}
