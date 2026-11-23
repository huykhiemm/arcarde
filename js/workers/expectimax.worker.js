import { DIRECTIONS, countEmptyCells } from '../engines/game2048.engine.js';

// Precomputed 16-bit row lookup tables (65,536 states; each nibble is log2(tile) in 0..15).
// Allows O(1) slide transitions and O(1) 5-component heuristic evaluation without cloning 2D arrays.
const LEFT_TABLE = new Uint16Array(65536);
const RIGHT_TABLE = new Uint16Array(65536);

const ROW_EMPTY_COUNT = new Uint8Array(65536);
const ROW_MONO = new Float32Array(65536);
const ROW_SMOOTH = new Float32Array(65536);
const ROW_MERGES = new Float32Array(65536);
const ROW_LINE_SUM = new Float32Array(65536);

// Precomputed Snake-gradient contribution per row (top-left anchor: row 0 L->R, row 1 R->L, row 2 L->R, row 3 R->L)
const ROW_SNAKE_0 = new Float32Array(65536);
const ROW_SNAKE_1 = new Float32Array(65536);
const ROW_SNAKE_2 = new Float32Array(65536);
const ROW_SNAKE_3 = new Float32Array(65536);

// Nonlinear empty cell bonus for 0..16 empty slots
const EMPTY_BONUS = new Float32Array(17);
for (let e = 0; e <= 16; e++) {
  EMPTY_BONUS[e] = Math.round(e * 280 + Math.pow(e, 1.85) * 48);
}

// Snake rank layout (15 highest at top-left -> 0 lowest at bottom-left)
const SNAKE_RANKS = [
  [15, 14, 13, 12],
  [8, 9, 10, 11],
  [7, 6, 5, 4],
  [0, 1, 2, 3],
];

const SNAKE_W = SNAKE_RANKS.map((row) =>
  row.map((rank) => Math.pow(1.65, rank) * 0.085),
);

// Tile weight by exponent (0 => 0, k => k^2.15) keeps corner score strong yet balanced across 2..4096
const EXP_POW = new Float32Array(16);
for (let k = 1; k < 16; k++) {
  EXP_POW[k] = Math.pow(k, 2.15);
}

function slideNibblesLeft(a, b, c, d) {
  const arr = [];
  if (a) arr.push(a);
  if (b) arr.push(b);
  if (c) arr.push(c);
  if (d) arr.push(d);

  const out = [0, 0, 0, 0];
  let idx = 0;
  let i = 0;
  while (i < arr.length) {
    if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
      out[idx++] = Math.min(15, arr[i] + 1);
      i += 2;
    } else {
      out[idx++] = arr[i];
      i += 1;
    }
  }
  return (out[0] << 12) | (out[1] << 8) | (out[2] << 4) | out[3];
}

function reverseRow(row) {
  return (
    ((row & 0x000f) << 12) |
    ((row & 0x00f0) << 4) |
    ((row & 0x0f00) >> 4) |
    ((row & 0xf000) >> 12)
  );
}

// Initialize all 65,536 row tables once at Worker startup (~5ms)
(function initLookupTables() {
  const s0 = SNAKE_W[0];
  const s1 = SNAKE_W[1];
  const s2 = SNAKE_W[2];
  const s3 = SNAKE_W[3];

  for (let row = 0; row < 65536; row++) {
    const a = (row >> 12) & 0xf;
    const b = (row >> 8) & 0xf;
    const c = (row >> 4) & 0xf;
    const d = row & 0xf;

    LEFT_TABLE[row] = slideNibblesLeft(a, b, c, d);
    RIGHT_TABLE[row] = reverseRow(slideNibblesLeft(d, c, b, a));

    let empty = 0;
    if (a === 0) empty++;
    if (b === 0) empty++;
    if (c === 0) empty++;
    if (d === 0) empty++;
    ROW_EMPTY_COUNT[row] = empty;

    // 1. Corner snake weights for each of the 4 board rows
    const pa = EXP_POW[a];
    const pb = EXP_POW[b];
    const pc = EXP_POW[c];
    const pd = EXP_POW[d];
    ROW_SNAKE_0[row] = pa * s0[0] + pb * s0[1] + pc * s0[2] + pd * s0[3];
    ROW_SNAKE_1[row] = pa * s1[0] + pb * s1[1] + pc * s1[2] + pd * s1[3];
    ROW_SNAKE_2[row] = pa * s2[0] + pb * s2[1] + pc * s2[2] + pd * s2[3];
    ROW_SNAKE_3[row] = pa * s3[0] + pb * s3[1] + pc * s3[2] + pd * s3[3];

    // 2. Monotonicity (reward ordered progression, penalize inversions)
    const line = [a, b, c, d];
    let monoLeft = 0;
    let monoRight = 0;
    for (let i = 1; i < 4; i++) {
      const prev = line[i - 1];
      const cur = line[i];
      if (prev >= cur) {
        monoLeft += (prev + cur) * 16;
      } else {
        monoLeft -= (cur - prev) * cur * 26;
      }
      if (cur >= prev) {
        monoRight += (prev + cur) * 16;
      } else {
        monoRight -= (prev - cur) * prev * 26;
      }
    }
    const monoScore = monoLeft >= monoRight ? monoLeft : monoRight;

    // 3. Smoothness (penalize log2 gap between adjacent non-zero tiles)
    // 4. Merge potential (reward equal adjacent non-zero tiles ready to merge)
    let smoothScore = 0;
    let mergeScore = 0;
    let prevNz = 0;
    for (let i = 0; i < 4; i++) {
      const cur = line[i];
      if (cur === 0) continue;
      if (prevNz !== 0) {
        if (cur === prevNz) {
          mergeScore += 240 + cur * 95;
        } else {
          const diff = cur > prevNz ? cur - prevNz : prevNz - cur;
          smoothScore -= diff * (cur + prevNz) * 11;
        }
      }
      prevNz = cur;
    }

    ROW_MONO[row] = monoScore;
    ROW_SMOOTH[row] = smoothScore;
    ROW_MERGES[row] = mergeScore;
    ROW_LINE_SUM[row] = monoScore + smoothScore + mergeScore;
  }
})();

function valueToExp(val) {
  if (!val || val <= 0) return 0;
  let exp = 0;
  let v = val;
  while (v > 1 && exp < 15) {
    v >>= 1;
    exp++;
  }
  return exp;
}

function matrixToRows(matrix) {
  let maxTile = 0;
  const rows = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    const v0 = matrix[r][0];
    const v1 = matrix[r][1];
    const v2 = matrix[r][2];
    const v3 = matrix[r][3];
    if (v0 > maxTile) maxTile = v0;
    if (v1 > maxTile) maxTile = v1;
    if (v2 > maxTile) maxTile = v2;
    if (v3 > maxTile) maxTile = v3;
    rows[r] =
      (valueToExp(v0) << 12) |
      (valueToExp(v1) << 8) |
      (valueToExp(v2) << 4) |
      valueToExp(v3);
  }
  return { rows, maxTile };
}

function transposeRows(r0, r1, r2, r3) {
  const c0 = (r0 & 0xf000) | ((r1 & 0xf000) >> 4) | ((r2 & 0xf000) >> 8) | ((r3 & 0xf000) >> 12);
  const c1 = ((r0 & 0x0f00) << 4) | (r1 & 0x0f00) | ((r2 & 0x0f00) >> 4) | ((r3 & 0x0f00) >> 8);
  const c2 = ((r0 & 0x00f0) << 8) | ((r1 & 0x00f0) << 4) | (r2 & 0x00f0) | ((r3 & 0x00f0) >> 4);
  const c3 = ((r0 & 0x000f) << 12) | ((r1 & 0x000f) << 8) | ((r2 & 0x000f) << 4) | (r3 & 0x000f);
  return [c0, c1, c2, c3];
}

function moveRows(r0, r1, r2, r3, dir) {
  if (dir === 'left') {
    const n0 = LEFT_TABLE[r0];
    const n1 = LEFT_TABLE[r1];
    const n2 = LEFT_TABLE[r2];
    const n3 = LEFT_TABLE[r3];
    if (n0 === r0 && n1 === r1 && n2 === r2 && n3 === r3) return null;
    return [n0, n1, n2, n3];
  }
  if (dir === 'right') {
    const n0 = RIGHT_TABLE[r0];
    const n1 = RIGHT_TABLE[r1];
    const n2 = RIGHT_TABLE[r2];
    const n3 = RIGHT_TABLE[r3];
    if (n0 === r0 && n1 === r1 && n2 === r2 && n3 === r3) return null;
    return [n0, n1, n2, n3];
  }
  const [c0, c1, c2, c3] = transposeRows(r0, r1, r2, r3);
  const tbl = dir === 'up' ? LEFT_TABLE : RIGHT_TABLE;
  const nc0 = tbl[c0];
  const nc1 = tbl[c1];
  const nc2 = tbl[c2];
  const nc3 = tbl[c3];
  if (nc0 === c0 && nc1 === c1 && nc2 === c2 && nc3 === c3) return null;
  return transposeRows(nc0, nc1, nc2, nc3);
}

// Fast O(1) scalar board evaluation used at Expectimax leaves
function evaluateRowsFast(r0, r1, r2, r3) {
  const c0 = (r0 & 0xf000) | ((r1 & 0xf000) >> 4) | ((r2 & 0xf000) >> 8) | ((r3 & 0xf000) >> 12);
  const c1 = ((r0 & 0x0f00) << 4) | (r1 & 0x0f00) | ((r2 & 0x0f00) >> 4) | ((r3 & 0x0f00) >> 8);
  const c2 = ((r0 & 0x00f0) << 8) | ((r1 & 0x00f0) << 4) | (r2 & 0x00f0) | ((r3 & 0x00f0) >> 4);
  const c3 = ((r0 & 0x000f) << 12) | ((r1 & 0x000f) << 8) | ((r2 & 0x000f) << 4) | (r3 & 0x000f);

  const empty =
    ROW_EMPTY_COUNT[r0] + ROW_EMPTY_COUNT[r1] + ROW_EMPTY_COUNT[r2] + ROW_EMPTY_COUNT[r3];

  return (
    ROW_SNAKE_0[r0] + ROW_SNAKE_1[r1] + ROW_SNAKE_2[r2] + ROW_SNAKE_3[r3] +
    EMPTY_BONUS[empty] +
    ROW_LINE_SUM[r0] + ROW_LINE_SUM[r1] + ROW_LINE_SUM[r2] + ROW_LINE_SUM[r3] +
    ROW_LINE_SUM[c0] + ROW_LINE_SUM[c1] + ROW_LINE_SUM[c2] + ROW_LINE_SUM[c3]
  );
}

// Detailed 5-component heuristic breakdown for root candidate moves
function evaluateBreakdown(r0, r1, r2, r3) {
  const [c0, c1, c2, c3] = transposeRows(r0, r1, r2, r3);
  const emptyCount =
    ROW_EMPTY_COUNT[r0] + ROW_EMPTY_COUNT[r1] + ROW_EMPTY_COUNT[r2] + ROW_EMPTY_COUNT[r3];

  const corner = Math.round(
    ROW_SNAKE_0[r0] + ROW_SNAKE_1[r1] + ROW_SNAKE_2[r2] + ROW_SNAKE_3[r3],
  );
  const monotonicity = Math.round(
    ROW_MONO[r0] + ROW_MONO[r1] + ROW_MONO[r2] + ROW_MONO[r3] +
    ROW_MONO[c0] + ROW_MONO[c1] + ROW_MONO[c2] + ROW_MONO[c3],
  );
  const smoothness = Math.round(
    ROW_SMOOTH[r0] + ROW_SMOOTH[r1] + ROW_SMOOTH[r2] + ROW_SMOOTH[r3] +
    ROW_SMOOTH[c0] + ROW_SMOOTH[c1] + ROW_SMOOTH[c2] + ROW_SMOOTH[c3],
  );
  const empty = Math.round(EMPTY_BONUS[emptyCount]);
  const merges = Math.round(
    ROW_MERGES[r0] + ROW_MERGES[r1] + ROW_MERGES[r2] + ROW_MERGES[r3] +
    ROW_MERGES[c0] + ROW_MERGES[c1] + ROW_MERGES[c2] + ROW_MERGES[c3],
  );

  return { corner, monotonicity, smoothness, empty, merges };
}

const PROB_PRUNE_FOUR = 0.0025; // Skip 4-tile branch (0.1) if cumulative prob < 0.0025
const PROB_LEAF_CUTOFF = 0.0004; // Prevent exponential blowup on deep searches
const TT_MAX_ENTRIES = 50000;
const TT_EVICT_BATCH = 12500;
const TERMINAL_PENALTY = -500000;

// Adaptive Depth: >=8 empty -> D3, 4..7 empty -> D4, <=3 empty -> D5 (+1 when deepSearch)
function computeAdaptiveDepth(emptyCount, deepSearch) {
  let base;
  if (emptyCount >= 8) base = 3;
  else if (emptyCount >= 4) base = 4;
  else base = 5;
  return deepSearch ? base + 1 : base;
}

function makeTTKey(r0, r1, r2, r3, depth, isMaxNode) {
  return (
    (BigInt(r0) << 53n) |
    (BigInt(r1) << 37n) |
    (BigInt(r2) << 21n) |
    (BigInt(r3) << 5n) |
    (BigInt(depth & 0xf) << 1n) |
    (isMaxNode ? 1n : 0n)
  );
}

function putTT(table, key, value) {
  if (table.size >= TT_MAX_ENTRIES) {
    // Evict oldest entries (FIFO order in JS Map)
    let removed = 0;
    for (const k of table.keys()) {
      table.delete(k);
      if (++removed >= TT_EVICT_BATCH) break;
    }
  }
  table.set(key, value);
}

function searchExpectimax(matrix, deepSearch = false) {
  const t0 = performance.now();
  const emptyCount = countEmptyCells(matrix);
  const depth = computeAdaptiveDepth(emptyCount, deepSearch);
  const { rows, maxTile } = matrixToRows(matrix);
  const [r0, r1, r2, r3] = rows;

  const transTable = new Map();
  let nodesEvaluated = 0;
  let cacheHits = 0;

  function expectimaxMax(a, b, c, d, remDepth, prob) {
    if (remDepth <= 0 || prob < PROB_LEAF_CUTOFF) {
      nodesEvaluated++;
      return evaluateRowsFast(a, b, c, d);
    }

    const key = makeTTKey(a, b, c, d, remDepth, true);
    const cached = transTable.get(key);
    if (cached !== undefined) {
      cacheHits++;
      return cached;
    }

    let best = -Infinity;
    let hasMove = false;

    // Inline 4 directions for minimal allocation overhead
    // Left
    const l0 = LEFT_TABLE[a];
    const l1 = LEFT_TABLE[b];
    const l2 = LEFT_TABLE[c];
    const l3 = LEFT_TABLE[d];
    if (l0 !== a || l1 !== b || l2 !== c || l3 !== d) {
      hasMove = true;
      const v = expectimaxChance(l0, l1, l2, l3, remDepth - 1, prob);
      if (v > best) best = v;
    }

    // Right
    const rg0 = RIGHT_TABLE[a];
    const rg1 = RIGHT_TABLE[b];
    const rg2 = RIGHT_TABLE[c];
    const rg3 = RIGHT_TABLE[d];
    if (rg0 !== a || rg1 !== b || rg2 !== c || rg3 !== d) {
      hasMove = true;
      const v = expectimaxChance(rg0, rg1, rg2, rg3, remDepth - 1, prob);
      if (v > best) best = v;
    }

    // Transpose once for Up & Down
    const c0 = (a & 0xf000) | ((b & 0xf000) >> 4) | ((c & 0xf000) >> 8) | ((d & 0xf000) >> 12);
    const c1 = ((a & 0x0f00) << 4) | (b & 0x0f00) | ((c & 0x0f00) >> 4) | ((d & 0x0f00) >> 8);
    const c2 = ((a & 0x00f0) << 8) | ((b & 0x00f0) << 4) | (c & 0x00f0) | ((d & 0x00f0) >> 4);
    const c3 = ((a & 0x000f) << 12) | ((b & 0x000f) << 8) | ((c & 0x000f) << 4) | (d & 0x000f);

    // Up
    const u0 = LEFT_TABLE[c0];
    const u1 = LEFT_TABLE[c1];
    const u2 = LEFT_TABLE[c2];
    const u3 = LEFT_TABLE[c3];
    if (u0 !== c0 || u1 !== c1 || u2 !== c2 || u3 !== c3) {
      hasMove = true;
      const [ur0, ur1, ur2, ur3] = transposeRows(u0, u1, u2, u3);
      const v = expectimaxChance(ur0, ur1, ur2, ur3, remDepth - 1, prob);
      if (v > best) best = v;
    }

    // Down
    const d0 = RIGHT_TABLE[c0];
    const d1 = RIGHT_TABLE[c1];
    const d2 = RIGHT_TABLE[c2];
    const d3 = RIGHT_TABLE[c3];
    if (d0 !== c0 || d1 !== c1 || d2 !== c2 || d3 !== c3) {
      hasMove = true;
      const [dr0, dr1, dr2, dr3] = transposeRows(d0, d1, d2, d3);
      const v = expectimaxChance(dr0, dr1, dr2, dr3, remDepth - 1, prob);
      if (v > best) best = v;
    }

    const result = hasMove ? best : TERMINAL_PENALTY;
    if (!hasMove) nodesEvaluated++;
    putTT(transTable, key, result);
    return result;
  }

  function expectimaxChance(a, b, c, d, remDepth, prob) {
    if (remDepth <= 0 || prob < PROB_LEAF_CUTOFF) {
      nodesEvaluated++;
      return evaluateRowsFast(a, b, c, d);
    }

    const key = makeTTKey(a, b, c, d, remDepth, false);
    const cached = transTable.get(key);
    if (cached !== undefined) {
      cacheHits++;
      return cached;
    }

    const emptyCells =
      ROW_EMPTY_COUNT[a] + ROW_EMPTY_COUNT[b] + ROW_EMPTY_COUNT[c] + ROW_EMPTY_COUNT[d];

    if (emptyCells === 0) {
      nodesEvaluated++;
      return evaluateRowsFast(a, b, c, d);
    }

    const cellProb = prob / emptyCells;
    const p2 = cellProb * 0.9;
    const p4 = cellProb * 0.1;
    const exploreFour = p4 >= PROB_PRUNE_FOUR;

    const cur = [a, b, c, d];
    let expected = 0;

    for (let r = 0; r < 4; r++) {
      const row = cur[r];
      if (ROW_EMPTY_COUNT[row] === 0) continue;

      for (let shift = 12; shift >= 0; shift -= 4) {
        if (((row >> shift) & 0xf) !== 0) continue;

        // Spawn 2 (exponent 1, probability 0.9)
        cur[r] = row | (1 << shift);
        const s2 = expectimaxMax(cur[0], cur[1], cur[2], cur[3], remDepth, p2);

        if (exploreFour) {
          // Spawn 4 (exponent 2, probability 0.1)
          cur[r] = row | (2 << shift);
          const s4 = expectimaxMax(cur[0], cur[1], cur[2], cur[3], remDepth, p4);
          expected += 0.9 * s2 + 0.1 * s4;
        } else {
          // Probability Pruning: skip 4-tile branch when cumulative prob < 0.0025
          expected += s2;
        }

        cur[r] = row;
      }
    }

    const avg = expected / emptyCells;
    putTT(transTable, key, avg);
    return avg;
  }

  // Evaluate all 4 root directions & collect 5-component heuristic breakdown
  const rawRanking = [];
  let bestMove = null;
  let bestEv = -Infinity;
  let minValidEv = Infinity;
  let maxValidEv = -Infinity;

  for (let i = 0; i < 4; i++) {
    const dir = DIRECTIONS[i];
    const next = moveRows(r0, r1, r2, r3, dir);
    if (!next) {
      rawRanking.push({
        dir,
        valid: false,
        ev: null,
        normalizedPct: 0,
        breakdown: { corner: 0, monotonicity: 0, smoothness: 0, empty: 0, merges: 0 },
      });
      continue;
    }

    const score = expectimaxChance(next[0], next[1], next[2], next[3], depth - 1, 1.0);
    const ev = Math.round(score);
    const breakdown = evaluateBreakdown(next[0], next[1], next[2], next[3]);

    if (ev < minValidEv) minValidEv = ev;
    if (ev > maxValidEv) maxValidEv = ev;
    if (score > bestEv) {
      bestEv = score;
      bestMove = dir;
    }

    rawRanking.push({
      dir,
      valid: true,
      ev,
      normalizedPct: 100,
      breakdown,
    });
  }

  // Compute normalizedPct (18..100 for valid moves so subtle differences stay clearly visible)
  const evRange = maxValidEv - minValidEv;
  const moveRanking = rawRanking.map((item) => {
    if (!item.valid) return item;
    const pct = evRange > 0
      ? Math.round(18 + ((item.ev - minValidEv) / evRange) * 82)
      : 100;
    return { ...item, normalizedPct: pct };
  });

  const rawElapsedMs = performance.now() - t0;
  const durationMs = Math.round(rawElapsedMs * 10) / 10;
  const nodesPerSec = Math.round(nodesEvaluated / (Math.max(rawElapsedMs, 0.05) / 1000));

  return {
    bestMove,
    moveRanking,
    telemetry: {
      depth,
      nodesEvaluated,
      cacheHits,
      nodesPerSec,
      durationMs,
      maxTile,
    },
  };
}

self.onmessage = (event) => {
  const { requestId, matrix, deepSearch = false } = event.data;
  const result = searchExpectimax(matrix, Boolean(deepSearch));
  self.postMessage({
    requestId,
    bestMove: result.bestMove,
    moveRanking: result.moveRanking,
    telemetry: result.telemetry,
  });
};
