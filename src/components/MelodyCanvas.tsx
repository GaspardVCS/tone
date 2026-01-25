import { useRef, useEffect } from 'react'
import type { Melody } from '../data/melody'
import { hzToMidi } from '../dsp/notes'

interface Props {
  melody: Melody
  currentBeat: number
  beatsVisible: number
  onNoteHit?: (midi: number, noteIndex: number, durationBeats: number) => void
  userPitch?: { hz: number; confidence: number; voiced: boolean } | null
  noteSegments?: Map<number, boolean[]>  // Per-segment match results
  transpose?: number  // Semitones to shift melody (e.g., -12 = 1 octave down)
}

const SEGMENTS_PER_BEAT = 4  // Must match ModeB.tsx

const WIDTH = 400
const HEIGHT = 420
const NOTE_COLOR = '#646cff'
const NOTE_COLOR_PASS = '#4CAF50'
const NOTE_COLOR_FAIL = '#FF6B6B'
const NOW_LINE_COLOR = '#888'
const BG_COLOR = '#1a1a2e'

// Piano range: 2 octaves, base starts at C3 (48)
const PIANO_LOW_BASE = 48
const PIANO_HIGH_BASE = 71

// Piano keyboard dimensions
const PIANO_HEIGHT = 60
const WHITE_KEY_WIDTH = 22
const BLACK_KEY_WIDTH = 14
const BLACK_KEY_HEIGHT = 36
const RESULTS_AREA_HEIGHT = 100  // Space below piano for passed notes

function isBlackKey(midi: number): boolean {
  const note = midi % 12
  return [1, 3, 6, 8, 10].includes(note)
}

// Map MIDI to X center position on piano (integer MIDI)
function midiToX(midi: number, pianoLow: number): number {
  // Count white keys from pianoLow to this note
  let whiteKeyCount = 0
  for (let m = pianoLow; m <= midi; m++) {
    if (!isBlackKey(m)) whiteKeyCount++
  }

  if (isBlackKey(midi)) {
    // Black key: position between adjacent white keys
    return (whiteKeyCount - 0.5) * WHITE_KEY_WIDTH
  } else {
    // White key: center of the key
    return (whiteKeyCount - 0.5) * WHITE_KEY_WIDTH
  }
}

// Map fractional MIDI to X position (for smooth pitch tracking)
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

function MelodyCanvas({ melody, currentBeat, beatsVisible, onNoteHit, userPitch, noteSegments, transpose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevBeatRef = useRef<number>(currentBeat)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Compute shifted piano range based on transpose
    const pianoLow = PIANO_LOW_BASE + (transpose ?? 0)
    const pianoHigh = PIANO_HIGH_BASE + (transpose ?? 0)

    // Calculate piano dimensions
    let whiteKeyCount = 0
    for (let m = pianoLow; m <= pianoHigh; m++) {
      if (!isBlackKey(m)) whiteKeyCount++
    }
    const pianoWidth = whiteKeyCount * WHITE_KEY_WIDTH
    const pianoLeft = (WIDTH - pianoWidth) / 2

    // "Now" line position (top of piano, with results area below)
    const nowY = HEIGHT - PIANO_HEIGHT - RESULTS_AREA_HEIGHT

    // Draw horizontal "now" line
    ctx.strokeStyle = NOW_LINE_COLOR
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pianoLeft, nowY)
    ctx.lineTo(pianoLeft + pianoWidth, nowY)
    ctx.stroke()

    // Pixels per beat (notes fall from top)
    const noteRunwayHeight = nowY - 20
    const pxPerBeat = noteRunwayHeight / beatsVisible

    // Draw notes (falling from top toward now line)
    const noteWidth = 18
    for (let i = 0; i < melody.notes.length; i++) {
      const note = melody.notes[i]

      // Note height based on duration (durationBeats * pxPerBeat)
      const noteHeight = note.durationBeats * pxPerBeat

      // Y position: note's bottom edge touches nowY when startBeat equals currentBeat
      const beatOffset = note.startBeat - currentBeat
      const y = nowY - beatOffset * pxPerBeat - noteHeight

      // Skip if completely off screen (above viewport or below canvas)
      if (y + noteHeight < 0 || y > HEIGHT) continue

      // X position based on MIDI pitch (with transpose applied)
      const x = pianoLeft + midiToX(note.midi + (transpose ?? 0), pianoLow) - noteWidth / 2

      // Get segment data for this note
      const segments = noteSegments?.get(i)
      const totalSegments = Math.ceil(note.durationBeats * SEGMENTS_PER_BEAT)
      const segmentHeight = noteHeight / totalSegments

      if (segments && segments.length > 0) {
        // Draw each segment with its own color
        for (let s = 0; s < totalSegments; s++) {
          const segY = y + (totalSegments - 1 - s) * segmentHeight  // Draw from top to bottom

          if (s < segments.length) {
            // Segment has been evaluated - green if matched, red if not
            ctx.fillStyle = segments[s] ? NOTE_COLOR_PASS : NOTE_COLOR_FAIL
          } else {
            // Segment not yet evaluated - blue (future)
            ctx.fillStyle = NOTE_COLOR
          }

          // Draw segment with rounded corners only at edges
          const isTop = s === totalSegments - 1
          const isBottom = s === 0
          const radius = 4

          ctx.beginPath()
          if (isTop && isBottom) {
            ctx.roundRect(x, segY, noteWidth, segmentHeight, radius)
          } else if (isTop) {
            ctx.roundRect(x, segY, noteWidth, segmentHeight, [radius, radius, 0, 0])
          } else if (isBottom) {
            ctx.roundRect(x, segY, noteWidth, segmentHeight, [0, 0, radius, radius])
          } else {
            ctx.fillRect(x, segY, noteWidth, segmentHeight)
            continue
          }
          ctx.fill()
        }
      } else {
        // No segment data - draw entire note in default color
        ctx.fillStyle = NOTE_COLOR
        ctx.beginPath()
        ctx.roundRect(x, y, noteWidth, noteHeight, 4)
        ctx.fill()
      }
    }

    // Draw piano keyboard
    // First draw all white keys
    let whiteIdx = 0
    for (let m = pianoLow; m <= pianoHigh; m++) {
      if (!isBlackKey(m)) {
        const x = pianoLeft + whiteIdx * WHITE_KEY_WIDTH
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(x, nowY, WHITE_KEY_WIDTH - 1, PIANO_HEIGHT)
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 1
        ctx.strokeRect(x, nowY, WHITE_KEY_WIDTH - 1, PIANO_HEIGHT)
        whiteIdx++
      }
    }

    // Then draw black keys on top
    whiteIdx = 0
    for (let m = pianoLow; m <= pianoHigh; m++) {
      if (!isBlackKey(m)) {
        // Check if next note is a black key
        if (m + 1 <= pianoHigh && isBlackKey(m + 1)) {
          const x = pianoLeft + (whiteIdx + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
          ctx.fillStyle = '#222'
          ctx.fillRect(x, nowY, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT)
        }
        whiteIdx++
      }
    }

    // Draw user pitch marker (triangle pointer at top of piano) or out-of-range indicator
    if (userPitch && userPitch.voiced && userPitch.confidence > 0.6) {
      const midi = hzToMidi(userPitch.hz)

      if (midi >= pianoLow && midi <= pianoHigh) {
        // Normal marker - triangle at detected position
        const x = pianoLeft + midiToXSmooth(midi, pianoLow)
        // Draw downward-pointing triangle
        ctx.fillStyle = '#4CAF50'
        ctx.beginPath()
        ctx.moveTo(x, nowY + 12)      // bottom point (into piano)
        ctx.lineTo(x - 8, nowY - 4)   // top-left
        ctx.lineTo(x + 8, nowY - 4)   // top-right
        ctx.closePath()
        ctx.fill()
        // Add outline for visibility
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (midi < pianoLow) {
        // Too low - show left arrow at piano left edge
        ctx.fillStyle = '#FF9800'  // Orange
        ctx.beginPath()
        ctx.moveTo(pianoLeft - 5, nowY + 4)  // Arrow pointing left
        ctx.lineTo(pianoLeft + 5, nowY - 4)
        ctx.lineTo(pianoLeft + 5, nowY + 12)
        ctx.closePath()
        ctx.fill()
      } else {
        // Too high - show right arrow at piano right edge
        ctx.fillStyle = '#FF9800'  // Orange
        ctx.beginPath()
        ctx.moveTo(pianoLeft + pianoWidth + 5, nowY + 4)  // Arrow pointing right
        ctx.lineTo(pianoLeft + pianoWidth - 5, nowY - 4)
        ctx.lineTo(pianoLeft + pianoWidth - 5, nowY + 12)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Check for note hits (notes crossing the now line)
    if (onNoteHit) {
      const prevBeat = prevBeatRef.current
      for (let i = 0; i < melody.notes.length; i++) {
        const note = melody.notes[i]
        // Note crosses when currentBeat passes its startBeat
        if (prevBeat < note.startBeat && currentBeat >= note.startBeat) {
          onNoteHit(note.midi, i, note.durationBeats)
        }
      }
    }
    prevBeatRef.current = currentBeat
  }, [melody, currentBeat, beatsVisible, onNoteHit, userPitch, noteSegments, transpose])

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="melody-canvas"
    />
  )
}

export default MelodyCanvas
