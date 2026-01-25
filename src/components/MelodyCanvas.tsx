import { useRef, useEffect } from 'react'
import type { Melody } from '../data/melody'

interface Props {
  melody: Melody
  currentBeat: number
  beatsVisible: number
}

const WIDTH = 600
const HEIGHT = 200
const NOTE_COLOR = '#646cff'
const NOW_LINE_COLOR = '#888'
const BG_COLOR = '#1a1a2e'

// Map MIDI to Y position (C4=60 at center, each semitone = 12px)
function midiToY(midi: number): number {
  const centerMidi = 62 // D4, middle of our melody range
  const pxPerSemitone = 16
  return HEIGHT / 2 - (midi - centerMidi) * pxPerSemitone
}

function MelodyCanvas({ melody, currentBeat, beatsVisible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Draw "now" line at left edge (with padding)
    const nowX = 60
    ctx.strokeStyle = NOW_LINE_COLOR
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(nowX, 0)
    ctx.lineTo(nowX, HEIGHT)
    ctx.stroke()

    // Pixels per beat
    const pxPerBeat = (WIDTH - nowX - 20) / beatsVisible

    // Draw notes
    const noteHeight = 24
    for (const note of melody.notes) {
      // X position: nowX is currentBeat, notes to the right are future
      const beatOffset = note.startBeat - currentBeat
      const x = nowX + beatOffset * pxPerBeat
      const w = note.durationBeats * pxPerBeat - 4

      // Skip if completely off screen
      if (x + w < 0 || x > WIDTH) continue

      const y = midiToY(note.midi) - noteHeight / 2

      ctx.fillStyle = NOTE_COLOR
      ctx.beginPath()
      ctx.roundRect(x, y, w, noteHeight, 6)
      ctx.fill()
    }

    // Draw "now" label
    ctx.fillStyle = NOW_LINE_COLOR
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('NOW', nowX, HEIGHT - 8)
  }, [melody, currentBeat, beatsVisible])

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
