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

      {active && (
        <div className="pitch-display" style={{ visibility: pitch ? 'visible' : 'hidden' }}>
          <span className="pitch-hz">{pitch ? Math.round(pitch.hz) : 0} Hz</span>
          <span className="pitch-note">{pitch ? noteName(pitch.hz) : 'A4'}</span>
          <span className="pitch-confidence">confidence: {pitch ? pitch.confidence.toFixed(2) : '0.00'}</span>
        </div>
      )}

      <PianoKeyboard onKeyClick={handleKeyClick} targetMidi={targetMidi} />

      <Link to="/" className="nav-link">Back</Link>
    </div>
  )
}

export default ModeA
