import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import MelodyCanvas from '../components/MelodyCanvas'
import { AU_CLAIR_DE_LA_LUNE, melodyDuration } from '../data/melody'
import { useOscillator } from '../hooks/useOscillator'
import { useMic } from '../hooks/useMic'
import { hzToCents, noteName, midiToHz, hzToMidi, centsFromTarget } from '../dsp/notes'
import { EVAL_CONFIG } from '../config/eval'

const BEATS_VISIBLE = 3
const EMA_ALPHA = 0.3
const SEGMENTS_PER_BEAT = 4  // How many segments per beat for coloring

type PlaybackMode = 'demo' | 'practice'

function ModeB() {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('demo')
  const [currentBeat, setCurrentBeat] = useState(-2) // Start before first note
  const [pitchDisplay, setPitchDisplay] = useState<{ note: string; cents: number } | null>(null)
  const [transpose, setTranspose] = useState(0) // Semitones

  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const startBeatRef = useRef<number>(0)
  const playedNotesRef = useRef<Set<number>>(new Set())
  const smoothedMidiRef = useRef<number | null>(null)
  const lastSegmentRef = useRef<Map<number, number>>(new Map())  // Track last evaluated segment per note
  const [noteSegments, setNoteSegments] = useState<Map<number, boolean[]>>(new Map())

  const { playNote, stopAll } = useOscillator()
  const mic = useMic()
  const melody = AU_CLAIR_DE_LA_LUNE
  const totalBeats = melodyDuration(melody)

  // Compute smoothed pitch for MelodyCanvas
  const userPitch = useMemo(() => {
    if (!mic.voiced || !mic.pitch || mic.pitch.confidence < 0.6) {
      smoothedMidiRef.current = null
      return null
    }
    const rawMidi = hzToMidi(mic.pitch.hz)
    if (smoothedMidiRef.current === null) {
      smoothedMidiRef.current = rawMidi
    } else {
      smoothedMidiRef.current = EMA_ALPHA * rawMidi + (1 - EMA_ALPHA) * smoothedMidiRef.current
    }
    return { hz: midiToHz(smoothedMidiRef.current), confidence: mic.pitch.confidence, voiced: true }
  }, [mic.voiced, mic.pitch])

  // Update pitch display
  useEffect(() => {
    if (mic.voiced && mic.pitch && mic.pitch.confidence >= 0.6) {
      setPitchDisplay({ note: noteName(mic.pitch.hz), cents: hzToCents(mic.pitch.hz) })
    } else {
      setPitchDisplay(null)
    }
  }, [mic.voiced, mic.pitch])

  // Real-time segment evaluation (Practice mode only)
  // As each segment of a note passes, check if user pitch matches
  useEffect(() => {
    if (!isPlaying || playbackMode !== 'practice') return

    for (let i = 0; i < melody.notes.length; i++) {
      const note = melody.notes[i]
      const noteStart = note.startBeat

      // Skip if we haven't reached this note yet
      if (currentBeat < noteStart) continue

      // Calculate total segments for this note
      const totalSegments = Math.ceil(note.durationBeats * SEGMENTS_PER_BEAT)

      // Calculate how many segments have passed
      const beatsPassed = Math.min(currentBeat - noteStart, note.durationBeats)
      const segmentsPassed = Math.floor(beatsPassed * SEGMENTS_PER_BEAT)

      // Get last evaluated segment for this note
      const lastSegment = lastSegmentRef.current.get(i) ?? -1

      // Evaluate new segments
      if (segmentsPassed > lastSegment) {
        const currentSegments = noteSegments.get(i) ?? []
        const newSegments = [...currentSegments]

        // For each new segment, check if user is currently matching
        for (let s = lastSegment + 1; s <= segmentsPassed && s < totalSegments; s++) {
          // Check if user pitch matches the note
          let matched = false
          if (userPitch && userPitch.voiced && userPitch.confidence > 0.6) {
            const cents = Math.abs(centsFromTarget(userPitch.hz, note.midi + transpose))
            matched = cents <= EVAL_CONFIG.toleranceCents
          }
          newSegments[s] = matched
        }

        lastSegmentRef.current.set(i, segmentsPassed)
        setNoteSegments(prev => new Map(prev).set(i, newSegments))
      }
    }
  }, [isPlaying, playbackMode, currentBeat, melody.notes, userPitch, noteSegments, transpose])

  const handleNoteHit = useCallback(
    (midi: number, noteIndex: number, durationBeats: number) => {
      if (playbackMode !== 'demo') return  // No sound in practice mode
      if (!playedNotesRef.current.has(noteIndex)) {
        playedNotesRef.current.add(noteIndex)
        const durationSec = (durationBeats * 60) / bpm
        playNote(midi + transpose, durationSec)
      }
    },
    [playNote, bpm, playbackMode, transpose]
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
        lastSegmentRef.current.clear()
        setNoteSegments(new Map())
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
    if (playbackMode === 'practice') {
      mic.start()
    }
    startTimeRef.current = 0
    setIsPlaying(true)
  }

  const handleStop = () => {
    if (!isPlaying) return
    if (playbackMode === 'practice') {
      mic.stop()
    }
    cancelAnimationFrame(animationRef.current)
    stopAll()
    playedNotesRef.current.clear()
    lastSegmentRef.current.clear()
    setNoteSegments(new Map())
    setIsPlaying(false)
  }

  const handleReset = () => {
    handleStop()
    playedNotesRef.current.clear()
    lastSegmentRef.current.clear()
    setNoteSegments(new Map())
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
        userPitch={playbackMode === 'practice' ? userPitch : null}
        noteSegments={playbackMode === 'practice' ? noteSegments : undefined}
        transpose={transpose}
      />

      {playbackMode === 'practice' && (
        <p className="pitch-readout">
          {pitchDisplay
            ? `${pitchDisplay.note} ${pitchDisplay.cents >= 0 ? '+' : ''}${pitchDisplay.cents}¢`
            : '\u00A0'}
        </p>
      )}

      <div className="melody-controls">
        <button onClick={() => setTranspose(t => t - 12)} disabled={isPlaying}>
          -1 Oct
        </button>
        <span>Transpose: {transpose >= 0 ? '+' : ''}{transpose}</span>
        <button onClick={() => setTranspose(t => t + 12)} disabled={isPlaying}>
          +1 Oct
        </button>
      </div>

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
        <button
          onClick={() => setPlaybackMode('demo')}
          className={`nav-link ${playbackMode === 'demo' ? 'active' : ''}`}
          disabled={isPlaying}
        >
          Demo
        </button>
        <button
          onClick={() => setPlaybackMode('practice')}
          className={`nav-link ${playbackMode === 'practice' ? 'active' : ''}`}
          disabled={isPlaying}
        >
          Practice
        </button>
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
