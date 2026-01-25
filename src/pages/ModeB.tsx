import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MelodyCanvas from '../components/MelodyCanvas'
import { AU_CLAIR_DE_LA_LUNE, melodyDuration } from '../data/melody'
import { useOscillator } from '../hooks/useOscillator'

const BEATS_VISIBLE = 3

function ModeB() {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-2) // Start before first note

  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const startBeatRef = useRef<number>(0)
  const playedNotesRef = useRef<Set<number>>(new Set())

  const { playNote } = useOscillator()
  const melody = AU_CLAIR_DE_LA_LUNE
  const totalBeats = melodyDuration(melody)

  const handleNoteHit = useCallback(
    (midi: number, noteIndex: number, durationBeats: number) => {
      if (!playedNotesRef.current.has(noteIndex)) {
        playedNotesRef.current.add(noteIndex)
        const durationSec = (durationBeats * 60) / bpm
        playNote(midi, durationSec)
      }
    },
    [playNote, bpm]
  )

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
        startBeatRef.current = currentBeat
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000
      const beatsElapsed = (elapsed * bpm) / 60
      const newBeat = startBeatRef.current + beatsElapsed

      // Loop when melody ends (with a little buffer)
      if (newBeat > totalBeats + 2) {
        startTimeRef.current = timestamp
        startBeatRef.current = -2
        playedNotesRef.current.clear()
        setCurrentBeat(-2)
      } else {
        setCurrentBeat(newBeat)
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [bpm, totalBeats]
  )

  const handleStart = () => {
    if (isPlaying) return
    startTimeRef.current = 0
    setIsPlaying(true)
  }

  const handleStop = () => {
    if (!isPlaying) return
    cancelAnimationFrame(animationRef.current)
    setIsPlaying(false)
  }

  const handleReset = () => {
    handleStop()
    playedNotesRef.current.clear()
    setCurrentBeat(-2)
  }

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate)
    }
    return () => cancelAnimationFrame(animationRef.current)
  }, [isPlaying, animate])

  return (
    <div className="page">
      <h1>Mode B</h1>
      <p className="melody-title">{melody.name}</p>

      <MelodyCanvas
        melody={melody}
        currentBeat={currentBeat}
        beatsVisible={BEATS_VISIBLE}
        onNoteHit={handleNoteHit}
      />

      <div className="melody-controls">
        <label className="bpm-label">
          BPM: {bpm}
          <input
            type="range"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="bpm-slider"
          />
        </label>
      </div>

      <div className="melody-controls">
        {!isPlaying ? (
          <button onClick={handleStart} className="nav-link">
            Start
          </button>
        ) : (
          <button onClick={handleStop} className="nav-link">
            Stop
          </button>
        )}
        <button onClick={handleReset} className="nav-link">
          Reset
        </button>
      </div>

      <Link to="/" className="nav-link">
        Back
      </Link>
    </div>
  )
}

export default ModeB
