import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMic } from '../hooks/useMic'
import { useOscillator } from '../hooks/useOscillator'
import { noteName, centsFromTarget } from '../dsp/notes'
import PianoKeyboard from '../components/PianoKeyboard'
import TunerGauge from '../components/TunerGauge'

function ModeA() {
  const { active, pitch, start, stop } = useMic()
  const { play } = useOscillator()
  const [targetMidi, setTargetMidi] = useState<number | null>(null)

  const handleKeyClick = (midi: number) => {
    setTargetMidi(midi)
    play(midi)
  }

  const cents = pitch && targetMidi !== null
    ? centsFromTarget(pitch.hz, targetMidi)
    : null

  return (
    <div className="page">
      <h1>Mode A — Single Note Tuner</h1>

      <button
        className="nav-link"
        onClick={active ? stop : start}
      >
        {active ? 'Stop Mic' : 'Start Mic'}
      </button>

      <TunerGauge cents={cents} />

      {active && pitch && (
        <div className="pitch-display">
          <span className="pitch-hz">{Math.round(pitch.hz)} Hz</span>
          <span className="pitch-note">{noteName(pitch.hz)}</span>
          <span className="pitch-confidence">confidence: {pitch.confidence.toFixed(2)}</span>
        </div>
      )}

      <PianoKeyboard onKeyClick={handleKeyClick} targetMidi={targetMidi} />

      <Link to="/" className="nav-link">Back</Link>
    </div>
  )
}

export default ModeA
