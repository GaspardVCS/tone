import { Link } from 'react-router-dom'

function ModeA() {
  return (
    <div className="page">
      <h1>Mode A</h1>
      <p>Placeholder for Mode A.</p>
      <Link to="/" className="nav-link">Back</Link>
    </div>
  )
}

export default ModeA
