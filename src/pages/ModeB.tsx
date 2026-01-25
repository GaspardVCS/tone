import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MelodyCanvas from '../components/MelodyCanvas'
import { AU_CLAIR_DE_LA_LUNE, melodyDuration } from '../data/melody'

const BEATS_VISIBLE = 8

function ModeB() {
  const [bpm, setBpm] = useState(100)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-2) // Start before first note

  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const startBeatRef = useRef<number>(0)

  const melody = AU_CLAIR_DE_LA_LUNE
  const totalBeats = melodyDuration(melody)

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
        setCurrentBeat(-2)
      } else {
        setCurrentBeat(newBeat)
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [bpm, currentBeat, totalBeats]
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
    setCurrentBeat(-2)
  }

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = 0
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
