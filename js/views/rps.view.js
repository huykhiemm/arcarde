import { icon } from '../core/icons.js';
import { recordMatch, getGameStats } from '../core/store.js';
import { CHOICES, CHOICE_META, evaluateRound, MarkovAI } from '../engines/markov.engine.js';

export const rpsView = {
  mount(root) {
    const ai = new MarkovAI(30);
    let state = {
      p1Wins: 0,
      p2Wins: 0,
      round: 0,
      bestOf: 3,
      mode: 'pvcpu', // 'pvcpu' | 'pvp'
      smart: true,
      gameOver: false,
      history: [],
    };
    let pvpChoices = { p1: null, p2: null };
    let pvpTimer = null;

    const sec = document.createElement('section');

    // Header
    const head = document.createElement('header');
    head.className = 'module__head';
    const h1 = document.createElement('h1');
    h1.className = 'module__title';
    h1.textContent = 'RPS Markov';
    const sub = document.createElement('p');
    sub.className = 'module__sub';
    sub.textContent = 'Nhận diện chuỗi 3-gram kết hợp ma trận chuyển tiếp Markov bậc 1 trên cửa sổ trượt 30 lượt.';
    head.append(h1, sub);

    const layout = document.createElement('div');
    layout.className = 'module';

    // ── Main Stage ──
    const stage = document.createElement('div');
    stage.className = 'stage rps-stage';

    // Top control bar
    const ctrlBar = document.createElement('div');
    ctrlBar.className = 'rps-toolbar';

    // Mode toggle (vs CPU / PvP)
    const modeSeg = document.createElement('div');
    modeSeg.className = 'segmented';
    const btnCpu = document.createElement('button');
    btnCpu.type = 'button';
    btnCpu.className = 'segmented__btn rps-seg-btn';
    btnCpu.innerHTML = `${icon('cpu', 15)}<span>vs CPU</span>`;
    const btnPvp = document.createElement('button');
    btnPvp.type = 'button';
    btnPvp.className = 'segmented__btn rps-seg-btn';
    btnPvp.innerHTML = `${icon('users', 15)}<span>PvP</span>`;
    modeSeg.append(btnCpu, btnPvp);

    // BestOf selector (1 / 3 / 5)
    const boWrap = document.createElement('div');
    boWrap.className = 'rps-ctrl-group';
    const boLabel = document.createElement('span');
    boLabel.className = 'sort-param__label';
    boLabel.textContent = 'Best of';
    const boSeg = document.createElement('div');
    boSeg.className = 'segmented';
    const boBtns = new Map();
    [1, 3, 5].forEach((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'segmented__btn tabular';
      b.textContent = String(n);
      b.addEventListener('click', () => {
        if (state.bestOf === n) return;
        state.bestOf = n;
        resetMatch(false);
      });
      boBtns.set(n, b);
      boSeg.appendChild(b);
    });
    boWrap.append(boLabel, boSeg);

    // Smart AI toggle + Reset button
    const rightCtrls = document.createElement('div');
    rightCtrls.className = 'rps-ctrl-group';
    const smartBtn = document.createElement('button');
    smartBtn.type = 'button';
    smartBtn.className = 'btn btn--ghost rps-smart-btn';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--ghost';
    resetBtn.innerHTML = `${icon('reset', 15)}<span>Ván mới (R)</span>`;
    rightCtrls.append(smartBtn, resetBtn);

    ctrlBar.append(modeSeg, boWrap, rightCtrls);

    // Scoreboard
    const scoreBar = document.createElement('div');
    scoreBar.className = 'rps-scoreboard';

    const p1Card = document.createElement('div');
    p1Card.className = 'rps-score-side';
    const p1NameEl = document.createElement('span');
    p1NameEl.className = 'rps-score-name';
    const p1ScoreEl = document.createElement('span');
    p1ScoreEl.className = 'rps-score-val tabular';
    p1Card.append(p1NameEl, p1ScoreEl);

    const roundInfoEl = document.createElement('div');
    roundInfoEl.className = 'rps-round-meta tabular';

    const p2Card = document.createElement('div');
    p2Card.className = 'rps-score-side rps-score-side--right';
    const p2NameEl = document.createElement('span');
    p2NameEl.className = 'rps-score-name';
    const p2ScoreEl = document.createElement('span');
    p2ScoreEl.className = 'rps-score-val tabular';
    p2Card.append(p2NameEl, p2ScoreEl);

    scoreBar.append(p1Card, roundInfoEl, p2Card);

    // Choice panels
    const cpuChoiceGrid = document.createElement('div');
    cpuChoiceGrid.className = 'rps-choices';
    CHOICES.forEach((c) => {
      const meta = CHOICE_META[c];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rps-choice-btn';
      btn.innerHTML =
        `<span class="rps-choice-btn__icon">${icon(meta.icon, 26)}</span>` +
        `<span class="rps-choice-btn__name">${meta.name}</span>` +
        `<kbd class="rps-choice-btn__key">${meta.key}</kbd>`;
      btn.addEventListener('click', () => playVsCpu(c));
      cpuChoiceGrid.appendChild(btn);
    });

    // PvP secret choice panel
    const pvpPanel = document.createElement('div');
    pvpPanel.className = 'rps-pvp-panel is-hidden';
    const pvpStatus = document.createElement('div');
    pvpStatus.className = 'rps-pvp-status';
    const pvpColumns = document.createElement('div');
    pvpColumns.className = 'rps-pvp-cols';

    [1, 2].forEach((playerNum) => {
      const col = document.createElement('div');
      col.className = 'rps-pvp-col';
      const title = document.createElement('div');
      title.className = 'rps-pvp-col__title';
      title.textContent = `Player ${playerNum}`;
      const btnRow = document.createElement('div');
      btnRow.className = 'rps-pvp-btns';
      CHOICES.forEach((c) => {
        const meta = CHOICE_META[c];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn--ghost rps-pvp-btn';
        b.innerHTML = `${icon(meta.icon, 16)}<span>${meta.name}</span>`;
        b.addEventListener('click', () => selectPvp(playerNum, c));
        btnRow.appendChild(b);
      });
      col.append(title, btnRow);
      pvpColumns.appendChild(col);
    });
    pvpPanel.append(pvpStatus, pvpColumns);

    // Arena display
    const arena = document.createElement('div');
    arena.className = 'rps-arena';

    // Match round log
    const logWrap = document.createElement('div');
    logWrap.className = 'rps-log';
    const logHead = document.createElement('div');
    logHead.className = 'stage__label';
    logHead.textContent = 'Lịch sử ván đấu trong trận';
    const logList = document.createElement('div');
    logList.className = 'rps-log__list';
    logWrap.append(logHead, logList);

    stage.append(ctrlBar, scoreBar, cpuChoiceGrid, pvpPanel, arena, logWrap);

    // ── Telemetry Sidebar ──
    const aside = document.createElement('aside');
    aside.className = 'telemetry';
    aside.setAttribute('aria-label', 'Markov Telemetry');

    const teleTitle = document.createElement('div');
    teleTitle.className = 'telemetry__title';
    teleTitle.textContent = 'Markov Telemetry';

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

    const mLayer = makeMetric('Active Layer', true);
    const mPred = makeMetric('AI Predicts You');
    const mAcc = makeMetric('AI Accuracy');
    const mWinRate = makeMetric('Match Win Rate');

    // 3x3 Transition Heatmap Card
    const heatCard = document.createElement('div');
    heatCard.className = 'tele-card';
    const heatTitleRow = document.createElement('div');
    heatTitleRow.className = 'tele-card__head';
    const heatTitle = document.createElement('div');
    heatTitle.className = 'tele-card__title';
    heatTitle.textContent = 'Transition Matrix P(Next | Prev)';
    const heatSub = document.createElement('span');
    heatSub.className = 'tele-card__badge tabular';
    heatTitleRow.append(heatTitle, heatSub);

    const heatTable = document.createElement('div');
    heatTable.className = 'heatmap';
    heatTable.setAttribute('role', 'grid');
    heatTable.setAttribute('aria-label', 'Ma trận chuyển tiếp Markov 3x3');

    // Header row
    const corner = document.createElement('div');
    corner.className = 'heatmap__corner';
    corner.textContent = 'Prev \\ Next';
    heatTable.appendChild(corner);

    CHOICES.forEach((to) => {
      const colHead = document.createElement('div');
      colHead.className = 'heatmap__head';
      colHead.innerHTML = `${icon(CHOICE_META[to].icon, 13)}<span>${CHOICE_META[to].name}</span>`;
      heatTable.appendChild(colHead);
    });

    const heatCells = {};
    CHOICES.forEach((from) => {
      const rowHead = document.createElement('div');
      rowHead.className = 'heatmap__rowhead';
      rowHead.innerHTML = `${icon(CHOICE_META[from].icon, 13)}<span>${CHOICE_META[from].name}</span>`;
      heatTable.appendChild(rowHead);

      heatCells[from] = {};
      CHOICES.forEach((to) => {
        const cell = document.createElement('div');
        cell.className = 'heatmap__cell tabular';
        const pctEl = document.createElement('div');
        pctEl.className = 'heatmap__pct';
        const cntEl = document.createElement('div');
        cntEl.className = 'heatmap__cnt';
        cell.append(pctEl, cntEl);
        heatTable.appendChild(cell);
        heatCells[from][to] = { cell, pctEl, cntEl };
      });
    });

    // Player Choice Frequency distribution
    const freqWrap = document.createElement('div');
    freqWrap.className = 'rps-freq';
    const freqBars = {};
    CHOICES.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'rps-freq__item tabular';
      const label = document.createElement('span');
      label.className = 'rps-freq__label';
      label.textContent = CHOICE_META[c].name;
      const val = document.createElement('span');
      val.className = 'rps-freq__val';
      item.append(label, val);
      freqWrap.appendChild(item);
      freqBars[c] = val;
    });

    heatCard.append(heatTitleRow, heatTable, freqWrap);

    // Overall Stored Stats Card
    const statsCard = document.createElement('div');
    statsCard.className = 'tele-card';
    const statsTitle = document.createElement('div');
    statsTitle.className = 'tele-card__title';
    statsTitle.textContent = 'Tổng hợp lịch sử (Store)';
    const statsRow = document.createElement('div');
    statsRow.className = 'rps-store-stats tabular';
    statsCard.append(statsTitle, statsRow);

    aside.append(teleTitle, teleGrid, heatCard, statsCard);

    layout.append(stage, aside);
    sec.append(head, layout);
    root.appendChild(sec);

    function clearPvpTimer() {
      if (pvpTimer !== null) {
        clearTimeout(pvpTimer);
        pvpTimer = null;
      }
    }

    function neededWins() {
      return Math.floor(state.bestOf / 2) + 1;
    }

    function updateControlsUI() {
      const isCpu = state.mode === 'pvcpu';
      btnCpu.setAttribute('aria-pressed', String(isCpu));
      btnPvp.setAttribute('aria-pressed', String(!isCpu));

      boBtns.forEach((b, n) => b.setAttribute('aria-pressed', String(n === state.bestOf)));

      smartBtn.innerHTML = `${icon('sparkles', 15)}<span>${state.smart ? 'Smart AI: ON' : 'Smart AI: OFF'}</span>`;
      smartBtn.setAttribute('aria-pressed', String(state.smart));
      smartBtn.classList.toggle('is-active', state.smart);
      smartBtn.disabled = !isCpu;

      cpuChoiceGrid.classList.toggle('is-hidden', !isCpu);
      pvpPanel.classList.toggle('is-hidden', isCpu);

      p1NameEl.textContent = isCpu ? 'Bạn' : 'Player 1';
      p2NameEl.textContent = isCpu ? 'Markov AI' : 'Player 2';
    }

    function updateScoreboardUI() {
      p1ScoreEl.textContent = String(state.p1Wins);
      p2ScoreEl.textContent = String(state.p2Wins);
      roundInfoEl.textContent = `Ván ${state.round} · Chạm ${neededWins()} (Best of ${state.bestOf})`;
    }

    function renderIdleArena() {
      arena.replaceChildren();
      const msg = document.createElement('div');
      msg.className = 'rps-arena__empty';
      msg.textContent = state.mode === 'pvcpu'
        ? 'Chọn Kéo (1), Búa (2) hoặc Bao (3) để đấu với Markov AI.'
        : 'Hai người chơi lần lượt chọn bí mật ở bảng trên.';
      arena.appendChild(msg);
    }

    function renderRoundArena(c1, c2, outcome, reason, label1, label2) {
      arena.replaceChildren();

      const row = document.createElement('div');
      row.className = 'rps-duel';

      const box1 = document.createElement('div');
      box1.className = `rps-duel__card ${outcome === 'W' ? 'is-win' : outcome === 'L' ? 'is-loss' : 'is-draw'}`;
      box1.innerHTML =
        `<div class="rps-duel__icon">${icon(CHOICE_META[c1].icon, 28)}</div>` +
        `<div class="rps-duel__who">${label1}</div>` +
        `<div class="rps-duel__move">${CHOICE_META[c1].name}</div>`;

      const vs = document.createElement('div');
      vs.className = 'rps-duel__vs';
      vs.textContent = 'VS';

      const box2 = document.createElement('div');
      box2.className = `rps-duel__card ${outcome === 'L' ? 'is-win' : outcome === 'W' ? 'is-loss' : 'is-draw'}`;
      box2.innerHTML =
        `<div class="rps-duel__icon">${icon(CHOICE_META[c2].icon, 28)}</div>` +
        `<div class="rps-duel__who">${label2}</div>` +
        `<div class="rps-duel__move">${CHOICE_META[c2].name}</div>`;

      row.append(box1, vs, box2);

      const summary = document.createElement('div');
      summary.className = 'rps-duel__summary';
      const badgeText = outcome === 'W' ? `${label1} thắng ván` : outcome === 'L' ? `${label2} thắng ván` : 'Hòa ván';
      summary.textContent = `${badgeText} — ${reason}`;

      arena.append(row, summary);

      if (state.gameOver) {
        const won = state.p1Wins >= neededWins();
        const banner = document.createElement('div');
        banner.className = `rps-match-banner ${won ? 'is-win' : 'is-loss'}`;
        banner.innerHTML =
          `<div class="rps-match-banner__title">${icon('trophy', 18)}<span>${won ? `${label1} thắng chung cuộc!` : `${label2} thắng chung cuộc!`}</span></div>` +
          `<div class="rps-match-banner__sub tabular">Tỉ số trận: ${state.p1Wins} – ${state.p2Wins} (Best of ${state.bestOf})</div>`;
        arena.appendChild(banner);
      }
    }

    function renderLogUI() {
      logList.replaceChildren();
      if (state.history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rps-log__empty';
        empty.textContent = 'Chưa có ván nào trong trận này.';
        logList.appendChild(empty);
        return;
      }

      for (let i = state.history.length - 1; i >= 0; i--) {
        const item = state.history[i];
        const row = document.createElement('div');
        row.className = 'rps-log__item tabular';

        const rNum = document.createElement('span');
        rNum.className = 'rps-log__round';
        rNum.textContent = `#${item.r}`;

        const badge = document.createElement('span');
        badge.className = `rps-log__badge is-${item.outcome}`;
        badge.textContent = item.outcome === 'W' ? 'WIN' : item.outcome === 'L' ? 'LOSS' : 'DRAW';

        const moves = document.createElement('span');
        moves.className = 'rps-log__moves';
        moves.innerHTML =
          `${icon(CHOICE_META[item.p1].icon, 14)}<span>${CHOICE_META[item.p1].name}</span>` +
          `<span class="rps-log__vs">vs</span>` +
          `${icon(CHOICE_META[item.p2].icon, 14)}<span>${CHOICE_META[item.p2].name}</span>`;

        const reason = document.createElement('span');
        reason.className = 'rps-log__reason';
        reason.textContent = item.reason;

        row.append(rNum, badge, moves, reason);
        logList.appendChild(row);
      }
    }

    function updateTelemetryUI() {
      const tele = ai.getTelemetry(state.smart);
      const stats = getGameStats('rps');

      mLayer.textContent = state.smart ? tele.layer : 'Random';
      if (tele.predictedPlayer) {
        mPred.textContent = `${CHOICE_META[tele.predictedPlayer].name} (${tele.confidence}%)`;
      } else {
        mPred.textContent = '— (33%)';
      }
      mAcc.textContent = tele.totalPredictions > 0
        ? `${tele.accuracy}% (${tele.correctPredictions}/${tele.totalPredictions})`
        : '0%';
      mWinRate.textContent = `${stats.winRate}%`;

      heatSub.textContent = `Window ${tele.windowLen}/${tele.windowMax}`;

      CHOICES.forEach((from) => {
        CHOICES.forEach((to) => {
          const entry = tele.matrix[from][to];
          const ui = heatCells[from][to];
          ui.pctEl.textContent = `${entry.pct}%`;
          ui.cntEl.textContent = `${entry.count}/${entry.rowTotal}`;

          // Continuous alpha fill using --accent; switch text to --on-accent when >= 50% for >= 4.5:1 contrast
          ui.cell.style.setProperty('--heat-alpha', (entry.pct / 100).toFixed(2));
          ui.cell.classList.toggle('is-high', entry.pct >= 50);
          ui.cell.classList.toggle('is-active-row', tele.lastMove === from);
        });
      });

      CHOICES.forEach((c) => {
        const f = tele.frequencies[c];
        freqBars[c].textContent = `${f.pct}% (${f.count})`;
      });

      statsRow.textContent = `Tổng số trận: ${stats.total} · Thắng: ${stats.wins} · Thua: ${stats.losses} · Hòa: ${stats.draws}`;
    }

    function finishMatchIfNeeded() {
      const target = neededWins();
      if (state.p1Wins >= target || state.p2Wins >= target) {
        state.gameOver = true;
        const won = state.p1Wins >= target;
        recordMatch({
          game: 'rps',
          mode: state.mode,
          bestOf: state.bestOf,
          p1: state.p1Wins,
          p2: state.p2Wins,
          outcome: won ? 'W' : 'L',
          rounds: state.history.length,
        });
      }
    }

    function playVsCpu(playerChoice) {
      if (state.mode !== 'pvcpu') return;
      if (state.gameOver) {
        resetMatch(false);
      }
      state.round++;
      const cpuChoice = ai.choose(state.smart);
      ai.observe(playerChoice);
      const { outcome, reason } = evaluateRound(playerChoice, cpuChoice);
      if (outcome === 'W') state.p1Wins++;
      else if (outcome === 'L') state.p2Wins++;

      state.history.push({ r: state.round, p1: playerChoice, p2: cpuChoice, outcome, reason });
      finishMatchIfNeeded();
      updateScoreboardUI();
      renderRoundArena(playerChoice, cpuChoice, outcome, reason, 'Bạn', 'Markov AI');
      renderLogUI();
      updateTelemetryUI();
    }

    function selectPvp(playerNum, choice) {
      if (state.mode !== 'pvp' || pvpTimer !== null) return;
      if (state.gameOver) {
        resetMatch(false);
      }
      if (playerNum === 1) pvpChoices.p1 = choice;
      else pvpChoices.p2 = choice;

      if (pvpChoices.p1 && pvpChoices.p2) {
        pvpStatus.textContent = 'Cả hai đã chọn! Đang mở kết quả...';
        const c1 = pvpChoices.p1;
        const c2 = pvpChoices.p2;
        pvpTimer = setTimeout(() => {
          pvpTimer = null;
          pvpChoices = { p1: null, p2: null };
          state.round++;
          ai.choose(state.smart);
          ai.observe(c1);
          const { outcome, reason } = evaluateRound(c1, c2);
          if (outcome === 'W') state.p1Wins++;
          else if (outcome === 'L') state.p2Wins++;
          state.history.push({ r: state.round, p1: c1, p2: c2, outcome, reason });
          finishMatchIfNeeded();
          pvpStatus.textContent = 'Chọn bí mật cho ván tiếp theo.';
          updateScoreboardUI();
          renderRoundArena(c1, c2, outcome, reason, 'Player 1', 'Player 2');
          renderLogUI();
          updateTelemetryUI();
        }, 280);
      } else {
        pvpStatus.textContent = pvpChoices.p1
          ? 'Player 1 đã khóa lựa chọn. Đang chờ Player 2...'
          : 'Player 2 đã khóa lựa chọn. Đang chờ Player 1...';
      }
    }

    function resetMatch(resetAI = false) {
      clearPvpTimer();
      pvpChoices = { p1: null, p2: null };
      state.p1Wins = 0;
      state.p2Wins = 0;
      state.round = 0;
      state.gameOver = false;
      state.history = [];
      if (resetAI) ai.reset();
      pvpStatus.textContent = 'Cả hai người chơi cùng chọn bí mật.';
      updateControlsUI();
      updateScoreboardUI();
      renderIdleArena();
      renderLogUI();
      updateTelemetryUI();
    }

    btnCpu.addEventListener('click', () => {
      if (state.mode === 'pvcpu') return;
      state.mode = 'pvcpu';
      resetMatch(false);
    });

    btnPvp.addEventListener('click', () => {
      if (state.mode === 'pvp') return;
      state.mode = 'pvp';
      resetMatch(false);
    });

    smartBtn.addEventListener('click', () => {
      state.smart = !state.smart;
      updateControlsUI();
      updateTelemetryUI();
    });

    resetBtn.addEventListener('click', () => resetMatch(false));

    function onKeyDown(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (state.mode !== 'pvcpu') return;

      if (e.key === '1') {
        e.preventDefault();
        playVsCpu(1);
      } else if (e.key === '2') {
        e.preventDefault();
        playVsCpu(2);
      } else if (e.key === '3') {
        e.preventDefault();
        playVsCpu(3);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetMatch(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);

    // Initial render
    resetMatch(false);

    this._cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      clearPvpTimer();
    };
  },

  unmount() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
  },
};
