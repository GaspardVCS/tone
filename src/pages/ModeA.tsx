import { Link } from 'react-router-dom'
import { useMic } from '../hooks/useMic'
import { noteName, hzToCents } from '../dsp/notes'

function ModeA() {
  const { active, rms, voiced, pitch, start, stop } = useMic()

  return (
    <div className="page">
      <h1>Mode A</h1>

      <button
        className="nav-link"
        onClick={active ? stop : start}
      >
        {active ? 'Stop Mic' : 'Start Mic'}
      </button>

      {active && (
        <>
          <div className="meter">
            <div
              className="meter-fill"
              style={{ width: `${Math.min(rms * 300, 100)}%` }}
            />
          </div>
          <span className={`badge ${voiced ? 'badge-voiced' : 'badge-unvoiced'}`}>
            {voiced ? 'Voiced' : 'Unvoiced'}
          </span>
          {pitch && (
            <div className="pitch-display">
              <span className="pitch-hz">{Math.round(pitch.hz)} Hz</span>
              <span className="pitch-note">{noteName(pitch.hz)}</span>
              <span className="pitch-cents">{hzToCents(pitch.hz) >= 0 ? '+' : ''}{hzToCents(pitch.hz)}c</span>
              <span className="pitch-confidence">confidence: {pitch.confidence.toFixed(2)}</span>
            </div>
          )}
        </>
      )}

      <Link to="/" className="nav-link">Back</Link>
    </div>
  )
}

export default ModeA
