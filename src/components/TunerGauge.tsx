import { DSP_CONFIG } from '../dsp/config'

interface Props {
  cents: number | null
}

function TunerGauge({ cents }: Props) {
  if (cents === null) {
    return <div className="tuner-gauge tuner-gauge-inactive"><div className="tuner-gauge-center" /></div>
  }

  const clamped = Math.max(-50, Math.min(50, cents))
  const pct = ((clamped + 50) / 100) * 100
  const absCents = Math.abs(clamped)
  const tol = DSP_CONFIG.TUNER_TOLERANCE_CENTS

  let color: string
  if (absCents <= tol) color = 'tuner-green'
  else if (absCents <= 25) color = 'tuner-yellow'
  else color = 'tuner-red'

  let direction: string
  if (absCents <= tol) direction = 'In tune'
  else if (clamped < 0) direction = 'Flat'
  else direction = 'Sharp'

  return (
    <div className="tuner-gauge">
      <div className="tuner-gauge-center" />
      <div className={`tuner-gauge-needle ${color}`} style={{ left: `${pct}%` }} />
      <div className="tuner-gauge-label">{direction} · {clamped >= 0 ? '+' : ''}{Math.round(clamped)}c</div>
    </div>
  )
}

export default TunerGauge
