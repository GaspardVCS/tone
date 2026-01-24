import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import ModeA from './pages/ModeA'
import ModeB from './pages/ModeB'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/mode-a" element={<ModeA />} />
      <Route path="/mode-b" element={<ModeB />} />
    </Routes>
  )
}

export default App
