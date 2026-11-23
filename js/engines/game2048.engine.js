// Pure 2048 engine shared by View (tile-ID state) and Expectimax Worker (matrix helpers).

export const GRID_SIZE = 4;
export const DIRECTIONS = ['up', 'down', 'left', 'right'];

export function createGameState() {
  const state = {
    size: GRID_SIZE,
    grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    score: 0,
    won: false,
    keepPlaying: false,
    over: false,
    nextId: 1,
  };
  spawnRandomTile(state);
  spawnRandomTile(state);
  return state;
}

export function spawnRandomTile(state) {
  const empty = [];
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] === null) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const tile = {
    id: state.nextId++,
    value: Math.random() < 0.9 ? 2 : 4,
    row: r,
    col: c,
    mergedFrom: null,
    isNew: true,
  };
  state.grid[r][c] = tile;
  return tile;
}

export function toMatrix(state) {
  const m = Array.from({ length: state.size }, () => new Array(state.size).fill(0));
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const t = state.grid[r][c];
      m[r][c] = t ? t.value : 0;
    }
  }
  return m;
}

export function getMaxTile(state) {
  let max = 0;
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const t = state.grid[r][c];
      if (t && t.value > max) max = t.value;
    }
  }
  return max;
}

export function countEmptyCells(matrix) {
  let empty = 0;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) empty++;
    }
  }
  return empty;
}

export function isGameOverMatrix(matrix) {
  const n = matrix.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = matrix[r][c];
      if (v === 0) return false;
      if (c + 1 < n && v === matrix[r][c + 1]) return false;
      if (r + 1 < n && v === matrix[r + 1][c]) return false;
    }
  }
  return true;
}

export function isGameOver(state) {
  return isGameOverMatrix(toMatrix(state));
}

export function continueAfterWin(state) {
  state.keepPlaying = true;
}

function getLineCoords(direction, lineIdx, size) {
  const coords = new Array(size);
  for (let i = 0; i < size; i++) {
    if (direction === 'left') coords[i] = [lineIdx, i];
    else if (direction === 'right') coords[i] = [lineIdx, size - 1 - i];
    else if (direction === 'up') coords[i] = [i, lineIdx];
    else coords[i] = [size - 1 - i, lineIdx]; // down
  }
  return coords;
}

/**
 * Applies a slide/merge move to tile-ID state in-place, preserving tile IDs for
 * non-merged tiles and recording `mergedFrom: [tileA, tileB]` for merged tiles
 * so the View can animate transforms smoothly without rebuilding DOM nodes.
 */
export function moveState(state, direction) {
  if (!DIRECTIONS.includes(direction)) {
    return { moved: false, scoreGain: 0, spawnedTile: null, reached2048: false, isOver: state.over, maxTile: getMaxTile(state) };
  }
  if (state.over || (state.won && !state.keepPlaying)) {
    return { moved: false, scoreGain: 0, spawnedTile: null, reached2048: false, isOver: state.over, maxTile: getMaxTile(state) };
  }

  const size = state.size;
  const nextGrid = Array.from({ length: size }, () => Array(size).fill(null));
  let moved = false;
  let scoreGain = 0;

  // Prepare existing tiles by clearing transient flags
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = state.grid[r][c];
      if (t) {
        t.mergedFrom = null;
        t.isNew = false;
      }
    }
  }

  for (let lineIdx = 0; lineIdx < size; lineIdx++) {
    const coords = getLineCoords(direction, lineIdx, size);
    const tiles = [];
    for (let i = 0; i < size; i++) {
      const [r, c] = coords[i];
      const t = state.grid[r][c];
      if (t) tiles.push(t);
    }

    let slot = 0;
    let i = 0;
    while (i < tiles.length) {
      const [targetR, targetC] = coords[slot];
      if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
        const tA = tiles[i];
        const tB = tiles[i + 1];
        tA.row = targetR;
        tA.col = targetC;
        tB.row = targetR;
        tB.col = targetC;

        const mergedValue = tA.value * 2;
        const mergedTile = {
          id: state.nextId++,
          value: mergedValue,
          row: targetR,
          col: targetC,
          mergedFrom: [tA, tB],
          isNew: false,
        };
        nextGrid[targetR][targetC] = mergedTile;
        scoreGain += mergedValue;
        moved = true;
        i += 2;
        slot++;
      } else {
        const t = tiles[i];
        if (t.row !== targetR || t.col !== targetC) {
          moved = true;
        }
        t.row = targetR;
        t.col = targetC;
        nextGrid[targetR][targetC] = t;
        i += 1;
        slot++;
      }
    }
  }

  if (!moved) {
    return {
      moved: false,
      scoreGain: 0,
      spawnedTile: null,
      reached2048: false,
      isOver: state.over,
      maxTile: getMaxTile(state),
    };
  }

  state.grid = nextGrid;
  state.score += scoreGain;

  const spawnedTile = spawnRandomTile(state);
  const maxTile = getMaxTile(state);
  let reached2048 = false;
  if (!state.won && maxTile >= 2048) {
    state.won = true;
    reached2048 = true;
  }

  state.over = isGameOverMatrix(toMatrix(state));

  return {
    moved: true,
    scoreGain,
    spawnedTile,
    reached2048,
    isOver: state.over,
    maxTile,
  };
}

/**
 * Pure numeric matrix move simulation (used for testing / validation / fallback).
 */
export function simulateMoveMatrix(matrix, direction) {
  const size = matrix.length;
  const next = Array.from({ length: size }, () => Array(size).fill(0));
  let moved = false;
  let scoreGain = 0;

  for (let lineIdx = 0; lineIdx < size; lineIdx++) {
    const coords = getLineCoords(direction, lineIdx, size);
    const vals = [];
    for (let i = 0; i < size; i++) {
      const [r, c] = coords[i];
      if (matrix[r][c] !== 0) vals.push(matrix[r][c]);
    }

    let slot = 0;
    let i = 0;
    while (i < vals.length) {
      const [tr, tc] = coords[slot];
      if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
        const v = vals[i] * 2;
        next[tr][tc] = v;
        scoreGain += v;
        i += 2;
      } else {
        next[tr][tc] = vals[i];
        i += 1;
      }
      slot++;
    }

    for (let k = 0; k < size; k++) {
      const [r, c] = coords[k];
      if (next[r][c] !== matrix[r][c]) moved = true;
    }
  }

  return { grid: next, moved, scoreGain };
}
