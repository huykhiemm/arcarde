/* ═══════════════════════════════════════════════════════
   caro.js — Caro (Gomoku) vs AI
   Algorithm: Minimax + Alpha-Beta Pruning
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

const CARO_SIZE = 15;
const WIN_COUNT = 5;
let caroBoard = [];
let caroTurn = 'X'; // Player is X, AI is O
let caroGameOver = false;
let caroLastMove = null;
let caroWinCells = [];
let caroDifficulty = 'medium'; // easy, medium, hard
let caroMoveCount = 0;

function initCaro() {
  caroBoard = Array.from({ length: CARO_SIZE }, () => Array(CARO_SIZE).fill(''));
  caroTurn = 'X';
  caroGameOver = false;
  caroLastMove = null;
  caroWinCells = [];
  caroMoveCount = 0;
  renderCaroBoard();
  updateCaroStatus('Lượt của bạn (X) — Hãy đặt quân!');
}

function renderCaroBoard() {
  const container = document.getElementById('caroBoard');
  if (!container) return;

  container.style.gridTemplateColumns = `repeat(${CARO_SIZE}, 1fr)`;
  container.innerHTML = '';

  for (let r = 0; r < CARO_SIZE; r++) {
    for (let c = 0; c < CARO_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'caro-cell';
      if (caroBoard[r][c]) {
        cell.classList.add(caroBoard[r][c].toLowerCase());
        cell.textContent = caroBoard[r][c];
      }
      if (caroLastMove && caroLastMove[0] === r && caroLastMove[1] === c) {
        cell.classList.add('last-move');
      }
      if (caroWinCells.some(([wr, wc]) => wr === r && wc === c)) {
        cell.classList.add('win-cell');
      }
      if (!caroBoard[r][c] && !caroGameOver) {
        cell.onclick = () => caroPlayerMove(r, c);
      }
      container.appendChild(cell);
    }
  }
}

function updateCaroStatus(text, cls = '') {
  const el = document.getElementById('caroStatus');
  if (!el) return;
  el.textContent = text;
  el.className = 'caro-status' + (cls ? ' ' + cls : '');
}

function caroPlayerMove(r, c) {
  if (caroGameOver || caroBoard[r][c] || caroTurn !== 'X') return;

  caroBoard[r][c] = 'X';
  caroLastMove = [r, c];
  caroMoveCount++;

  const win = checkCaroWin(r, c, 'X');
  if (win) {
    caroWinCells = win;
    caroGameOver = true;
    renderCaroBoard();
    updateCaroStatus('🏆 Bạn thắng! Chúc mừng!', 'win');
    saveCaroHistory('W');
    return;
  }

  if (caroMoveCount >= CARO_SIZE * CARO_SIZE) {
    caroGameOver = true;
    renderCaroBoard();
    updateCaroStatus('🤝 Hòa!', 'draw');
    saveCaroHistory('D');
    return;
  }

  caroTurn = 'O';
  renderCaroBoard();
  updateCaroStatus('🤔 AI đang suy nghĩ...');

  // AI move with slight delay for UX
  setTimeout(() => {
    caroAIMove();
  }, 200);
}

function caroAIMove() {
  const depth = { easy: 1, medium: 2, hard: 3 }[caroDifficulty] || 2;
  const move = findBestMove(depth);

  if (!move) return;
  const [r, c] = move;
  caroBoard[r][c] = 'O';
  caroLastMove = [r, c];
  caroMoveCount++;

  const win = checkCaroWin(r, c, 'O');
  if (win) {
    caroWinCells = win;
    caroGameOver = true;
    renderCaroBoard();
    updateCaroStatus('💀 AI thắng! Thử lại nhé.', 'lose');
    saveCaroHistory('L');
    return;
  }

  caroTurn = 'X';
  renderCaroBoard();
  updateCaroStatus('Lượt của bạn (X)');
}

// ── Win Detection ──
function checkCaroWin(r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]];
    // Forward
    for (let i = 1; i < WIN_COUNT; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && caroBoard[nr][nc] === player) {
        cells.push([nr, nc]);
      } else break;
    }
    // Backward
    for (let i = 1; i < WIN_COUNT; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && caroBoard[nr][nc] === player) {
        cells.push([nr, nc]);
      } else break;
    }
    if (cells.length >= WIN_COUNT) return cells;
  }
  return null;
}

// ── AI: Minimax + Alpha-Beta Pruning ──
function getCandidateMoves() {
  const candidates = new Set();
  const range = 2;
  for (let r = 0; r < CARO_SIZE; r++) {
    for (let c = 0; c < CARO_SIZE; c++) {
      if (caroBoard[r][c]) {
        for (let dr = -range; dr <= range; dr++) {
          for (let dc = -range; dc <= range; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && !caroBoard[nr][nc]) {
              candidates.add(nr * CARO_SIZE + nc);
            }
          }
        }
      }
    }
  }
  // First move: center
  if (candidates.size === 0) {
    const center = Math.floor(CARO_SIZE / 2);
    candidates.add(center * CARO_SIZE + center);
  }
  return [...candidates].map(v => [Math.floor(v / CARO_SIZE), v % CARO_SIZE]);
}

function evaluateLine(line, player) {
  const opp = player === 'X' ? 'O' : 'X';
  let count = 0, open = 0, blocked = 0;

  // Count consecutive player pieces
  for (const cell of line) {
    if (cell === player) count++;
    else if (cell === '') open++;
    else blocked++;
  }

  if (count === 5) return 100000;
  if (blocked > 0 && count + open < 5) return 0; // Can't win

  if (count === 4) {
    if (open >= 1) return 10000; // Live or half-open four
  }
  if (count === 3) {
    if (open >= 2) return 1000; // Live three
    if (open === 1) return 100;
  }
  if (count === 2) {
    if (open >= 2) return 50;
    if (open === 1) return 10;
  }
  if (count === 1 && open >= 2) return 5;

  return 0;
}

function evaluateBoard(player) {
  const opp = player === 'X' ? 'O' : 'X';
  let score = 0;

  // Check all possible lines of 5
  for (let r = 0; r < CARO_SIZE; r++) {
    for (let c = 0; c < CARO_SIZE; c++) {
      // Horizontal
      if (c + 4 < CARO_SIZE) {
        const line = [];
        for (let i = 0; i < 5; i++) line.push(caroBoard[r][c + i]);
        score += evaluateLine(line, player) - evaluateLine(line, opp) * 1.1;
      }
      // Vertical
      if (r + 4 < CARO_SIZE) {
        const line = [];
        for (let i = 0; i < 5; i++) line.push(caroBoard[r + i][c]);
        score += evaluateLine(line, player) - evaluateLine(line, opp) * 1.1;
      }
      // Diagonal \
      if (r + 4 < CARO_SIZE && c + 4 < CARO_SIZE) {
        const line = [];
        for (let i = 0; i < 5; i++) line.push(caroBoard[r + i][c + i]);
        score += evaluateLine(line, player) - evaluateLine(line, opp) * 1.1;
      }
      // Diagonal /
      if (r + 4 < CARO_SIZE && c - 4 >= 0) {
        const line = [];
        for (let i = 0; i < 5; i++) line.push(caroBoard[r + i][c - i]);
        score += evaluateLine(line, player) - evaluateLine(line, opp) * 1.1;
      }
    }
  }

  return score;
}

function hasWinAt(r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && caroBoard[nr][nc] === player) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && caroBoard[nr][nc] === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

function minimax(depth, isMax, alpha, beta) {
  const player = isMax ? 'O' : 'X';

  if (depth === 0) return evaluateBoard('O');

  const moves = getCandidateMoves();
  if (moves.length === 0) return 0;

  if (isMax) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      caroBoard[r][c] = 'O';
      if (hasWinAt(r, c, 'O')) { caroBoard[r][c] = ''; return 100000 + depth; }
      const val = minimax(depth - 1, false, alpha, beta);
      caroBoard[r][c] = '';
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      caroBoard[r][c] = 'X';
      if (hasWinAt(r, c, 'X')) { caroBoard[r][c] = ''; return -100000 - depth; }
      const val = minimax(depth - 1, true, alpha, beta);
      caroBoard[r][c] = '';
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestMove(depth) {
  let bestScore = -Infinity;
  let bestMove = null;
  const moves = getCandidateMoves();

  // Quick win check
  for (const [r, c] of moves) {
    caroBoard[r][c] = 'O';
    if (hasWinAt(r, c, 'O')) { caroBoard[r][c] = ''; return [r, c]; }
    caroBoard[r][c] = '';
  }

  // Block opponent's win
  for (const [r, c] of moves) {
    caroBoard[r][c] = 'X';
    if (hasWinAt(r, c, 'X')) { caroBoard[r][c] = ''; return [r, c]; }
    caroBoard[r][c] = '';
  }

  // Minimax
  for (const [r, c] of moves) {
    caroBoard[r][c] = 'O';
    const val = minimax(depth - 1, false, -Infinity, Infinity);
    caroBoard[r][c] = '';
    if (val > bestScore) {
      bestScore = val;
      bestMove = [r, c];
    }
  }

  return bestMove;
}

function setCaroDifficulty(level) {
  caroDifficulty = level;
  document.querySelectorAll('.caro-diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
  initCaro();
}

function saveCaroHistory(outcome) {
  let history = JSON.parse(localStorage.getItem('kh-history') || '[]');
  history.unshift({
    game: 'caro',
    difficulty: caroDifficulty,
    outcome: outcome,
    moves: caroMoveCount,
    time: new Date().toISOString()
  });
  if (history.length > 50) history.pop();
  localStorage.setItem('kh-history', JSON.stringify(history));
}
