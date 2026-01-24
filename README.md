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
    ModeA.tsx             Audio input + level meter + voiced/unvoiced
    ModeB.tsx             Placeholder
  dsp/
    config.ts             DSP constants (thresholds, FFT size, smoothing)
    rms.ts                Pure RMS calculation function
    rms.test.ts           Unit tests for RMS
  hooks/
    useMic.ts             Custom hook: mic access, AnalyserNode, rAF loop
```

## Design Choices

### Audio Pipeline

```
Button click → AudioContext.resume() → getUserMedia
  → MediaStreamSource → AnalyserNode → getFloatTimeDomainData
  → calcRms() → threshold comparison → setState (voiced/unvoiced)
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

### RMS Calculation (`src/dsp/rms.ts`)

A pure function (`Float32Array -> number`) with no dependencies. Returns 0 for empty buffers (avoids NaN from division by zero). Trivially testable and reusable for future DSP stages.

### useMic Hook (`src/hooks/useMic.ts`)

Encapsulates all Web Audio state behind a simple interface:

```ts
const { active, rms, voiced, start, stop } = useMic()
```

- `start()` — creates AudioContext, requests mic, starts rAF loop
- `stop()` — cancels rAF, stops media tracks, closes AudioContext (no leaks)
- `active` — whether mic is streaming
- `rms` — current level (0.0–~1.0)
- `voiced` — whether RMS >= threshold

### Testing

[Vitest](https://vitest.dev/) shares Vite's transform pipeline — zero extra config.

```bash
npm test   # 5 RMS test cases: empty, silence, single sample, DC offset, sine wave
```

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
