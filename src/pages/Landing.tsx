import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="page">
      <h1>Tone</h1>
      <p>Musical ear training in your browser.</p>
      <nav>
        <Link to="/mode-a" className="nav-link">Mode A</Link>
        <Link to="/mode-b" className="nav-link">Mode B</Link>
      </nav>
    </div>
  )
}

export default Landing
