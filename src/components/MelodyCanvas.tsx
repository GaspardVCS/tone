import { useRef, useEffect } from 'react'
import type { Melody } from '../data/melody'

interface Props {
  melody: Melody
  currentBeat: number
  beatsVisible: number
  onNoteHit?: (midi: number, noteIndex: number, durationBeats: number) => void
}

const WIDTH = 400
const HEIGHT = 350
const NOTE_COLOR = '#646cff'
const NOW_LINE_COLOR = '#888'
const BG_COLOR = '#1a1a2e'

// Piano range: C3 (48) to B4 (71) = 2 octaves
const PIANO_LOW = 48
const PIANO_HIGH = 71

// Piano keyboard dimensions
const PIANO_HEIGHT = 60
const WHITE_KEY_WIDTH = 22
const BLACK_KEY_WIDTH = 14
const BLACK_KEY_HEIGHT = 36

function isBlackKey(midi: number): boolean {
  const note = midi % 12
  return [1, 3, 6, 8, 10].includes(note)
}

// Map MIDI to X center position on piano
function midiToX(midi: number): number {
  // Count white keys from PIANO_LOW to this note
  let whiteKeyCount = 0
  for (let m = PIANO_LOW; m <= midi; m++) {
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

function MelodyCanvas({ melody, currentBeat, beatsVisible, onNoteHit }: Props) {
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

    // Calculate piano dimensions
    let whiteKeyCount = 0
    for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
      if (!isBlackKey(m)) whiteKeyCount++
    }
    const pianoWidth = whiteKeyCount * WHITE_KEY_WIDTH
    const pianoLeft = (WIDTH - pianoWidth) / 2

    // "Now" line position (top of piano)
    const nowY = HEIGHT - PIANO_HEIGHT

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

      // Skip if completely off screen (bottom above viewport or top below now line)
      if (y + noteHeight < 0 || y > nowY) continue

      // X position based on MIDI pitch
      const x = pianoLeft + midiToX(note.midi) - noteWidth / 2

      ctx.fillStyle = NOTE_COLOR
      ctx.beginPath()
      ctx.roundRect(x, y, noteWidth, noteHeight, 4)
      ctx.fill()
    }

    // Draw piano keyboard
    // First draw all white keys
    let whiteIdx = 0
    for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
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
    for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
      if (!isBlackKey(m)) {
        // Check if next note is a black key
        if (m + 1 <= PIANO_HIGH && isBlackKey(m + 1)) {
          const x = pianoLeft + (whiteIdx + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
          ctx.fillStyle = '#222'
          ctx.fillRect(x, nowY, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT)
        }
        whiteIdx++
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
  }, [melody, currentBeat, beatsVisible, onNoteHit])

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
