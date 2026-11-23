// Pure Caro (Gomoku) 15x15 engine: win/draw checks, pattern-based evaluation,
// move ordering, and Minimax with Alpha-Beta pruning. Shared by View and Worker.

export const CARO_SIZE = 15;
export const WIN_COUNT = 5;
export const PLAYER_HUMAN = 'X';
export const PLAYER_AI = 'O';

export const DIFFICULTY_DEPTH = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const DIRS = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal \
  [1, -1], // diagonal /
];

// Pattern scores
const SCORE_WIN = 1000000;
const SCORE_OPEN_4 = 100000;
const SCORE_HALF_OPEN_4 = 12000;
const SCORE_SPLIT_4 = 11000;
const SCORE_OPEN_3 = 4800;
const SCORE_SPLIT_OPEN_3 = 4000;
const SCORE_CONFINED_OPEN_3 = 1800;
const SCORE_HALF_OPEN_3 = 480;
const SCORE_SPLIT_HALF_3 = 420;
const SCORE_OPEN_2 = 180;
const SCORE_HALF_OPEN_2 = 28;
const SCORE_OPEN_1 = 6;

// Precompute all 72 lines of length >= 5 across the 15x15 board as flat [r, c] pairs.
function buildAllLines(size) {
  const lines = [];
  // Horizontal
  for (let r = 0; r < size; r++) {
    const line = [];
    for (let c = 0; c < size; c++) line.push([r, c]);
    lines.push(line);
  }
  // Vertical
  for (let c = 0; c < size; c++) {
    const line = [];
    for (let r = 0; r < size; r++) line.push([r, c]);
    lines.push(line);
  }
  // Diagonal \
  for (let startR = 0; startR <= size - WIN_COUNT; startR++) {
    const line = [];
    for (let r = startR, c = 0; r < size && c < size; r++, c++) line.push([r, c]);
    lines.push(line);
  }
  for (let startC = 1; startC <= size - WIN_COUNT; startC++) {
    const line = [];
    for (let r = 0, c = startC; r < size && c < size; r++, c++) line.push([r, c]);
    lines.push(line);
  }
  // Diagonal /
  for (let startC = WIN_COUNT - 1; startC < size; startC++) {
    const line = [];
    for (let r = 0, c = startC; r < size && c >= 0; r++, c--) line.push([r, c]);
    lines.push(line);
  }
  for (let startR = 1; startR <= size - WIN_COUNT; startR++) {
    const line = [];
    for (let r = startR, c = size - 1; r < size && c >= 0; r++, c--) line.push([r, c]);
    lines.push(line);
  }
  return lines;
}

const ALL_LINES = buildAllLines(CARO_SIZE);

export function createEmptyBoard(size = CARO_SIZE) {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function countMoves(board) {
  let n = 0;
  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '') n++;
    }
  }
  return n;
}

export function isBoardFull(board) {
  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '') return false;
    }
  }
  return true;
}

/**
 * Checks whether placing `player` at (r, c) creates >= 5 in a row.
 * Returns the ordered array of winning coordinates [[r, c], ...] or null.
 */
export function checkWin(board, r, c, player) {
  const size = board.length;
  if (board[r][c] !== player) return null;

  for (const [dr, dc] of DIRS) {
    const cells = [[r, c]];
    for (let i = 1; i < size; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
        cells.push([nr, nc]);
      } else {
        break;
      }
    }
    for (let i = 1; i < size; i++) {
      const nr = r - dr * i;
      const nc = c - dc * i;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
        cells.unshift([nr, nc]);
      } else {
        break;
      }
    }
    if (cells.length >= WIN_COUNT) {
      return cells;
    }
  }
  return null;
}

export function hasWinAt(board, r, c, player) {
  const size = board.length;
  for (let d = 0; d < 4; d++) {
    const dr = DIRS[d][0];
    const dc = DIRS[d][1];
    let count = 1;
    for (let i = 1; i < WIN_COUNT; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
        count++;
      } else {
        break;
      }
    }
    for (let i = 1; i < WIN_COUNT; i++) {
      const nr = r - dr * i;
      const nc = c - dc * i;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
        count++;
      } else {
        break;
      }
    }
    if (count >= WIN_COUNT) return true;
  }
  return false;
}

/**
 * Evaluates a single contiguous run of `player` inside a blocker-free span.
 */
function scoreRun(len, openEnds, spanLen) {
  if (len >= 5) return SCORE_WIN;
  if (spanLen < WIN_COUNT) return 0;

  if (len === 4) {
    if (openEnds === 2) return SCORE_OPEN_4;
    if (openEnds === 1) return SCORE_HALF_OPEN_4;
    return 0;
  }
  if (len === 3) {
    if (openEnds === 2) {
      return spanLen >= 6 ? SCORE_OPEN_3 : SCORE_CONFINED_OPEN_3;
    }
    if (openEnds === 1) return SCORE_HALF_OPEN_3;
    return 0;
  }
  if (len === 2) {
    if (openEnds === 2) return SCORE_OPEN_2;
    if (openEnds === 1) return SCORE_HALF_OPEN_2;
    return 0;
  }
  if (len === 1 && openEnds === 2) {
    return SCORE_OPEN_1;
  }
  return 0;
}

/**
 * Evaluates one full line of cells (values: '', 'X', 'O') for `player`.
 * Tracks contiguous runs (open-5, open-4, half-open-4, open-3, half-open-3, open-2)
 * AND 1-gap split threats (X_XX, XX_X, XXX_X, XX_XX, X_XXX).
 * Also increments threat counters on `threats` for fork detection.
 */
function evaluateLineForPlayer(cells, len, player, threats) {
  let score = 0;
  let i = 0;

  while (i < len) {
    // Skip opponent stones to find a blocker-free segment [segStart, segEnd)
    while (i < len && cells[i] !== '' && cells[i] !== player) i++;
    const segStart = i;
    while (i < len && (cells[i] === '' || cells[i] === player)) i++;
    const segEnd = i;
    const spanLen = segEnd - segStart;

    if (spanLen < WIN_COUNT) continue;

    // Collect contiguous runs of `player` inside [segStart, segEnd)
    let prevStart = -1;
    let prevEnd = -1;
    let prevRunScore = 0;

    let j = segStart;
    while (j < segEnd) {
      if (cells[j] !== player) {
        j++;
        continue;
      }
      const runStart = j;
      while (j < segEnd && cells[j] === player) j++;
      const runEnd = j - 1;
      const runLen = runEnd - runStart + 1;

      const leftOpen = runStart > segStart;
      const rightOpen = runEnd < segEnd - 1;
      const openEnds = (leftOpen ? 1 : 0) + (rightOpen ? 1 : 0);

      const rs = scoreRun(runLen, openEnds, spanLen);
      score += rs;

      if (runLen >= 5) {
        threats.wins++;
      } else if (runLen === 4) {
        if (openEnds === 2) threats.open4++;
        else if (openEnds === 1) threats.half4++;
      } else if (runLen === 3 && openEnds === 2 && spanLen >= 6) {
        threats.open3++;
      }

      // Check 1-empty-gap split pattern with previous run in the same blocker-free span
      if (prevEnd !== -1 && runStart - prevEnd === 2) {
        const prevLen = prevEnd - prevStart + 1;
        const combined = prevLen + runLen;
        const outerLeftOpen = prevStart > segStart;
        const outerRightOpen = runEnd < segEnd - 1;
        const outerOpen = (outerLeftOpen ? 1 : 0) + (outerRightOpen ? 1 : 0);

        if (combined >= 4) {
          // XXX_X, XX_XX, X_XXX -> immediate forcing threat (filling gap wins)
          const splitScore = outerOpen === 2 ? SCORE_HALF_OPEN_4 + 2500 : SCORE_SPLIT_4;
          const bonus = splitScore - (prevRunScore + rs);
          if (bonus > 0) score += bonus;
          threats.half4++;
        } else if (combined === 3) {
          // X_XX or XX_X
          if (outerOpen === 2 && spanLen >= 6) {
            const bonus = SCORE_SPLIT_OPEN_3 - (prevRunScore + rs);
            if (bonus > 0) score += bonus;
            threats.open3++;
          } else if (outerOpen >= 1) {
            const bonus = SCORE_SPLIT_HALF_3 - (prevRunScore + rs);
            if (bonus > 0) score += bonus;
          }
        }
      }

      prevStart = runStart;
      prevEnd = runEnd;
      prevRunScore = rs;
    }
  }

  return score;
}

function forkBonus(threats) {
  if (threats.wins > 0 || threats.open4 > 0) return 0;
  if (threats.half4 >= 2) return 55000;
  if (threats.half4 >= 1 && threats.open3 >= 1) return 38000;
  if (threats.open3 >= 2) return 22000;
  return 0;
}

// Reusable scratch buffer for line reads to avoid GC churn inside Minimax
const LINE_BUF = new Array(CARO_SIZE);

/**
 * Evaluates full 15x15 board from `aiPlayer`'s perspective.
 * Scans all 72 lines for contiguous & split patterns and adds fork/double-threat bonuses.
 */
export function evaluateBoard(board, aiPlayer = PLAYER_AI) {
  const oppPlayer = aiPlayer === PLAYER_AI ? PLAYER_HUMAN : PLAYER_AI;
  let aiScore = 0;
  let oppScore = 0;

  const aiThreats = { wins: 0, open4: 0, half4: 0, open3: 0 };
  const oppThreats = { wins: 0, open4: 0, half4: 0, open3: 0 };

  for (let l = 0; l < ALL_LINES.length; l++) {
    const coords = ALL_LINES[l];
    const len = coords.length;
    let hasAi = false;
    let hasOpp = false;

    for (let k = 0; k < len; k++) {
      const val = board[coords[k][0]][coords[k][1]];
      LINE_BUF[k] = val;
      if (val === aiPlayer) hasAi = true;
      else if (val === oppPlayer) hasOpp = true;
    }

    if (hasAi) {
      aiScore += evaluateLineForPlayer(LINE_BUF, len, aiPlayer, aiThreats);
    }
    if (hasOpp) {
      oppScore += evaluateLineForPlayer(LINE_BUF, len, oppPlayer, oppThreats);
    }
  }

  aiScore += forkBonus(aiThreats);
  oppScore += forkBonus(oppThreats);

  // Slight defensive bias so AI reliably blocks dangerous opponent open-3 / fork setups
  return Math.round(aiScore - oppScore * 1.15);
}

// Local 9-cell window buffer for fast move-ordering heuristic
const LOCAL_BUF = new Array(9);

function scoreLocalPoint(board, r, c, player) {
  const size = board.length;
  const threats = { wins: 0, open4: 0, half4: 0, open3: 0 };
  let total = 0;

  for (let d = 0; d < 4; d++) {
    const dr = DIRS[d][0];
    const dc = DIRS[d][1];
    let len = 0;
    for (let step = -4; step <= 4; step++) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        LOCAL_BUF[len++] = step === 0 ? player : board[nr][nc];
      }
    }
    if (len >= WIN_COUNT) {
      total += evaluateLineForPlayer(LOCAL_BUF, len, player, threats);
    }
  }
  total += forkBonus(threats);
  return total;
}

/**
 * Generates candidate empty cells within Chebyshev radius 2 of occupied cells,
 * ordered descending by immediate tactical heuristic (attack + defense) for
 * maximal Alpha-Beta pruning.
 */
export function getOrderedCandidateMoves(board, player, maxCandidates = 24) {
  const size = board.length;
  const opp = player === PLAYER_AI ? PLAYER_HUMAN : PLAYER_AI;
  const seen = new Uint8Array(size * size);
  const raw = [];
  let hasStone = false;

  for (let r = 0; r < size; r++) {
    const row = board[r];
    for (let c = 0; c < size; c++) {
      if (row[c] === '') continue;
      hasStone = true;
      const rMin = Math.max(0, r - 2);
      const rMax = Math.min(size - 1, r + 2);
      const cMin = Math.max(0, c - 2);
      const cMax = Math.min(size - 1, c + 2);
      for (let nr = rMin; nr <= rMax; nr++) {
        const nRow = board[nr];
        const base = nr * size;
        for (let nc = cMin; nc <= cMax; nc++) {
          const idx = base + nc;
          if (!seen[idx] && nRow[nc] === '') {
            seen[idx] = 1;
            raw.push([nr, nc]);
          }
        }
      }
    }
  }

  if (!hasStone) {
    const center = Math.floor(size / 2);
    return [[center, center]];
  }

  const center = (size - 1) / 2;
  const scored = new Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i][0];
    const c = raw[i][1];
    const attack = scoreLocalPoint(board, r, c, player);
    const defense = scoreLocalPoint(board, r, c, opp);
    const centerBias = 14 - (Math.abs(r - center) + Math.abs(c - center));
    // Immediate win ranks highest, immediate block second
    const priority = attack * 1.1 + defense + centerBias * 0.5;
    scored[i] = { r, c, priority };
  }

  scored.sort((a, b) => b.priority - a.priority);

  const limit = Math.min(scored.length, maxCandidates);
  const ordered = new Array(limit);
  for (let i = 0; i < limit; i++) {
    ordered[i] = [scored[i].r, scored[i].c];
  }
  return ordered;
}

/**
 * Minimax with Alpha-Beta pruning and Move Ordering.
 * Returns { move: [r, c] | null, telemetry: { depth, nodesVisited, prunedBranches, evalScore } }.
 */
export function findBestMove(boardInput, depth = 2, aiPlayer = PLAYER_AI) {
  const board = cloneBoard(boardInput);
  const oppPlayer = aiPlayer === PLAYER_AI ? PLAYER_HUMAN : PLAYER_AI;
  const stats = { nodesVisited: 0, prunedBranches: 0 };

  const rootMoves = getOrderedCandidateMoves(board, aiPlayer, depth >= 3 ? 22 : 28);
  if (rootMoves.length === 0) {
    return {
      move: null,
      telemetry: { depth, nodesVisited: 0, prunedBranches: 0, evalScore: 0 },
    };
  }

  // First stone on empty board -> instant center
  if (rootMoves.length === 1) {
    return {
      move: rootMoves[0],
      telemetry: { depth, nodesVisited: 1, prunedBranches: 0, evalScore: 0 },
    };
  }

  // 1. Immediate winning move for AI
  for (let i = 0; i < rootMoves.length; i++) {
    const [r, c] = rootMoves[i];
    stats.nodesVisited++;
    board[r][c] = aiPlayer;
    if (hasWinAt(board, r, c, aiPlayer)) {
      board[r][c] = '';
      stats.prunedBranches += rootMoves.length - i - 1;
      return {
        move: [r, c],
        telemetry: {
          depth,
          nodesVisited: stats.nodesVisited,
          prunedBranches: stats.prunedBranches,
          evalScore: SCORE_WIN + depth,
        },
      };
    }
    board[r][c] = '';
  }

  // 2. Immediate forced block against opponent winning move
  for (let i = 0; i < rootMoves.length; i++) {
    const [r, c] = rootMoves[i];
    stats.nodesVisited++;
    board[r][c] = oppPlayer;
    if (hasWinAt(board, r, c, oppPlayer)) {
      board[r][c] = '';
      board[r][c] = aiPlayer;
      const evalScore = evaluateBoard(board, aiPlayer);
      board[r][c] = '';
      stats.prunedBranches += rootMoves.length - i - 1;
      return {
        move: [r, c],
        telemetry: {
          depth,
          nodesVisited: stats.nodesVisited,
          prunedBranches: stats.prunedBranches,
          evalScore,
        },
      };
    }
    board[r][c] = '';
  }

  function minimax(remDepth, isMax, alpha, beta) {
    stats.nodesVisited++;
    if (remDepth === 0) {
      return evaluateBoard(board, aiPlayer);
    }

    const currentPlayer = isMax ? aiPlayer : oppPlayer;
    const cap = remDepth >= 2 ? 16 : 14;
    const moves = getOrderedCandidateMoves(board, currentPlayer, cap);
    if (moves.length === 0) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        const [r, c] = moves[i];
        board[r][c] = aiPlayer;
        let val;
        if (hasWinAt(board, r, c, aiPlayer)) {
          val = SCORE_WIN + remDepth;
        } else {
          val = minimax(remDepth - 1, false, alpha, beta);
        }
        board[r][c] = '';

        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (beta <= alpha) {
          stats.prunedBranches += moves.length - i - 1;
          break;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < moves.length; i++) {
        const [r, c] = moves[i];
        board[r][c] = oppPlayer;
        let val;
        if (hasWinAt(board, r, c, oppPlayer)) {
          val = -(SCORE_WIN + remDepth);
        } else {
          val = minimax(remDepth - 1, true, alpha, beta);
        }
        board[r][c] = '';

        if (val < best) best = val;
        if (best < beta) beta = best;
        if (beta <= alpha) {
          stats.prunedBranches += moves.length - i - 1;
          break;
        }
      }
      return best;
    }
  }

  let bestMove = rootMoves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (let i = 0; i < rootMoves.length; i++) {
    const [r, c] = rootMoves[i];
    board[r][c] = aiPlayer;
    const val = minimax(depth - 1, false, alpha, beta);
    board[r][c] = '';

    if (val > bestScore) {
      bestScore = val;
      bestMove = [r, c];
    }
    if (bestScore > alpha) {
      alpha = bestScore;
    }
    if (bestScore >= SCORE_WIN) {
      stats.prunedBranches += rootMoves.length - i - 1;
      break;
    }
  }

  return {
    move: bestMove,
    telemetry: {
      depth,
      nodesVisited: stats.nodesVisited,
      prunedBranches: stats.prunedBranches,
      evalScore: bestScore,
    },
  };
}
