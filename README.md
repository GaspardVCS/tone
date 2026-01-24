# Tone — Ear Training PWA

A progressive web app for musical ear training, built with React + TypeScript + Vite.

## Quick Start

```bash
npm install
npm run dev          # Dev server at http://localhost:5173
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + produce production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run TypeScript compiler (no emit) |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

## Project Structure

```
src/
  main.tsx                App entry point (BrowserRouter wrapper)
  App.tsx                 Route definitions
  App.css                 Global styles (meter, badges, nav)
  index.css               Base reset styles
  pages/
    Landing.tsx           Home screen with mode navigation
    ModeA.tsx             Audio input + level meter + pitch display
    ModeB.tsx             Placeholder
  dsp/
    config.ts             DSP constants (thresholds, FFT size, YIN params)
    rms.ts                Pure RMS calculation function
    rms.test.ts           Unit tests for RMS
    notes.ts              Note math: hzToMidi, midiToHz, hzToCents, noteName
    notes.test.ts         Unit tests for note math
    yin.ts                YIN pitch detection algorithm
    yin.test.ts           Unit tests for YIN (synthetic sine waves)
  hooks/
    useMic.ts             Custom hook: mic access, AnalyserNode, pitch detection
```

## Design Choices

### Audio Pipeline

```
Button click → AudioContext.resume() → getUserMedia
  → MediaStreamSource → AnalyserNode → getFloatTimeDomainData
  → calcRms() → threshold comparison → voiced?
      → yes: detectPitch(buffer, sampleRate) → { hz, confidence }
      → no:  pitch = null
  → setState (rms, voiced, pitch)
```

**Why AnalyserNode over AudioWorklet?**
- `getFloatTimeDomainData` is synchronous and universally supported (including Safari/iOS)
- No module-serving complications (AudioWorklet requires a separate JS file with correct MIME)
- Sufficient for UI-rate level metering (~60 reads/sec via rAF)

**Why requestAnimationFrame over setInterval?**
- Syncs with display refresh rate — no wasted work between paints
- Automatically pauses when the tab is backgrounded (saves battery)
- Each frame: read samples, compute RMS, set React state

**iOS/Safari autoplay policy:**
- `AudioContext` is created *and* `.resume()`d inside the button click handler
- This satisfies the browser requirement that audio contexts start from a user gesture

### DSP Configuration (`src/dsp/config.ts`)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `RMS_THRESHOLD` | 0.01 | Mic noise floor is typically 0.003–0.008; 0.01 cleanly separates silence from voice |
| `FFT_SIZE` | 2048 | ~21 Hz frequency bins at 44.1 kHz, ~46 ms analysis window |
| `ANALYSER_SMOOTHING` | 0.8 | Smooths frequency-domain jitter without perceptible lag |
| `YIN_THRESHOLD` | 0.15 | Cumulative mean normalized difference threshold (from the original paper) |
| `YIN_MIN_HZ` | 60 | Lowest detectable pitch — covers bass C2 (~65 Hz) with margin |
| `YIN_MAX_HZ` | 1000 | Highest detectable pitch — covers soprano C6 (~1047 Hz) |

### RMS Calculation (`src/dsp/rms.ts`)

A pure function (`Float32Array -> number`) with no dependencies. Returns 0 for empty buffers (avoids NaN from division by zero). Trivially testable and reusable for future DSP stages.

### YIN Pitch Detection (`src/dsp/yin.ts`)

YIN is an autocorrelation-based fundamental frequency estimator introduced by de Cheveigné & Kawahara (2002). It is well-suited for monophonic vocal pitch tracking because it handles harmonic-rich signals without octave errors better than naive approaches (zero-crossing, raw FFT peak picking).

The implementation follows six steps:

#### Step 1 — Difference Function

For each lag `τ`, compute the squared difference between the signal and a lagged copy of itself:

```
d(τ) = Σ_{i=0}^{W-1} (x[i] - x[i + τ])²
```

where `W` is the analysis window (half the buffer length). When `τ` equals the true period of the signal, `d(τ)` reaches a minimum because the waveform aligns with itself.

#### Step 2 — Cumulative Mean Normalized Difference

Raw `d(τ)` has no fixed scale and always starts at zero for `τ = 0`, making threshold-based detection unreliable. The cumulative mean normalization divides each value by the running average of all preceding values:

```
d'(τ) = d(τ) / ((1/τ) Σ_{j=1}^{τ} d(j))
```

This transforms the function so that `d'(0) = 1` by definition and dips below 1.0 at periodic lags. The normalization eliminates amplitude dependence — the same threshold works regardless of input volume.

#### Step 3 — Absolute Threshold

Scan `d'(τ)` from the minimum lag (`sampleRate / MAX_HZ`) to the maximum lag (`sampleRate / MIN_HZ`). The first lag where `d'(τ)` drops below the threshold (0.15) is selected as a candidate. The search then continues to find the local minimum past that crossing point, which gives a more precise estimate than taking the first sub-threshold sample.

The threshold value of 0.15 comes from the original YIN paper. Lower values are stricter (fewer false detections, more dropouts); higher values are more permissive.

#### Step 4 — Parabolic Interpolation

The true period rarely falls exactly on an integer sample lag. Parabolic interpolation refines the estimate to sub-sample accuracy by fitting a parabola through three points (`d'[τ-1]`, `d'[τ]`, `d'[τ+1]`) and finding its vertex:

```
shift = (d'[τ-1] - d'[τ+1]) / (2 * (d'[τ-1] - 2*d'[τ] + d'[τ+1]))
τ_refined = τ + shift
```

This typically improves accuracy by 1–3 cents compared to integer-lag detection.

#### Step 5 — Frequency Calculation

Convert the refined lag to frequency:

```
hz = sampleRate / τ_refined
```

#### Step 6 — Confidence Score

Confidence is derived from the normalized difference value at the best lag:

```
confidence = 1 - d'(τ_best)
```

A perfect periodic signal yields confidence near 1.0. Noisy or aperiodic signals produce lower values. The UI displays this so the user can gauge detection reliability.

#### Why YIN over alternatives?

| Approach | Problem |
|----------|---------|
| Zero-crossing | Fails on harmonic-rich signals (multiple crossings per cycle) |
| FFT peak picking | Frequency resolution limited by bin size; prone to picking harmonics |
| Autocorrelation (raw) | No normalization — threshold must be tuned per-volume; octave errors |
| YIN | Normalized + threshold + interpolation — robust for vocal monophonic input |

#### Performance Considerations

- YIN only runs when `voiced === true` (RMS above threshold), avoiding wasted computation on silence
- The lag search range is bounded by `[MIN_HZ, MAX_HZ]`, reducing the inner loop iterations
- With FFT_SIZE=2048 at 44.1 kHz (~46 ms window), the maximum lag of 735 samples (60 Hz) fits comfortably

### Note Math (`src/dsp/notes.ts`)

Four pure functions for musical pitch conversion:

- `hzToMidi(hz)` — frequency to MIDI note number (fractional): `69 + 12 * log2(hz / 440)`
- `midiToHz(midi)` — MIDI note number to frequency: `440 * 2^((midi - 69) / 12)`
- `hzToCents(hz)` — cents offset from nearest note (-50 to +50)
- `noteName(hz)` — note name with octave (e.g. "A4", "C#5")

### useMic Hook (`src/hooks/useMic.ts`)

Encapsulates all Web Audio state behind a simple interface:

```ts
const { active, rms, voiced, pitch, start, stop } = useMic()
```

- `start()` — creates AudioContext, requests mic, starts rAF loop
- `stop()` — cancels rAF, stops media tracks, closes AudioContext (no leaks)
- `active` — whether mic is streaming
- `rms` — current level (0.0–~1.0)
- `voiced` — whether RMS >= threshold
- `pitch` — `{ hz, confidence } | null` — YIN result when voiced, null otherwise

### Testing

[Vitest](https://vitest.dev/) shares Vite's transform pipeline — zero extra config.

```bash
npm test   # 21 tests across 3 suites: rms, notes, yin
```

- **rms.test.ts** — empty buffer, silence, single sample, DC offset, sine wave
- **notes.test.ts** — hzToMidi (A4, C4, A3), midiToHz, hzToCents (exact/sharp/flat), noteName (A4, C4, A5, C3)
- **yin.test.ts** — synthetic sine waves at 220/440/880 Hz (detected within 1 Hz, confidence > 0.9), silence returns null

### PWA

Configured via `vite-plugin-pwa`:
- `autoUpdate` service worker (no user prompt on new versions)
- Standalone display mode
- Dark theme (`#1a1a2e`)

## Technology Stack

| Tool | Role |
|------|------|
| React 18 | UI components |
| TypeScript | Static typing |
| Vite | Build tool + dev server |
| react-router-dom | Client-side routing |
| vite-plugin-pwa | Service worker + manifest generation |
| Vitest | Unit testing |
| ESLint | Linting |

## Browser Support

Requires:
- `navigator.mediaDevices.getUserMedia`
- `AnalyserNode.getFloatTimeDomainData`
- `AudioContext`

Supported: Chrome 49+, Firefox 25+, Safari 14.1+, Edge 79+.
