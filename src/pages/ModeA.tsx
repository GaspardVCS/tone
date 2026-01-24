import { Link } from 'react-router-dom'
import { useMic } from '../hooks/useMic'

function ModeA() {
  const { active, rms, voiced, start, stop } = useMic()

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
        </>
      )}

      <Link to="/" className="nav-link">Back</Link>
    </div>
  )
}

export default ModeA
