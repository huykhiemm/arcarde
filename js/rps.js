/* ═══════════════════════════════════════════════════════
   rps.js — Oẳn Tù Tì (Rock Paper Scissors)
   AI: Markov Chain + 3-gram Pattern Detection
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

const EMOJIS = { 1: '✂️', 2: '🔨', 3: '📄' };
const NAMES = { 1: 'Kéo', 2: 'Búa', 3: 'Bao' };

// Rules engine — O(1) lookup
const RULES = { '1-3': 'W', '2-1': 'W', '3-2': 'W', '1-2': 'L', '2-3': 'L', '3-1': 'L' };
const REASONS = { '1-3': 'Kéo cắt Bao.', '2-1': 'Búa đập Kéo.', '3-2': 'Bao bọc Búa.', '1-2': 'Kéo thua Búa.', '2-3': 'Búa thua Bao.', '3-1': 'Bao thua Kéo.' };

function getResult(p1, p2) {
  if (p1 === p2) return { outcome: 'D', reason: 'Hòa — cùng lựa chọn.' };
  const key = `${p1}-${p2}`;
  return { outcome: RULES[key] || 'L', reason: REASONS[key] || '' };
}

// ── Markov AI ──
class MarkovAI {
  constructor() {
    this.counts = { 1: 0, 2: 0, 3: 0 };
    this.markov = {
      1: { 1: 0, 2: 0, 3: 0 },
      2: { 1: 0, 2: 0, 3: 0 },
      3: { 1: 0, 2: 0, 3: 0 }
    };
    this.history = [];
  }

  observe(c) {
    this.counts[c]++;
    if (this.history.length) this.markov[this.history.at(-1)][c]++;
    this.history.push(c);
    if (this.history.length > 30) this.history.shift();
  }

  counterOf(c) { return c === 1 ? 2 : c === 2 ? 3 : 1; }

  choose(smart = true) {
    if (!smart || this.history.length < 2) return Math.ceil(Math.random() * 3);

    // 3-gram pattern detection
    if (this.history.length >= 3) {
      const last3 = this.history.slice(-3);
      const nc = { 1: 0, 2: 0, 3: 0 };
      for (let i = 0; i + 3 < this.history.length; i++) {
        if (this.history[i] === last3[0] && this.history[i + 1] === last3[1] && this.history[i + 2] === last3[2]) {
          nc[this.history[i + 3]] = (nc[this.history[i + 3]] || 0) + 1;
        }
      }
      if (Object.values(nc).reduce((a, b) => a + b, 0) > 0) {
        const pred = +Object.entries(nc).sort((a, b) => b[1] - a[1])[0][0];
        return Math.random() < 0.8 ? this.counterOf(pred) : Math.ceil(Math.random() * 3);
      }
    }

    // Markov transition
    const last = this.history.at(-1);
    const row = this.markov[last];
    if (Object.values(row).reduce((a, b) => a + b, 0) > 0) {
      const pred = +Object.entries(row).sort((a, b) => b[1] - a[1])[0][0];
      return Math.random() < 0.7 ? this.counterOf(pred) : Math.ceil(Math.random() * 3);
    }

    // Frequency fallback
    const most = +Object.entries(this.counts).sort((a, b) => b[1] - a[1])[0][0];
    return Math.random() < 0.6 ? this.counterOf(most) : Math.ceil(Math.random() * 3);
  }

  getInsight() {
    const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    if (!total) return 'CPU chưa có dữ liệu. Hãy chơi vài ván để AI học pattern của bạn.';
    const pcts = [1, 2, 3].map(c => ({ c, p: ((this.counts[c] / total) * 100).toFixed(0) + '%', n: NAMES[c] }));
    return `Tần suất lựa chọn của bạn:\n  Kéo: ${pcts[0].p}  Búa: ${pcts[1].p}  Bao: ${pcts[2].p}\n\nMarkov transitions (từ lần chọn cuối):\n` +
      [1, 2, 3].map(c => `  ${NAMES[c]} → Kéo:${this.markov[c][1]} Búa:${this.markov[c][2]} Bao:${this.markov[c][3]}`).join('\n');
  }
}

// ── Game State ──
let ai = new MarkovAI();
let rpsState = { p1Wins: 0, p2Wins: 0, round: 0, bestOf: 1, mode: 'pvcpu', smart: true, gameOver: false, history: [] };
let pvpChoices = { p1: null, p2: null };

function setBestOf(n) {
  rpsState.bestOf = n;
  [1, 3, 5].forEach(x => document.getElementById('bo' + x + 'Btn').classList.toggle('active', x === n));
  rpsReset();
}

function toggleMode() {
  rpsState.mode = rpsState.mode === 'pvcpu' ? 'pvp' : 'pvcpu';
  const btn = document.getElementById('modeBtn');
  btn.textContent = rpsState.mode === 'pvcpu' ? '🤖 vs CPU' : '👥 PvP';
  btn.classList.add('active');
  document.getElementById('rpsChoicePanel').style.display = rpsState.mode === 'pvcpu' ? 'grid' : 'none';
  document.getElementById('pvpPanel').style.display = rpsState.mode === 'pvp' ? 'block' : 'none';
  document.getElementById('p2Label').textContent = rpsState.mode === 'pvcpu' ? 'CPU' : 'Player 2';
  document.getElementById('p1Label').textContent = rpsState.mode === 'pvp' ? 'Player 1' : 'Bạn';
  rpsReset();
}

function toggleSmart() {
  rpsState.smart = !rpsState.smart;
  document.getElementById('smartBtn').textContent = rpsState.smart ? '🧠 Smart' : '🎲 Random';
  document.getElementById('smartBtn').classList.toggle('active', rpsState.smart);
}

function rpsPlay(choice) {
  if (rpsState.gameOver) return;
  const needed = Math.floor(rpsState.bestOf / 2) + 1;
  rpsState.round++;
  const cpuChoice = ai.choose(rpsState.smart);
  ai.observe(choice);
  const { outcome, reason } = getResult(choice, cpuChoice);
  if (outcome === 'W') rpsState.p1Wins++;
  else if (outcome === 'L') rpsState.p2Wins++;
  rpsState.history.push({ r: rpsState.round, p1: choice, p2: cpuChoice, outcome, reason });
  renderArena(choice, cpuChoice, outcome, reason);
  updateRpsScore();
  appendRpsLog(rpsState.round, choice, cpuChoice, outcome, reason);
  document.getElementById('aiInsight').textContent = ai.getInsight();
  if (rpsState.p1Wins >= needed || rpsState.p2Wins >= needed) endRpsGame();
}

function pvpSelect(player, choice) {
  pvpChoices['p' + player] = choice;
  document.getElementById('pvpStatus').textContent =
    pvpChoices.p1 && pvpChoices.p2 ? 'Cả hai đã chọn! Tiết lộ...' :
      `Player ${player} đã chọn bí mật. ${pvpChoices.p1 ? 'Đang chờ Player 2.' : 'Đang chờ Player 1.'}`;
  if (pvpChoices.p1 && pvpChoices.p2) {
    setTimeout(() => {
      const { outcome, reason } = getResult(pvpChoices.p1, pvpChoices.p2);
      rpsState.round++;
      if (outcome === 'W') rpsState.p1Wins++;
      else if (outcome === 'L') rpsState.p2Wins++;
      rpsState.history.push({ r: rpsState.round, p1: pvpChoices.p1, p2: pvpChoices.p2, outcome, reason });
      renderArena(pvpChoices.p1, pvpChoices.p2, outcome, reason, 'Player 1', 'Player 2');
      updateRpsScore();
      appendRpsLog(rpsState.round, pvpChoices.p1, pvpChoices.p2, outcome, reason);
      pvpChoices = { p1: null, p2: null };
      document.getElementById('pvpStatus').textContent = 'Cả hai cùng chọn bí mật.';
      const needed = Math.floor(rpsState.bestOf / 2) + 1;
      if (rpsState.p1Wins >= needed || rpsState.p2Wins >= needed) endRpsGame();
    }, 400);
  }
}

function renderArena(c1, c2, outcome, reason, n1 = 'Bạn', n2 = 'CPU') {
  const cls = outcome === 'W' ? 'win' : outcome === 'L' ? 'lose' : 'draw';
  const resultText = outcome === 'W' ? '🏆 Thắng!' : outcome === 'L' ? '💀 Thua!' : '🤝 Hòa!';
  const needed = Math.floor(rpsState.bestOf / 2) + 1;
  document.getElementById('rpsArena').innerHTML = `
    <div class="choices-display">
      <div class="choice-box ${cls}">
        <span class="choice-emoji">${EMOJIS[c1]}</span>
        <div class="choice-name">${n1}: ${NAMES[c1]}</div>
      </div>
      <div class="vs-badge">VS</div>
      <div class="choice-box ${cls === 'win' ? 'lose' : cls === 'lose' ? 'win' : 'draw'}">
        <span class="choice-emoji">${EMOJIS[c2]}</span>
        <div class="choice-name">${n2}: ${NAMES[c2]}</div>
      </div>
    </div>
    <div class="result-text ${cls}">${resultText}</div>
    <div class="reason-text">${reason}</div>
    <div style="font-size:11px;color:var(--text3);font-family:var(--mono);">Cần ${needed} thắng để thắng trận · BestOf ${rpsState.bestOf}</div>
  `;
}

function updateRpsScore() {
  document.getElementById('scoreP1').textContent = rpsState.p1Wins;
  document.getElementById('scoreP2').textContent = rpsState.p2Wins;
  const needed = Math.floor(rpsState.bestOf / 2) + 1;
  document.getElementById('roundInfo').innerHTML = `Vòng ${rpsState.round} · Cần <span id="neededWins">${needed}</span> thắng để thắng trận`;
}

function appendRpsLog(r, c1, c2, outcome, reason) {
  const el = document.getElementById('logEntries');
  if (el.textContent === 'Chưa có ván nào.') el.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `<span class="log-r">${r}</span><span class="log-outcome ${outcome}">${outcome === 'W' ? 'WIN' : outcome === 'L' ? 'LOSE' : 'DRAW'}</span><span>${EMOJIS[c1]}${NAMES[c1]}</span><span style="color:var(--text3)">vs</span><span>${EMOJIS[c2]}${NAMES[c2]}</span><span style="color:var(--text3);flex:1;text-align:right;">${reason}</span>`;
  el.prepend(div);
}

function endRpsGame() {
  rpsState.gameOver = true;
  const needed = Math.floor(rpsState.bestOf / 2) + 1;
  const won = rpsState.p1Wins >= needed;
  document.getElementById('rpsArena').innerHTML += `
    <div style="margin-top:16px;padding:16px 24px;border-radius:var(--radius);background:${won ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)'};border:1px solid ${won ? 'var(--green)' : 'var(--red)'};text-align:center;">
      <div class="result-text ${won ? 'win' : 'lose'}" style="font-size:24px;">${won ? '🏆 Thắng trận!' : '💀 Thua trận!'}</div>
      <div style="font-size:13px;color:var(--text2);margin-top:6px;">Tỉ số: ${rpsState.p1Wins} - ${rpsState.p2Wins} · BestOf ${rpsState.bestOf}</div>
    </div>
  `;

  // Save to history
  let gameHistory = JSON.parse(localStorage.getItem('kh-history') || '[]');
  const rec = {
    game: 'rps',
    mode: rpsState.mode,
    bestOf: rpsState.bestOf,
    p1: rpsState.p1Wins,
    p2: rpsState.p2Wins,
    outcome: won ? 'W' : 'L',
    time: new Date().toISOString(),
    rounds: rpsState.history.length
  };
  gameHistory.unshift(rec);
  if (gameHistory.length > 50) gameHistory.pop();
  localStorage.setItem('kh-history', JSON.stringify(gameHistory));
}

function rpsReset() {
  rpsState = { ...rpsState, p1Wins: 0, p2Wins: 0, round: 0, gameOver: false, history: [] };
  ai = new MarkovAI();
  document.getElementById('scoreP1').textContent = '0';
  document.getElementById('scoreP2').textContent = '0';
  document.getElementById('roundInfo').innerHTML = `Vòng 1 · Cần <span id="neededWins">${Math.floor(rpsState.bestOf / 2) + 1}</span> thắng để thắng trận`;
  document.getElementById('rpsArena').innerHTML = '<div style="font-size:13px;color:var(--text2);">Chọn Kéo, Búa hoặc Bao để bắt đầu!</div>';
  document.getElementById('logEntries').innerHTML = '<div style="font-size:12px;color:var(--text3);font-family:var(--mono);">Chưa có ván nào.</div>';
  document.getElementById('aiInsight').textContent = 'CPU chưa có dữ liệu. Hãy chơi vài ván để AI học pattern của bạn.';
  pvpChoices = { p1: null, p2: null };
}

// Keyboard shortcuts for RPS
document.addEventListener('keydown', e => {
  const rpsPage = document.getElementById('page-rps');
  if (rpsPage && rpsPage.classList.contains('active') && rpsState.mode === 'pvcpu') {
    if (e.key === '1') rpsPlay(1);
    if (e.key === '2') rpsPlay(2);
    if (e.key === '3') rpsPlay(3);
    if (e.key === 'r' || e.key === 'R') rpsReset();
  }
});
