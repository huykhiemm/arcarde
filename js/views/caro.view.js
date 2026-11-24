import { icon } from '../core/icons.js?v=4.2';
import * as audio from '../core/audio.js?v=4.2';
import { recordMatch, getGameStats } from '../core/store.js?v=4.2';
import {
  CARO_SIZE,
  PLAYER_HUMAN,
  PLAYER_AI,
  DIFFICULTY_DEPTH,
  createEmptyBoard,
  checkWin,
  isBoardFull,
} from '../engines/caro.engine.js';

const DIFFICULTIES = [
  { key: 'easy', label: 'Dễ (D1)' },
  { key: 'medium', label: 'Vừa (D2)' },
  { key: 'hard', label: 'Khó (D3)' },
];

const STAR_POINTS = new Set(['3,3', '3,11', '7,7', '11,3', '11,11']);
const COL_LABELS = 'ABCDEFGHIJKLMNO';

// Crisp inline SVG marks; pathLength=1 lets CSS draw the stroke of the newest move.
function markSvg(kind) {
  const body = kind === 'x'
    ? '<path pathLength="1" d="M6.2 6.2L17.8 17.8"/><path pathLength="1" d="M17.8 6.2L6.2 17.8"/>'
    : '<circle pathLength="1" cx="12" cy="12" r="6.5"/>';
  return `<svg class="caro-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const caroView = {
  mount(root) {
    const worker = new Worker(new URL('../workers/caro.worker.js', import.meta.url), {
      type: 'module',
    });

    let board = createEmptyBoard(CARO_SIZE);
    let difficulty = 'medium';
    let turn = PLAYER_HUMAN;
    let gameOver = false;
    let aiThinking = false;
    let requestId = 0;
    let moveCount = 0;
    let lastMove = null;
    let winSet = new Set();
    let lastTelemetry = {
      depth: DIFFICULTY_DEPTH[difficulty],
      nodesVisited: 0,
      prunedBranches: 0,
      evalScore: 0,
      durationMs: 0,
    };

    const sec = document.createElement('section');

    // Header
    const head = document.createElement('header');
    head.className = 'module__head';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'MODULE 02 · ALPHA-BETA WORKER';
    const h1 = document.createElement('h1');
    h1.className = 'module__title';
    h1.textContent = 'Caro vs AI';
    const sub = document.createElement('p');
    sub.className = 'module__sub';
    sub.textContent = 'Bàn cờ 15×15 · Minimax + cắt tỉa Alpha-Beta + Move Ordering chạy trong Web Worker.';
    head.append(eyebrow, h1, sub);

    const layout = document.createElement('div');
    layout.className = 'module';

    // ── Main Stage ──
    const stage = document.createElement('div');
    stage.className = 'stage caro-stage';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'caro-toolbar';

    const diffWrap = document.createElement('div');
    diffWrap.className = 'caro-ctrl-group';
    const diffLabel = document.createElement('span');
    diffLabel.className = 'sort-param__label';
    diffLabel.textContent = 'Độ khó';
    const diffSeg = document.createElement('div');
    diffSeg.className = 'segmented';
    const diffBtns = new Map();

    DIFFICULTIES.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'segmented__btn';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(key === difficulty));
      btn.addEventListener('click', () => {
        if (difficulty === key) return;
        difficulty = key;
        diffBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === difficulty)));
        resetGame();
      });
      diffBtns.set(key, btn);
      diffSeg.appendChild(btn);
    });
    diffWrap.append(diffLabel, diffSeg);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--ghost';
    resetBtn.innerHTML = `${icon('reset', 15)}<span>Ván mới</span>`;
    resetBtn.addEventListener('click', resetGame);

    toolbar.append(diffWrap, resetBtn);

    // Status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'caro-status';
    statusBar.setAttribute('role', 'status');
    statusBar.setAttribute('aria-live', 'polite');

    const statusText = document.createElement('span');
    statusText.className = 'caro-status__text';

    const statusMeta = document.createElement('span');
    statusMeta.className = 'caro-status__meta tabular';

    statusBar.append(statusText, statusMeta);

    // 15x15 Board (pre-allocated semantic <button> cells — never rebuilt via innerHTML)
    const boardWrap = document.createElement('div');
    boardWrap.className = 'caro-board-wrap';

    const boardEl = document.createElement('div');
    boardEl.className = 'caro-board';
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Bàn cờ Caro 15×15');

    const cellButtons = Array.from({ length: CARO_SIZE }, () => new Array(CARO_SIZE));

    for (let r = 0; r < CARO_SIZE; r++) {
      for (let c = 0; c < CARO_SIZE; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'caro-cell';
        if (STAR_POINTS.has(`${r},${c}`)) {
          btn.classList.add('is-star');
        }
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        btn.setAttribute('aria-label', formatCellLabel(r, c, ''));
        btn.addEventListener('click', () => handlePlayerMove(r, c));
        boardEl.appendChild(btn);
        cellButtons[r][c] = btn;
      }
    }

    // Technical coordinate frame: A–O columns on top, 1–15 rows on the left
    const frame = document.createElement('div');
    frame.className = 'caro-frame';
    const colsEl = document.createElement('div');
    colsEl.className = 'caro-cols';
    colsEl.setAttribute('aria-hidden', 'true');
    const rowsEl = document.createElement('div');
    rowsEl.className = 'caro-rows';
    rowsEl.setAttribute('aria-hidden', 'true');
    const colLabelEls = [];
    const rowLabelEls = [];
    for (let i = 0; i < CARO_SIZE; i++) {
      const cs = document.createElement('span');
      cs.textContent = COL_LABELS[i];
      colsEl.appendChild(cs);
      colLabelEls.push(cs);
      const rs = document.createElement('span');
      rs.textContent = String(i + 1);
      rowsEl.appendChild(rs);
      rowLabelEls.push(rs);
    }
    frame.append(colsEl, rowsEl, boardEl);
    boardWrap.appendChild(frame);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'caro-legend';
    legend.innerHTML =
      `<span class="caro-legend__item"><span class="caro-legend__mark is-x">${icon('mark-x', 13)}</span><span>Bạn (X)</span></span>` +
      `<span class="caro-legend__item"><span class="caro-legend__mark is-o">${icon('mark-o', 13)}</span><span>Minimax AI (O)</span></span>` +
      `<span class="caro-legend__item"><span class="caro-legend__swatch"></span><span>Nước đi cuối</span></span>`;

    stage.append(toolbar, statusBar, boardWrap, legend);

    // ── Telemetry Sidebar ──
    const aside = document.createElement('aside');
    aside.className = 'telemetry';
    aside.setAttribute('aria-label', 'Minimax Telemetry');

    const teleTitle = document.createElement('div');
    teleTitle.className = 'telemetry__title';
    teleTitle.textContent = 'Minimax Telemetry';

    const teleGrid = document.createElement('div');
    teleGrid.className = 'telemetry__grid';

    function makeMetric(label, accent = false) {
      const card = document.createElement('div');
      card.className = 'metric';
      const l = document.createElement('div');
      l.className = 'metric__label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = accent ? 'metric__value metric__value--accent' : 'metric__value';
      card.append(l, v);
      teleGrid.appendChild(card);
      return v;
    }

    const mNodes = makeMetric('Nodes Visited', true);
    const mPruned = makeMetric('Pruned Branches');
    const mDepth = makeMetric('Search Depth');
    const mTime = makeMetric('Eval Time');

    // Detail Search Telemetry Card
    const searchCard = document.createElement('div');
    searchCard.className = 'tele-card';
    const searchTitle = document.createElement('div');
    searchTitle.className = 'tele-card__title';
    searchTitle.textContent = 'Alpha-Beta Diagnostics';

    const diagTable = document.createElement('dl');
    diagTable.className = 'bigo-table';

    function makeDiagRow(term) {
      const row = document.createElement('div');
      row.className = 'bigo-row';
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.className = 'tabular';
      row.append(dt, dd);
      diagTable.appendChild(row);
      return dd;
    }

    const ddEval = makeDiagRow('Heuristic Eval');
    const ddPruneRatio = makeDiagRow('Prune Rate');
    const ddMoves = makeDiagRow('Board Occupancy');
    const ddWorkerState = makeDiagRow('Worker State');

    searchCard.append(searchTitle, diagTable);

    // Stored Stats Card
    const statsCard = document.createElement('div');
    statsCard.className = 'tele-card';
    const statsTitle = document.createElement('div');
    statsTitle.className = 'tele-card__title';
    statsTitle.textContent = 'Thống kê tích lũy (Store)';
    const statsTable = document.createElement('dl');
    statsTable.className = 'bigo-table';

    function makeStatRow(term) {
      const row = document.createElement('div');
      row.className = 'bigo-row';
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.className = 'tabular';
      row.append(dt, dd);
      statsTable.appendChild(row);
      return dd;
    }

    const stTotal = makeStatRow('Tổng số trận');
    const stWinRate = makeStatRow('Tỉ lệ thắng');
    const stRecord = makeStatRow('Thắng / Thua / Hòa');

    statsCard.append(statsTitle, statsTable);
    aside.append(teleTitle, teleGrid, searchCard, statsCard);

    stage.style.setProperty('--stagger-index', '0');
    Array.from(aside.children).forEach((el, idx) => {
      el.style.setProperty('--stagger-index', String(idx + 1));
    });

    layout.append(stage, aside);
    sec.append(head, layout);
    root.appendChild(sec);

    function formatCoord(r, c) {
      return `${COL_LABELS[c]}${r + 1}`;
    }

    function formatCellLabel(r, c, val) {
      const coord = formatCoord(r, c);
      if (val === PLAYER_HUMAN) return `Ô ${coord}, hàng ${r + 1} cột ${c + 1}: Quân X`;
      if (val === PLAYER_AI) return `Ô ${coord}, hàng ${r + 1} cột ${c + 1}: Quân O`;
      return `Ô ${coord}, hàng ${r + 1} cột ${c + 1}: Trống`;
    }

    function syncCell(r, c) {
      const btn = cellButtons[r][c];
      const val = board[r][c];
      const isLast = lastMove !== null && lastMove[0] === r && lastMove[1] === c;
      const isWin = winSet.has(`${r},${c}`);

      const prevVal = btn.dataset.val || '';
      if (prevVal !== val) {
        btn.dataset.val = val;
        if (val === PLAYER_HUMAN) {
          btn.innerHTML = markSvg('x');
        } else if (val === PLAYER_AI) {
          btn.innerHTML = markSvg('o');
        } else {
          btn.replaceChildren();
        }
        btn.setAttribute('aria-label', formatCellLabel(r, c, val));
      }

      btn.classList.toggle('is-axis', lastMove !== null && (lastMove[0] === r || lastMove[1] === c));
      btn.classList.toggle('is-x', val === PLAYER_HUMAN);
      btn.classList.toggle('is-o', val === PLAYER_AI);
      btn.classList.toggle('is-last-move', isLast);
      btn.classList.toggle('is-win-cell', isWin);
      btn.disabled = gameOver || aiThinking || val !== '';
    }

    function syncBoard() {
      for (let r = 0; r < CARO_SIZE; r++) {
        for (let c = 0; c < CARO_SIZE; c++) {
          syncCell(r, c);
        }
      }
      boardEl.classList.toggle('is-thinking', aiThinking);
      for (let i = 0; i < CARO_SIZE; i++) {
        colLabelEls[i].classList.toggle('is-axis', lastMove !== null && lastMove[1] === i);
        rowLabelEls[i].classList.toggle('is-axis', lastMove !== null && lastMove[0] === i);
      }
    }

    function setStatus(text, tone = '') {
      statusText.textContent = text;
      statusBar.className = 'caro-status' + (tone ? ` is-${tone}` : '');
      const lastStr = lastMove ? ` · Nước cuối ${formatCoord(lastMove[0], lastMove[1])}` : '';
      statusMeta.textContent = `Lượt ${moveCount}/${CARO_SIZE * CARO_SIZE}${lastStr}`;
    }

    function updateTelemetryUI() {
      mNodes.textContent = lastTelemetry.nodesVisited.toLocaleString('en-US');
      mPruned.textContent = lastTelemetry.prunedBranches.toLocaleString('en-US');
      mDepth.textContent = String(lastTelemetry.depth);
      mTime.textContent = `${lastTelemetry.durationMs.toFixed(1)} ms`;

      const score = lastTelemetry.evalScore;
      ddEval.textContent = score > 0 ? `+${score.toLocaleString('en-US')}` : score.toLocaleString('en-US');

      const totalCandidates = lastTelemetry.nodesVisited + lastTelemetry.prunedBranches;
      const prunePct = totalCandidates > 0
        ? Math.round((lastTelemetry.prunedBranches / totalCandidates) * 100)
        : 0;
      ddPruneRatio.textContent = `${prunePct}%`;
      ddMoves.textContent = `${moveCount} / ${CARO_SIZE * CARO_SIZE}`;
      ddWorkerState.textContent = aiThinking ? 'Computing' : gameOver ? 'Halted' : 'Idle';

      const stats = getGameStats('caro');
      stTotal.textContent = String(stats.total);
      stWinRate.textContent = `${stats.winRate}%`;
      stRecord.textContent = `${stats.wins} / ${stats.losses} / ${stats.draws}`;
    }

    function finishGame(outcome, winCells, message, tone) {
      gameOver = true;
      aiThinking = false;
      winSet = new Set((winCells || []).map(([r, c]) => `${r},${c}`));
      if (winCells && winCells.length >= 5) {
        audio.playWinChord();
      }
      recordMatch({
        game: 'caro',
        difficulty,
        outcome,
        moves: moveCount,
      });
      syncBoard();
      setStatus(message, tone);
      updateTelemetryUI();
    }

    function handlePlayerMove(r, c) {
      if (gameOver || aiThinking || turn !== PLAYER_HUMAN || board[r][c] !== '') return;

      board[r][c] = PLAYER_HUMAN;
      lastMove = [r, c];
      moveCount++;
      audio.playCaroMove(false);

      const win = checkWin(board, r, c, PLAYER_HUMAN);
      if (win) {
        finishGame('W', win, 'Bạn thắng! Chuỗi 5 quân hợp lệ.', 'win');
        return;
      }

      if (isBoardFull(board)) {
        finishGame('D', null, 'Hòa! Bàn cờ đã kín 225 ô.', 'draw');
        return;
      }

      // Trigger AI worker with incremented requestId
      turn = PLAYER_AI;
      aiThinking = true;
      const currentReq = ++requestId;
      syncBoard();
      setStatus(`AI đang tính toán (Depth ${DIFFICULTY_DEPTH[difficulty]})...`, 'thinking');
      updateTelemetryUI();

      worker.postMessage({
        requestId: currentReq,
        board,
        difficulty,
        aiPlayer: PLAYER_AI,
      });
    }

    worker.onmessage = (event) => {
      const { requestId: resId, move, telemetry } = event.data;
      // Ignore stale worker results after Reset or difficulty switch
      if (resId !== requestId || gameOver) return;

      aiThinking = false;
      if (telemetry) {
        lastTelemetry = telemetry;
      }

      if (!move) {
        finishGame('D', null, 'Hòa! Không còn nước đi hợp lệ.', 'draw');
        return;
      }

      const [r, c] = move;
      if (board[r][c] !== '') {
        turn = PLAYER_HUMAN;
        syncBoard();
        updateTelemetryUI();
        return;
      }

      board[r][c] = PLAYER_AI;
      lastMove = [r, c];
      moveCount++;
      audio.playCaroMove(true);

      const win = checkWin(board, r, c, PLAYER_AI);
      if (win) {
        finishGame('L', win, 'AI thắng! Nhấn Ván mới để đấu lại.', 'lose');
        return;
      }

      if (isBoardFull(board)) {
        finishGame('D', null, 'Hòa! Bàn cờ đã kín 225 ô.', 'draw');
        return;
      }

      turn = PLAYER_HUMAN;
      syncBoard();
      setStatus('Lượt của bạn (X) — Chọn ô để đánh.');
      updateTelemetryUI();
    };

    worker.onerror = (err) => {
      console.error('[caro.worker] error:', err);
      aiThinking = false;
      turn = PLAYER_HUMAN;
      syncBoard();
      setStatus('Lỗi Web Worker khi tính toán. Vui lòng thử lại.', 'lose');
      updateTelemetryUI();
    };

    function resetGame() {
      // Increment requestId immediately to invalidate any in-flight AI calculation
      requestId++;
      board = createEmptyBoard(CARO_SIZE);
      turn = PLAYER_HUMAN;
      gameOver = false;
      aiThinking = false;
      moveCount = 0;
      lastMove = null;
      winSet = new Set();
      lastTelemetry = {
        depth: DIFFICULTY_DEPTH[difficulty],
        nodesVisited: 0,
        prunedBranches: 0,
        evalScore: 0,
        durationMs: 0,
      };
      syncBoard();
      setStatus('Lượt của bạn (X) — Hãy đặt quân đầu tiên.');
      updateTelemetryUI();
    }

    // Initial render
    resetGame();

    this._cleanup = () => {
      requestId++;
      audio.stopAll();
      worker.terminate();
    };
  },

  unmount() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
  },
};
