# KH / ALGO LAB

Interactive algorithm laboratory & real-time telemetry suite built with zero-build Vanilla ES Modules and Web Workers.

**Live Demo:** https://huykhiemm.github.io/arcarde/

---

## Core Modules & Algorithms

| Module | Algorithms & Data Structures | Complexity | Optimization & Telemetry |
| :--- | :--- | :--- | :--- |
| **Sorting Visualizer** | 7 ES6 Generator algorithms: Bubble, Insertion, Selection, Quick, Merge, Heap, Shell | `O(n log n)` – `O(n²)` time; `O(1)` – `O(n)` space | In-place DOM bar height & class mutation at 60fps (zero `innerHTML` rebuilds), live comparison/swap counters |
| **Caro (Gomoku) AI** | 15×15 Minimax + Alpha-Beta Pruning + Move Ordering | `O(b^(d/2))` effective with pruning | Open / half-open / split-pattern scoring across 72 precomputed lines, candidate radius pruning, offloaded to `caro.worker.js` with live node & prune-rate telemetry |
| **2048 Expectimax** | Expectimax search over 4×4 board state | Adaptive depth `3`–`6` plies | `Uint16Array` 16-bit row lookup tables, Transposition Table (`Map` / cache hits), Probability Pruning (`p ≥ 0.0001`), >3M nodes/s on `expectimax.worker.js` + 4-direction EV overlay |
| **RPS Markov** | 3-gram pattern matching + 1st-order Markov transition matrix + Frequency fallback | `O(1)` per-round update & lookup | Sliding window (`30` rounds), layered prediction confidence, live 3×3 transition matrix heatmap |

---

## Architecture

Zero-build **Vanilla ES Modules** (`type="module"`) with a hash-based router (`#/`, `#/sorting`, `#/caro`, `#/2048`, `#/rps`) and strict separation between pure algorithm engines, background Web Workers, and DOM views. Styled with the **Botanical Technical Monograph** design system (Dark `#0E1116` / Light `#F7F7F4`, single Botanical Green accent `#5FA777` / `#2D6A4F`, `tabular-nums` telemetry).

```mermaid
flowchart LR
    subgraph Core["js/core/"]
        Router["router.js (Hash Router)"]
        Store["store.js (Theme & State)"]
        Icons["icons.js (Inline SVG)"]
    end

    subgraph Views["js/views/"]
        Home["home.js"]
        Shell["module-shell.js"]
        SortV["sorting.view.js"]
        CaroV["caro.view.js"]
        G2048V["game2048.view.js"]
        RpsV["rps.view.js"]
    end

    subgraph Engines["js/engines/ (Pure Logic)"]
        SortE["sorting.engine.js"]
        CaroE["caro.engine.js"]
        G2048E["game2048.engine.js"]
        MarkovE["markov.engine.js"]
    end

    subgraph Workers["js/workers/ (Web Workers)"]
        CaroW["caro.worker.js"]
        ExpW["expectimax.worker.js"]
    end

    Router --> Views
    Store --> Views
    Icons --> Views
    SortV --> SortE
    RpsV --> MarkovE
    CaroV <-->|postMessage| CaroW
    G2048V <-->|postMessage| ExpW
    CaroW --> CaroE
    ExpW --> G2048E
```

### Worker Subpath Compatibility

Both Web Workers are instantiated using relative URL resolution so the app works seamlessly both at root (`/`) and on GitHub Pages subpaths (`/arcarde/`):

```js
new Worker(new URL('../workers/caro.worker.js', import.meta.url), { type: 'module' });
new Worker(new URL('../workers/expectimax.worker.js', import.meta.url), { type: 'module' });
```

---

## Local Development

ES Modules (`type="module"`) and Module Web Workers require HTTP(S) rather than `file://` due to browser CORS restrictions. Serve the repository root with any static HTTP server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
