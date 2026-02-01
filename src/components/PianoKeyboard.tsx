import { noteName, hzToMidi } from '../dsp/notes'

interface Props {
  onKeyClick: (midi: number) => void
  targetMidi: number | null
  userPitch?: { hz: number; confidence: number } | null
  transpose?: number
}

// Base piano range (shifts with transpose)
const C3_BASE = 48
const B4_BASE = 71

// Key dimensions (must match CSS)
const WHITE_KEY_WIDTH = 32
const KEY_GAP = 2

function isBlackKey(midi: number): boolean {
  const note = midi % 12
  return [1, 3, 6, 8, 10].includes(note)
}

// Calculate X position for a MIDI note on the piano
function midiToX(midi: number, pianoLow: number): number {
  // Count white keys from pianoLow to this note
  let whiteKeysBefore = 0
  for (let m = pianoLow; m < midi; m++) {
    if (!isBlackKey(m)) whiteKeysBefore++
  }

  // Base position: center of the white key slot
  const baseX = whiteKeysBefore * (WHITE_KEY_WIDTH + KEY_GAP) + WHITE_KEY_WIDTH / 2

  if (isBlackKey(midi)) {
    // Black keys sit between white keys - offset slightly left
    return baseX - WHITE_KEY_WIDTH / 2
  }
  return baseX
}

// Interpolate X position for fractional MIDI (smooth pitch tracking)
function midiToXSmooth(midi: number, pianoLow: number): number {
  const lower = Math.floor(midi)
  const upper = Math.ceil(midi)
  const fraction = midi - lower

  if (lower === upper) {
    return midiToX(lower, pianoLow)
  }

  const xLower = midiToX(lower, pianoLow)
  const xUpper = midiToX(upper, pianoLow)
  return xLower + (xUpper - xLower) * fraction
}

function PianoKeyboard({ onKeyClick, targetMidi, userPitch, transpose }: Props) {
  const pianoLow = C3_BASE + (transpose ?? 0)
  const pianoHigh = B4_BASE + (transpose ?? 0)

  const keys: number[] = []
  for (let m = pianoLow; m <= pianoHigh; m++) keys.push(m)

  // Calculate pitch pointer position
  let pointerX: number | null = null
  let pointerOutOfRange: 'low' | 'high' | null = null

  if (userPitch && userPitch.confidence > 0.6) {
    const userMidi = hzToMidi(userPitch.hz)
    if (userMidi < pianoLow) {
      pointerOutOfRange = 'low'
    } else if (userMidi > pianoHigh) {
      pointerOutOfRange = 'high'
    } else {
      pointerX = midiToXSmooth(userMidi, pianoLow)
    }
  }

  return (
    <div className="piano-keyboard">
      {/* Pitch pointer */}
      {pointerX !== null && (
        <div
          className="pitch-pointer"
          style={{ left: `calc(0.5rem + ${pointerX}px)` }}
        />
      )}

      {/* Out-of-range indicators */}
      {pointerOutOfRange === 'low' && (
        <div className="pitch-pointer-arrow pitch-pointer-arrow-left" />
      )}
      {pointerOutOfRange === 'high' && (
        <div className="pitch-pointer-arrow pitch-pointer-arrow-right" />
      )}

      {keys.map((midi) => {
        const name = noteName(440 * Math.pow(2, (midi - 69) / 12))
        const isBlack = name.includes('#')
        const isActive = midi === targetMidi
        const cls = `piano-key ${isBlack ? 'piano-key-black' : 'piano-key-white'} ${isActive ? 'piano-key-active' : ''}`
        return (
          <button
            key={midi}
            className={cls}
            onClick={() => onKeyClick(midi)}
            aria-label={name}
          >
            {!isBlack && <span className="piano-key-label">{name}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default PianoKeyboard
