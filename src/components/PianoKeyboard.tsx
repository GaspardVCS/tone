import { noteName } from '../dsp/notes'

interface Props {
  onKeyClick: (midi: number) => void
  targetMidi: number | null
}

const C3 = 48
const B4 = 71

function PianoKeyboard({ onKeyClick, targetMidi }: Props) {
  const keys: number[] = []
  for (let m = C3; m <= B4; m++) keys.push(m)

  return (
    <div className="piano-keyboard">
      {keys.map((midi) => {
        const name = noteName(440 * Math.pow(2, (midi - 69) / 12))
        const isBlack = name.includes('#')
        const isActive = midi === targetMidi
        const cls = `piano-key ${isBlack ? 'piano-key-black' : 'piano-key-white'} ${isActive ? 'piano-key-active' : ''}`
        return (
          <button
            key={midi}
            className={cls}
            onClick={() => onKeyClick(midi)}
            aria-label={name}
          >
            {!isBlack && <span className="piano-key-label">{name}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default PianoKeyboard
