# Tone — Ear Training PWA

A progressive web app for musical ear training, built with React + TypeScript.

## Quick Start

```bash
npm install          # Like: pip install -r requirements.txt
npm run dev          # Like: flask run → opens http://localhost:5173
npm run build        # Like: python setup.py sdist → produces dist/
npm run typecheck    # Like: mypy .
npm run lint         # Like: ruff check .
```

## Technology Choices (for Python developers)

### TypeScript

Like Python with type hints (`mypy`), but enforced at build time. Catches bugs before runtime.

```typescript
function foo(x: number): string { ... }
// Python equivalent: def foo(x: int) -> str:
```

### React

A UI library (like Flask templates but reactive). You write components as functions that return HTML-like syntax (JSX). When state changes, the UI updates automatically. Think of it like Jinja templates that re-render themselves.

### Vite

The build tool (like `setuptools` + `webpack`). It bundles your code, handles imports, and runs a dev server with hot-reload (change code → browser updates instantly, no refresh needed).

### react-router-dom

URL routing (like Flask's `@app.route`). Maps URL paths to React components.

```typescript
<Route path="/mode-a" element={<ModeA />} />
// Python equivalent: @app.route("/mode-a")
```

### vite-plugin-pwa

Generates a service worker (a background script that caches your app so it works offline) and a manifest file (tells the browser this is an installable app, like a `.desktop` file on Linux).

### Web Audio API (future milestone)

Browser's built-in audio processing (like `pyaudio` but in the browser). Gives you raw microphone samples as float arrays — same concept as NumPy arrays.

### Canvas API (future milestone)

Browser's 2D drawing surface (like `matplotlib` but imperative). You draw shapes frame-by-frame for the melody visualization.

### ESLint

Like `flake8`/`ruff` for JavaScript/TypeScript. Catches style issues and common bugs.

### GitHub Actions

CI/CD (same concept as in Python projects). Runs typecheck + lint + build on every push.

## Project Structure

```
tone/
├── index.html              # Entry point (like a base template)
├── vite.config.ts          # Build config (like setup.cfg / pyproject.toml)
├── tsconfig.json           # TypeScript config (like mypy.ini)
├── eslint.config.js        # Linter config (like .flake8 / ruff.toml)
├── package.json            # Deps + scripts (like requirements.txt + Makefile)
├── public/
│   ├── icon-192.svg        # PWA icon (small)
│   └── icon-512.svg        # PWA icon (large)
├── src/
│   ├── main.tsx            # App entry (like if __name__ == "__main__")
│   ├── App.tsx             # Root component with routing
│   ├── App.css             # Component styles
│   ├── index.css           # Global styles
│   └── pages/
│       ├── Landing.tsx     # Home page with mode links
│       ├── ModeA.tsx       # Placeholder for Mode A
│       └── ModeB.tsx       # Placeholder for Mode B
└── .github/
    └── workflows/
        └── ci.yml          # CI: typecheck + lint + build
```

## How the Audio Pipeline Will Work

```
Microphone → Web Audio API → Float32Array samples
    → Pitch detection (autocorrelation or FFT)
    → Note/frequency
    → Canvas visualization (real-time waveform + detected pitch)
```

This is conceptually identical to:
```python
stream = pyaudio.open(...)
samples = np.frombuffer(stream.read(CHUNK), dtype=np.float32)
freq = detect_pitch(samples)  # autocorrelation
plot(samples, freq)           # matplotlib
```

The browser's Web Audio API gives you the same raw sample arrays, just via an `AudioWorklet` callback instead of a blocking `stream.read()`.
