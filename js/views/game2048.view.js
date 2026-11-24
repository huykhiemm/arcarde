import { icon } from '../core/icons.js?v=4.2';
import * as audio from '../core/audio.js?v=4.2';
import { getBest2048, setBest2048, recordMatch, getGameStats } from '../core/store.js?v=4.2';
import {
  GRID_SIZE,
  DIRECTIONS,
  createGameState,
  moveState,
  continueAfterWin,
  toMatrix,
  getMaxTile,
  countEmptyCells,
} from '../engines/game2048.engine.js';

const DIR_META = {
  up: { label: 'Lên', code: 'UP', icon: 'arrow-up' },
  down: { label: 'Xuống', code: 'DOWN', icon: 'arrow-down' },
  left: { label: 'Trái', code: 'LEFT', icon: 'arrow-left' },
  right: { label: 'Phải', code: 'RIGHT', icon: 'arrow-right' },
};

const SPEED_MODES = [
  { key: 'slow', label: '0.5×', ms: 600 },
  { key: 'normal', label: '1×', ms: 220 },
  { key: 'fast', label: '3×', ms: 70 },
  { key: 'turbo', label: 'Turbo', ms: 15 },
];

const BREAKDOWN_FACTORS = [
  { key: 'corner', label: 'Corner Snake' },
  { key: 'monotonicity', label: 'Monotonicity' },
  { key: 'smoothness', label: 'Smoothness' },
  { key: 'empty', label: 'Empty Cells' },
  { key: 'merges', label: 'Merge Potential' },
];

const KEY_TO_DIR = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

function formatCompactRate(n) {
  if (!n || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function formatSigned(n) {
  if (n > 0) return `+${n.toLocaleString('en-US')}`;
  return n.toLocaleString('en-US');
}

function getPreviewDepth(emptyCount, deepSearch) {
  let base;
  if (emptyCount >= 8) base = 3;
  else if (emptyCount >= 4) base = 4;
  else base = 5;
  return deepSearch ? base + 1 : base;
}

export const game2048View = {
  mount(root) {
    const worker = new Worker(new URL('../workers/expectimax.worker.js', import.meta.url), {
      type: 'module',
    });

    let state = createGameState();
    let bestScore = getBest2048();
    let winRecorded = false;
    let lossRecorded = false;

    // AI control state
    let requestId = 0;
    let pendingResolve = null;
    let pendingReqId = -1;
    let autoPlaying = false;
    let autoSessionId = 0;
    let stepBusy = false;
    let speedKey = 'normal';
    let speedMs = 220;
    let deepSearch = false;
    let activeSleepCancel = null;

    // Thinking visualizer state
    let hintOverlayDir = null;
    let lastBestMove = null;
    let lastRanking = DIRECTIONS.map((dir) => ({
      dir,
      valid: false,
      ev: null,
      normalizedPct: 0,
      breakdown: { corner: 0, monotonicity: 0, smoothness: 0, empty: 0, merges: 0 },
    }));
    let lastTelemetry = {
      depth: 3,
      nodesEvaluated: 0,
      cacheHits: 0,
      nodesPerSec: 0,
      durationMs: 0,
      maxTile: getMaxTile(state),
    };

    // Persistent DOM map keyed by tile.id — zero innerHTML wipes on moves
    const tileNodes = new Map();
    const pendingRemovals = new Set();

    const sec = document.createElement('section');

    // Header
    const head = document.createElement('header');
    head.className = 'module__head';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'MODULE 03 · EXPECTIMAX LUT';
    const h1 = document.createElement('h1');
    h1.className = 'module__title';
    h1.textContent = '2048 Expectimax';
    const sub = document.createElement('p');
    sub.className = 'module__sub';
    sub.textContent = 'Expectimax 16-bit LUT + Transposition Table + trực quan hóa phân rã 5 thành phần heuristic theo thời gian thực.';
    head.append(eyebrow, h1, sub);

    const layout = document.createElement('div');
    layout.className = 'module';

    // ── Main Stage ──
    const stage = document.createElement('div');
    stage.className = 'stage g2048-stage';

    // Row 1: Scores + Core AI Actions
    const toolbar = document.createElement('div');
    toolbar.className = 'g2048-toolbar';

    const scoreGroup = document.createElement('div');
    scoreGroup.className = 'g2048-scores';

    const scoreBox = document.createElement('div');
    scoreBox.className = 'g2048-score-box';
    const scoreLbl = document.createElement('span');
    scoreLbl.className = 'g2048-score-box__label';
    scoreLbl.textContent = 'Score';
    const scoreVal = document.createElement('strong');
    scoreVal.className = 'g2048-score-box__val tabular';
    scoreBox.append(scoreLbl, scoreVal);

    const bestBox = document.createElement('div');
    bestBox.className = 'g2048-score-box';
    const bestLbl = document.createElement('span');
    bestLbl.className = 'g2048-score-box__label';
    bestLbl.textContent = 'Best';
    const bestVal = document.createElement('strong');
    bestVal.className = 'g2048-score-box__val tabular';
    bestBox.append(bestLbl, bestVal);

    scoreGroup.append(scoreBox, bestBox);

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'g2048-actions';

    const autoBtn = document.createElement('button');
    autoBtn.type = 'button';
    autoBtn.className = 'btn btn--primary';

    const stepBtn = document.createElement('button');
    stepBtn.type = 'button';
    stepBtn.className = 'btn btn--ghost';
    stepBtn.innerHTML = `${icon('step', 15)}<span>AI Step</span>`;

    const hintBtn = document.createElement('button');
    hintBtn.type = 'button';
    hintBtn.className = 'btn btn--ghost';
    hintBtn.innerHTML = `${icon('sparkles', 15)}<span>AI Hint</span>`;

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--ghost';
    resetBtn.innerHTML = `${icon('reset', 15)}<span>Chơi lại</span>`;

    actionsGroup.append(autoBtn, stepBtn, hintBtn, resetBtn);
    toolbar.append(scoreGroup, actionsGroup);

    // Row 2: Speed Segmented Control + Deep Search Toggle
    const engineBar = document.createElement('div');
    engineBar.className = 'g2048-engine-bar';

    const speedWrap = document.createElement('div');
    speedWrap.className = 'g2048-ctrl-group';
    const speedLabel = document.createElement('span');
    speedLabel.className = 'sort-param__label';
    speedLabel.textContent = 'Tốc độ AI';
    const speedSeg = document.createElement('div');
    speedSeg.className = 'segmented';
    speedSeg.setAttribute('role', 'group');
    speedSeg.setAttribute('aria-label', 'Tốc độ AI Auto-Play');

    const speedBtns = new Map();
    SPEED_MODES.forEach((mode) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'segmented__btn tabular';
      b.textContent = mode.label;
      b.title = `${mode.label} (${mode.ms}ms)`;
      b.setAttribute('aria-pressed', String(mode.key === speedKey));
      b.addEventListener('click', () => {
        speedKey = mode.key;
        speedMs = mode.ms;
        speedBtns.forEach((btn, k) => btn.setAttribute('aria-pressed', String(k === speedKey)));
        boardEl.classList.toggle('is-turbo', speedKey === 'turbo');
        // Immediately wake any long pending delay when user speeds up mid-run
        if (activeSleepCancel) {
          activeSleepCancel();
        }
      });
      speedBtns.set(mode.key, b);
      speedSeg.appendChild(b);
    });
    speedWrap.append(speedLabel, speedSeg);

    const deepBtn = document.createElement('button');
    deepBtn.type = 'button';
    deepBtn.className = 'btn btn--ghost g2048-deep-btn';
    deepBtn.setAttribute('role', 'switch');
    deepBtn.setAttribute('aria-checked', 'false');
    deepBtn.innerHTML = `${icon('cpu', 15)}<span>Deep Search (+1D)</span><span class="g2048-deep-pill tabular">OFF</span>`;
    const deepPill = deepBtn.querySelector('.g2048-deep-pill');

    deepBtn.addEventListener('click', () => {
      deepSearch = !deepSearch;
      deepBtn.setAttribute('aria-checked', String(deepSearch));
      deepBtn.classList.toggle('is-active', deepSearch);
      deepPill.textContent = deepSearch ? 'ON' : 'OFF';
      updateTelemetryUI();
    });

    engineBar.append(speedWrap, deepBtn);

    // Hint status strip
    const hintBanner = document.createElement('div');
    hintBanner.className = 'g2048-hint';
    hintBanner.setAttribute('role', 'status');
    hintBanner.setAttribute('aria-live', 'polite');
    const hintIconWrap = document.createElement('span');
    hintIconWrap.className = 'g2048-hint__icon';
    const hintText = document.createElement('span');
    hintText.className = 'g2048-hint__text';
    const hintScore = document.createElement('span');
    hintScore.className = 'g2048-hint__score tabular';
    hintBanner.append(hintIconWrap, hintText, hintScore);

    // 4x4 Board container
    const boardShell = document.createElement('div');
    boardShell.className = 'g2048-board-shell';

    const boardEl = document.createElement('div');
    boardEl.className = 'g2048-board';
    boardEl.setAttribute('aria-label', 'Bàn cờ 2048 4×4');

    // Static 16 background slots
    const gridBg = document.createElement('div');
    gridBg.className = 'g2048-grid';
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'g2048-slot';
      gridBg.appendChild(slot);
    }

    // Dynamic transform tile layer
    const tilesLayer = document.createElement('div');
    tilesLayer.className = 'g2048-tiles';

    // Non-destructive AI Hint directional arrow indicator overlaid on board
    const hintArrowOverlay = document.createElement('div');
    hintArrowOverlay.className = 'g2048-board-hint is-hidden';
    hintArrowOverlay.setAttribute('aria-hidden', 'true');
    const hintArrowIcon = document.createElement('span');
    hintArrowIcon.className = 'g2048-board-hint__arrow';
    const hintArrowTag = document.createElement('span');
    hintArrowTag.className = 'g2048-board-hint__tag tabular';
    hintArrowOverlay.append(hintArrowIcon, hintArrowTag);

    // Overlay for Win 2048 / Game Over
    const overlay = document.createElement('div');
    overlay.className = 'g2048-overlay is-hidden';
    const overlayTitle = document.createElement('div');
    overlayTitle.className = 'g2048-overlay__title';
    const overlaySub = document.createElement('div');
    overlaySub.className = 'g2048-overlay__sub tabular';
    const overlayBtns = document.createElement('div');
    overlayBtns.className = 'g2048-overlay__btns';

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'btn btn--primary';
    continueBtn.textContent = 'Tiếp tục';

    const overlayResetBtn = document.createElement('button');
    overlayResetBtn.type = 'button';
    overlayResetBtn.className = 'btn btn--ghost';
    overlayResetBtn.textContent = 'Chơi lại';

    overlayBtns.append(continueBtn, overlayResetBtn);
    overlay.append(overlayTitle, overlaySub, overlayBtns);

    boardEl.append(gridBg, tilesLayer, hintArrowOverlay, overlay);
    boardShell.appendChild(boardEl);

    // Control help note
    const helpNote = document.createElement('div');
    helpNote.className = 'g2048-help';
    helpNote.textContent = 'Phím mũi tên / WASD hoặc vuốt trực tiếp trên bàn cờ. Nhấn phím bất kỳ sẽ tự dừng AI Auto-Play.';

    stage.append(toolbar, engineBar, hintBanner, boardShell, helpNote);

    // ── Telemetry Sidebar: Thinking Visualizer ──
    const aside = document.createElement('aside');
    aside.className = 'telemetry g2048-telemetry';
    aside.setAttribute('aria-label', 'Expectimax Thinking Visualizer');

    const teleTitle = document.createElement('div');
    teleTitle.className = 'telemetry__title';
    teleTitle.textContent = 'Thinking Visualizer';

    // 1. 4-Direction Expected Value (EV) Bars
    const evCard = document.createElement('div');
    evCard.className = 'tele-card';
    const evHead = document.createElement('div');
    evHead.className = 'tele-card__head';
    const evTitle = document.createElement('div');
    evTitle.className = 'tele-card__title';
    evTitle.textContent = '4-Direction Expected Value';
    const evBadge = document.createElement('span');
    evBadge.className = 'tele-card__badge tabular';
    evHead.append(evTitle, evBadge);

    const dirList = document.createElement('div');
    dirList.className = 'g2048-dir-list';
    const dirRows = {};

    DIRECTIONS.forEach((dir) => {
      const row = document.createElement('div');
      row.className = 'g2048-dir-row';

      const name = document.createElement('span');
      name.className = 'g2048-dir-row__name';
      name.innerHTML = `${icon(DIR_META[dir].icon, 14)}<span>${DIR_META[dir].code}</span>`;

      const barTrack = document.createElement('div');
      barTrack.className = 'g2048-dir-row__track';
      const barFill = document.createElement('div');
      barFill.className = 'g2048-dir-row__fill';
      barTrack.appendChild(barFill);

      const val = document.createElement('span');
      val.className = 'g2048-dir-row__val tabular';
      val.textContent = '—';

      row.append(name, barTrack, val);
      dirList.appendChild(row);
      dirRows[dir] = { row, barFill, val };
    });

    evCard.append(evHead, dirList);

    // 2. Decision Rationale Breakdown (5 Heuristic Components)
    const breakdownCard = document.createElement('div');
    breakdownCard.className = 'tele-card';
    const bdHead = document.createElement('div');
    bdHead.className = 'tele-card__head';
    const bdTitle = document.createElement('div');
    bdTitle.className = 'tele-card__title';
    bdTitle.textContent = 'Decision Rationale';
    const bdDirBadge = document.createElement('span');
    bdDirBadge.className = 'tele-card__badge tabular';
    bdDirBadge.textContent = '—';
    bdHead.append(bdTitle, bdDirBadge);

    const bdList = document.createElement('div');
    bdList.className = 'g2048-bd-list';
    const bdRows = {};

    BREAKDOWN_FACTORS.forEach(({ key, label }) => {
      const row = document.createElement('div');
      row.className = 'g2048-bd-row';

      const top = document.createElement('div');
      top.className = 'g2048-bd-row__top';
      const lbl = document.createElement('span');
      lbl.className = 'g2048-bd-row__label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'g2048-bd-row__val tabular';
      val.textContent = '0';
      top.append(lbl, val);

      const track = document.createElement('div');
      track.className = 'g2048-bd-row__track';
      const fill = document.createElement('div');
      fill.className = 'g2048-bd-row__fill';
      track.appendChild(fill);

      row.append(top, track);
      bdList.appendChild(row);
      bdRows[key] = { row, val, fill };
    });

    breakdownCard.append(bdHead, bdList);

    // 3. Engine Metrics (fixed-width tabular-nums grid to prevent Turbo layout jitter)
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'telemetry__grid g2048-metrics-grid';

    function makeMetric(label, accent = false) {
      const card = document.createElement('div');
      card.className = 'metric g2048-metric';
      const l = document.createElement('div');
      l.className = 'metric__label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = accent
        ? 'metric__value metric__value--accent g2048-metric__val tabular'
        : 'metric__value g2048-metric__val tabular';
      card.append(l, v);
      metricsGrid.appendChild(card);
      return v;
    }

    const mDepth = makeMetric('Depth', true);
    const mNodes = makeMetric('Nodes');
    const mRate = makeMetric('Nodes/s', true);
    const mCache = makeMetric('Cache Hits');
    const mTime = makeMetric('Eval Time');
    const mMaxTile = makeMetric('Max Tile');

    // 4. Stored Stats Card
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

    const stBest = makeStatRow('Điểm cao nhất');
    const stTotal = makeStatRow('Tổng số ván');
    const stWins = makeStatRow('Đạt 2048 (W) / Thua (L)');
    const stWinRate = makeStatRow('Tỉ lệ đạt 2048');

    statsCard.append(statsTitle, statsTable);
    aside.append(teleTitle, evCard, breakdownCard, metricsGrid, statsCard);

    stage.style.setProperty('--stagger-index', '0');
    Array.from(aside.children).forEach((el, idx) => {
      el.style.setProperty('--stagger-index', String(idx + 1));
    });

    layout.append(stage, aside);
    sec.append(head, layout);
    root.appendChild(sec);

    // ── Worker Promise Bridge (Strictly Sequential, Zero Queue Congestion) ──
    function cancelPendingWorker() {
      requestId++;
      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        pendingReqId = -1;
        resolve(null);
      }
    }

    function askWorker(matrix, useDeep) {
      cancelPendingWorker();
      const id = requestId;
      pendingReqId = id;
      return new Promise((resolve) => {
        pendingResolve = resolve;
        worker.postMessage({
          requestId: id,
          matrix,
          deepSearch: useDeep,
        });
      });
    }

    worker.onmessage = (event) => {
      const data = event.data;
      if (data.requestId !== pendingReqId) return;
      const resolve = pendingResolve;
      pendingResolve = null;
      pendingReqId = -1;
      if (resolve) resolve(data);
    };

    worker.onerror = (err) => {
      console.error('[expectimax.worker] error:', err);
      cancelPendingWorker();
      stopAutoPlay();
      stepBusy = false;
      updateControlsUI();
      updateHintBanner('Lỗi Web Worker Expectimax. Vui lòng thử lại.');
    };

    function sleepCancellable(ms) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (activeSleepCancel === finish) activeSleepCancel = null;
          resolve();
        };
        const timer = setTimeout(finish, ms);
        activeSleepCancel = finish;
      });
    }

    function flushPendingRemovals() {
      pendingRemovals.forEach((entry) => {
        clearTimeout(entry.timer);
        if (entry.el.parentNode) entry.el.remove();
      });
      pendingRemovals.clear();
    }

    function stopAutoPlay() {
      autoSessionId++;
      const wasRunning = autoPlaying;
      autoPlaying = false;
      if (activeSleepCancel) {
        activeSleepCancel();
      }
      if (wasRunning) {
        cancelPendingWorker();
      }
      updateControlsUI();
    }

    function setBoardHintArrow(dir) {
      hintOverlayDir = dir;
      if (dir && DIR_META[dir]) {
        hintArrowIcon.innerHTML = icon(DIR_META[dir].icon, 42);
        hintArrowTag.textContent = DIR_META[dir].code;
        hintArrowOverlay.dataset.dir = dir;
        hintArrowOverlay.classList.remove('is-hidden');
      } else {
        hintArrowOverlay.classList.add('is-hidden');
        delete hintArrowOverlay.dataset.dir;
      }
    }

    function tileValueClass(val) {
      return val <= 2048 ? `is-v-${val}` : 'is-v-super';
    }

    function createTileNode(tile, extraInnerClass = '') {
      const outer = document.createElement('div');
      outer.className = 'g2048-tile';
      outer.style.setProperty('--row', String(tile.row));
      outer.style.setProperty('--col', String(tile.col));

      const inner = document.createElement('div');
      inner.className = `g2048-tile__inner ${tileValueClass(tile.value)} tabular` +
        (extraInnerClass ? ` ${extraInnerClass}` : '');
      inner.textContent = String(tile.value);
      outer.appendChild(inner);

      return outer;
    }

    function syncTiles() {
      flushPendingRemovals();
      const removeDelay = speedKey === 'turbo' ? 60 : 140;

      const activeIds = new Set();
      for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          const tile = state.grid[r][c];
          if (!tile) continue;
          activeIds.add(tile.id);

          if (tile.mergedFrom) {
            tile.mergedFrom.forEach((src) => {
              const srcEl = tileNodes.get(src.id);
              if (srcEl) {
                tileNodes.delete(src.id);
                srcEl.classList.add('is-merging-out');
                srcEl.style.setProperty('--row', String(tile.row));
                srcEl.style.setProperty('--col', String(tile.col));
                const entry = {
                  el: srcEl,
                  timer: setTimeout(() => {
                    if (srcEl.parentNode) srcEl.remove();
                    pendingRemovals.delete(entry);
                  }, removeDelay),
                };
                pendingRemovals.add(entry);
              }
            });

            const mergedEl = createTileNode(tile, 'is-merged');
            tilesLayer.appendChild(mergedEl);
            tileNodes.set(tile.id, mergedEl);
          } else if (tileNodes.has(tile.id)) {
            const el = tileNodes.get(tile.id);
            el.style.setProperty('--row', String(tile.row));
            el.style.setProperty('--col', String(tile.col));
          } else {
            const newEl = createTileNode(tile, tile.isNew ? 'is-new' : '');
            tilesLayer.appendChild(newEl);
            tileNodes.set(tile.id, newEl);
          }
        }
      }

      for (const [id, el] of tileNodes.entries()) {
        if (!activeIds.has(id)) {
          el.remove();
          tileNodes.delete(id);
        }
      }
    }

    function updateScoresUI() {
      if (state.score > bestScore) {
        bestScore = state.score;
        setBest2048(bestScore);
      }
      scoreVal.textContent = state.score.toLocaleString('en-US');
      bestVal.textContent = bestScore.toLocaleString('en-US');
    }

    function updateControlsUI() {
      const blocked = state.over || (state.won && !state.keepPlaying);
      autoBtn.disabled = blocked;
      stepBtn.disabled = blocked || autoPlaying || stepBusy;
      hintBtn.disabled = blocked || autoPlaying || stepBusy;

      autoBtn.innerHTML = autoPlaying
        ? `${icon('pause', 15)}<span>Dừng Auto</span>`
        : `${icon('play', 15)}<span>AI Auto-Play</span>`;
      autoBtn.setAttribute('aria-pressed', String(autoPlaying));
    }

    function updateOverlayUI() {
      if (state.won && !state.keepPlaying) {
        overlay.classList.remove('is-hidden');
        overlay.classList.add('is-win');
        overlay.classList.remove('is-lose');
        overlayTitle.textContent = 'Đạt mốc 2048';
        overlaySub.textContent = `Điểm hiện tại: ${state.score.toLocaleString('en-US')}`;
        continueBtn.classList.remove('is-hidden');
      } else if (state.over) {
        overlay.classList.remove('is-hidden');
        overlay.classList.add('is-lose');
        overlay.classList.remove('is-win');
        overlayTitle.textContent = 'Hết nước đi';
        overlaySub.textContent = `Tổng điểm: ${state.score.toLocaleString('en-US')} · Ô lớn nhất: ${getMaxTile(state)}`;
        continueBtn.classList.add('is-hidden');
      } else {
        overlay.classList.add('is-hidden');
      }
    }

    function updateHintBanner(text, dir = null, scoreText = '') {
      if (dir && DIR_META[dir]) {
        hintIconWrap.innerHTML = icon(DIR_META[dir].icon, 16);
        hintBanner.classList.add('has-hint');
      } else {
        hintIconWrap.innerHTML = icon('cpu', 15);
        hintBanner.classList.remove('has-hint');
      }
      hintText.textContent = text;
      hintScore.textContent = scoreText;
    }

    function updateTelemetryUI() {
      const emptyNow = countEmptyCells(toMatrix(state));
      const nextDepth = getPreviewDepth(emptyNow, deepSearch);
      const shownDepth = lastTelemetry.nodesEvaluated > 0 ? lastTelemetry.depth : nextDepth;

      evBadge.textContent = `${emptyNow} ô trống · D${nextDepth}${deepSearch ? '+' : ''}`;

      // 1. 4-Direction EV Bars
      const byDir = new Map(lastRanking.map((item) => [item.dir, item]));
      DIRECTIONS.forEach((dir) => {
        const item = byDir.get(dir);
        const ui = dirRows[dir];
        const valid = Boolean(item && item.valid);
        const isBest = valid && lastBestMove === dir;

        ui.row.classList.toggle('is-best', isBest);
        ui.row.classList.toggle('is-blocked', !valid);

        if (valid) {
          ui.val.textContent = item.ev.toLocaleString('en-US');
          ui.barFill.style.width = `${item.normalizedPct}%`;
        } else {
          ui.val.textContent = lastTelemetry.nodesEvaluated > 0 ? 'BLOCKED' : '—';
          ui.barFill.style.width = '0%';
        }
      });

      // 2. Decision Rationale Breakdown for bestMove
      const bestEntry = lastBestMove ? byDir.get(lastBestMove) : null;
      const bd = bestEntry && bestEntry.valid
        ? bestEntry.breakdown
        : { corner: 0, monotonicity: 0, smoothness: 0, empty: 0, merges: 0 };

      bdDirBadge.textContent = bestEntry && bestEntry.valid
        ? `${DIR_META[bestEntry.dir].code} · EV ${bestEntry.ev.toLocaleString('en-US')}`
        : 'Chưa phân tích';

      const maxAbs = Math.max(
        1,
        ...BREAKDOWN_FACTORS.map(({ key }) => Math.abs(bd[key] || 0)),
      );

      BREAKDOWN_FACTORS.forEach(({ key }) => {
        const v = bd[key] || 0;
        const ui = bdRows[key];
        const pct = v === 0 ? 0 : Math.max(6, Math.round((Math.abs(v) / maxAbs) * 100));
        ui.val.textContent = formatSigned(v);
        ui.row.classList.toggle('is-neg', v < 0);
        ui.row.classList.toggle('is-pos', v > 0);
        ui.fill.style.width = `${pct}%`;
      });

      // 3. Engine Metrics
      mDepth.textContent = `D${shownDepth}`;
      mNodes.textContent = lastTelemetry.nodesEvaluated.toLocaleString('en-US');
      mRate.textContent = formatCompactRate(lastTelemetry.nodesPerSec);
      mCache.textContent = lastTelemetry.cacheHits.toLocaleString('en-US');
      mTime.textContent = `${lastTelemetry.durationMs.toFixed(1)} ms`;
      mMaxTile.textContent = String(getMaxTile(state));

      // 4. Stored Stats
      const stats = getGameStats('2048');
      stBest.textContent = Math.max(bestScore, stats.bestScore).toLocaleString('en-US');
      stTotal.textContent = String(stats.total);
      stWins.textContent = `${stats.wins} / ${stats.losses}`;
      stWinRate.textContent = `${stats.winRate}%`;
    }

    function applyWorkerResult(data, mode) {
      lastBestMove = data.bestMove;
      lastRanking = data.moveRanking || lastRanking;
      if (data.telemetry) {
        lastTelemetry = data.telemetry;
      }

      const bestEntry = lastRanking.find((x) => x.dir === data.bestMove && x.valid);
      const evStr = bestEntry ? `EV = ${bestEntry.ev.toLocaleString('en-US')}` : '';

      if (data.bestMove && DIR_META[data.bestMove]) {
        const meta = DIR_META[data.bestMove];
        if (mode === 'hint') {
          updateHintBanner(`Gợi ý AI Hint: ${meta.label} (${meta.code})`, data.bestMove, evStr);
          setBoardHintArrow(data.bestMove);
        } else if (mode === 'step') {
          updateHintBanner(`AI Step đã đi: ${meta.label} (${meta.code})`, data.bestMove, evStr);
          setBoardHintArrow(null);
        } else {
          updateHintBanner(`Auto-Play (${speedKey === 'turbo' ? 'Turbo' : SPEED_MODES.find((s) => s.key === speedKey)?.label}): ${meta.code}`, data.bestMove, evStr);
          setBoardHintArrow(null);
        }
      } else {
        updateHintBanner('Không còn nước đi hợp lệ.');
        setBoardHintArrow(null);
      }
      updateTelemetryUI();
    }

    function applyMove(direction, fromAI = false) {
      if (!fromAI && autoPlaying) {
        stopAutoPlay();
      }
      if (state.over || (state.won && !state.keepPlaying)) return false;

      const res = moveState(state, direction);
      if (!res.moved) return false;

      let maxMerged = 0;
      for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          const t = state.grid[r][c];
          if (t && t.mergedFrom && t.value > maxMerged) {
            maxMerged = t.value;
          }
        }
      }
      if (maxMerged > 0) {
        audio.play2048Merge(maxMerged);
      } else {
        audio.play2048Slide();
      }

      // Clear hint arrow when a move executes
      setBoardHintArrow(null);

      if (!fromAI) {
        cancelPendingWorker();
        updateHintBanner('Nhấn AI Hint để xem mũi tên gợi ý, AI Step đi 1 nước hoặc AI Auto-Play.');
      }

      if (res.reached2048 && !winRecorded) {
        winRecorded = true;
        audio.playWinChord();
        setBest2048(state.score);
        recordMatch({
          game: '2048',
          score: state.score,
          maxTile: res.maxTile,
          outcome: 'W',
        });
        stopAutoPlay();
      }

      if (res.isOver && !lossRecorded) {
        lossRecorded = true;
        setBest2048(state.score);
        if (!winRecorded) {
          recordMatch({
            game: '2048',
            score: state.score,
            maxTile: res.maxTile,
            outcome: 'L',
          });
        }
        stopAutoPlay();
      }

      syncTiles();
      updateScoresUI();
      updateOverlayUI();
      updateControlsUI();
      updateTelemetryUI();
      return true;
    }

    // Sequential await loop: never overlaps Worker requests even at Turbo (15ms)
    async function runAutoPlayLoop(sessionId) {
      while (autoPlaying && sessionId === autoSessionId) {
        if (state.over || (state.won && !state.keepPlaying)) break;
        const data = await askWorker(toMatrix(state), deepSearch);
        if (!data || !autoPlaying || sessionId !== autoSessionId) break;

        applyWorkerResult(data, 'autoplay');
        if (!data.bestMove) break;

        const moved = applyMove(data.bestMove, true);
        if (!moved || !autoPlaying || sessionId !== autoSessionId) break;
        if (state.over || (state.won && !state.keepPlaying)) break;

        await sleepCancellable(speedMs);
      }

      if (sessionId === autoSessionId && autoPlaying) {
        stopAutoPlay();
      }
    }

    async function handleAIStep() {
      if (autoPlaying || stepBusy || state.over || (state.won && !state.keepPlaying)) return;
      stepBusy = true;
      updateControlsUI();
      updateHintBanner('Expectimax đang phân tích nước đi tiếp theo...');

      const data = await askWorker(toMatrix(state), deepSearch);
      stepBusy = false;

      if (data && data.bestMove) {
        applyWorkerResult(data, 'step');
        applyMove(data.bestMove, true);
      } else {
        updateControlsUI();
      }
    }

    async function handleAIHint() {
      if (autoPlaying || stepBusy || state.over || (state.won && !state.keepPlaying)) return;
      stepBusy = true;
      updateControlsUI();
      updateHintBanner('Expectimax đang đánh giá 4 hướng đi...');

      const data = await askWorker(toMatrix(state), deepSearch);
      stepBusy = false;
      updateControlsUI();

      if (data) {
        applyWorkerResult(data, 'hint');
      }
    }

    function resetGame() {
      stopAutoPlay();
      cancelPendingWorker();
      stepBusy = false;
      state = createGameState();
      winRecorded = false;
      lossRecorded = false;
      lastBestMove = null;
      setBoardHintArrow(null);
      lastRanking = DIRECTIONS.map((dir) => ({
        dir,
        valid: false,
        ev: null,
        normalizedPct: 0,
        breakdown: { corner: 0, monotonicity: 0, smoothness: 0, empty: 0, merges: 0 },
      }));
      lastTelemetry = {
        depth: getPreviewDepth(countEmptyCells(toMatrix(state)), deepSearch),
        nodesEvaluated: 0,
        cacheHits: 0,
        nodesPerSec: 0,
        durationMs: 0,
        maxTile: getMaxTile(state),
      };
      syncTiles();
      updateScoresUI();
      updateOverlayUI();
      updateControlsUI();
      updateHintBanner('Nhấn AI Hint để xem mũi tên gợi ý, AI Step đi 1 nước hoặc AI Auto-Play.');
      updateTelemetryUI();
    }

    autoBtn.addEventListener('click', () => {
      if (autoPlaying) {
        stopAutoPlay();
        updateHintBanner('Đã tạm dừng AI Auto-Play.');
        return;
      }
      if (state.over || (state.won && !state.keepPlaying)) return;
      stepBusy = false;
      autoPlaying = true;
      const sid = ++autoSessionId;
      updateControlsUI();
      runAutoPlayLoop(sid);
    });

    stepBtn.addEventListener('click', handleAIStep);
    hintBtn.addEventListener('click', handleAIHint);
    resetBtn.addEventListener('click', resetGame);
    overlayResetBtn.addEventListener('click', resetGame);

    continueBtn.addEventListener('click', () => {
      continueAfterWin(state);
      updateOverlayUI();
      updateControlsUI();
    });

    // Keyboard controls (Arrows + WASD)
    function onKeyDown(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      if (autoPlaying) {
        stopAutoPlay();
      }
      applyMove(dir, false);
    }

    document.addEventListener('keydown', onKeyDown);

    // Touch swipe controls on board
    let touchStartX = null;
    let touchStartY = null;
    const MIN_SWIPE = 30;

    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function onTouchEnd(e) {
      if (touchStartX === null || !e.changedTouches || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;
      const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      if (autoPlaying) {
        stopAutoPlay();
      }
      applyMove(dir, false);
    }

    boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    boardEl.addEventListener('touchend', onTouchEnd, { passive: true });

    // Initial render
    syncTiles();
    updateScoresUI();
    updateOverlayUI();
    updateControlsUI();
    updateHintBanner('Nhấn AI Hint để xem mũi tên gợi ý, AI Step đi 1 nước hoặc AI Auto-Play.');
    updateTelemetryUI();

    this._cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      boardEl.removeEventListener('touchstart', onTouchStart);
      boardEl.removeEventListener('touchend', onTouchEnd);
      stopAutoPlay();
      cancelPendingWorker();
      flushPendingRemovals();
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
