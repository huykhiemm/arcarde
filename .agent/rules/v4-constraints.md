---
trigger: always_on
---
# Hard Constraints — Arcade v4 (Technical Monograph)

## Visual & UI
- Palette: Dark bg `#0E1116`, Light bg `#F7F7F4`, border `1px solid`, single accent Botanical Green (Dark `#5FA777`, Light `#2D6A4F`). Primary buttons use `color: var(--on-accent)`.
- Typography: Use `tabular-nums` for all counters, timers, scores, and telemetry metrics.
- FORBIDDEN: Emoji as UI icons (must use thin-stroke inline SVG), grid noise backgrounds (`body::before`), neon glow/box-shadow, macOS 3-dot window headers, pulsing status dots, inline `style="..."` in HTML.
- Accessibility: Semantic `<button>` for interactive elements, visible `:focus-visible`, honor `prefers-reduced-motion`.

## Architecture
- Zero-build Vanilla ES Modules (`type="module"`), Hash Router (`#/sorting`, `#/caro`, `#/2048`, `#/rps`).
- Strictly separate pure logic (`js/engines/`) from DOM rendering (`js/views/`).
- Never destroy/recreate full DOM via `innerHTML` inside animation loops; mutate `style.height`/`transform` on existing nodes.
- Web Workers MUST use relative URL resolution for GitHub Pages subpath compatibility:
  `new Worker(new URL('../workers/<name>.worker.js', import.meta.url), { type: 'module' })`