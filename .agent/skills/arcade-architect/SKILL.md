---
name: arcade-architect
description: Refactor and implement algorithm modules (Sorting, Caro Minimax, 2048 Expectimax, RPS Markov) with Live Telemetry and 60fps DOM updates.
---
# Arcade v4 Implementation Protocol

## Core Preservation
- Keep Generator-based step execution for Sorting (7 algorithms) and 3-gram + 1st-order Markov transition matrix for RPS.
- Preserve backward compatibility with existing `localStorage` keys (`kh-history`, `kh-2048-best`).

## Module Deliverables
- **Sorting:** In-place bar mutation, accurate comparison count (fix Insertion Sort last comparison), auto-stop on route change.
- **Caro:** Minimax + Alpha-Beta + Move Ordering inside `caro.worker.js`, cancel stale moves on reset, expose Telemetry (nodes visited, pruned branches, depth, eval time ms).
- **2048:** CSS transform positioning (no tile flicker), win state persistence, Expectimax Hint/Auto-play in `expectimax.worker.js` with adaptive depth.
- **RPS:** Render live 3x3 Markov transition heatmap + prediction confidence.

## Verification
- Run a local HTTP server (never test ES Modules via `file://`).
- Verify zero console errors, responsive layout (375px & 1440px), and clean Git commits (`feat:`, `refactor:`, `style:`).