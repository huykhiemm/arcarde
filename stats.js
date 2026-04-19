/* ═══════════════════════════════════════════════════════
   stats.js — Statistics & Match History
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

function renderStats() {
  const gameHistory = JSON.parse(localStorage.getItem('kh-history') || '[]');

  // RPS stats
  const rpsGames = gameHistory.filter(r => !r.game || r.game === 'rps');
  const rpsTotal = rpsGames.length;
  const rpsWins = rpsGames.filter(r => r.outcome === 'W').length;
  const rpsLosses = rpsGames.filter(r => r.outcome === 'L').length;
  const rpsWR = rpsTotal ? Math.round(rpsWins / rpsTotal * 100) : 0;

  // Caro stats
  const caroGames = gameHistory.filter(r => r.game === 'caro');
  const caroTotal = caroGames.length;
  const caroWins = caroGames.filter(r => r.outcome === 'W').length;

  // 2048 stats
  const games2048 = gameHistory.filter(r => r.game === '2048');
  const best2048Score = games2048.length ? Math.max(...games2048.map(r => r.score || 0)) : 0;

  // Overall
  const total = gameHistory.length;
  const totalWins = gameHistory.filter(r => r.outcome === 'W').length;

  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;

  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Tổng trận</div>
      <div class="stat-card-val">${total}</div>
      <div class="stat-card-sub">đã chơi</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Thắng</div>
      <div class="stat-card-val" style="color:var(--green)">${totalWins}</div>
      <div class="stat-card-sub">${total ? Math.round(totalWins / total * 100) : 0}% tỉ lệ thắng</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Oẳn Tù Tì</div>
      <div class="stat-card-val" style="color:var(--accent3)">${rpsWins}/${rpsTotal}</div>
      <div class="stat-card-sub">${rpsWR}% win rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Caro</div>
      <div class="stat-card-val" style="color:var(--cyan)">${caroWins}/${caroTotal}</div>
      <div class="stat-card-sub">trận thắng</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">2048 Best</div>
      <div class="stat-card-val" style="color:var(--amber)">${best2048Score || localStorage.getItem('kh-2048-best') || 0}</div>
      <div class="stat-card-sub">điểm cao nhất</div>
    </div>
  `;

  // Render history table
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  if (!gameHistory.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:32px;">Chưa có trận nào.</td></tr>';
    return;
  }

  const gameLabels = {
    rps: '✂️ Oẳn tù tì',
    caro: '♟️ Caro',
    '2048': '🧩 2048'
  };

  tbody.innerHTML = gameHistory.slice(0, 30).map((r, i) => {
    const gameName = gameLabels[r.game] || gameLabels.rps;
    const detail = r.game === '2048' ? `${r.score || 0} điểm` :
      r.game === 'caro' ? `${r.difficulty || 'medium'} · ${r.moves || 0} nước` :
        `${r.mode === 'pvcpu' ? 'vs CPU' : 'PvP'} · Bo${r.bestOf || 1}`;
    const score = r.game === '2048' ? '' : `${r.p1 || ''} - ${r.p2 || ''}`;
    const outcomeLabel = r.outcome === 'W' ? 'Thắng' : r.outcome === 'L' ? 'Thua' : 'Hòa';
    return `
      <tr>
        <td style="color:var(--text3);font-family:var(--mono);">${i + 1}</td>
        <td>${gameName}</td>
        <td style="font-family:var(--mono);font-size:11px;">${detail}</td>
        <td style="font-family:var(--mono);color:var(--accent3);">${score}</td>
        <td><span class="outcome-badge ${r.outcome}">${outcomeLabel}</span></td>
        <td style="color:var(--text3);font-size:11px;font-family:var(--mono);">${new Date(r.time).toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');
}

function clearHistory() {
  if (confirm('Xóa toàn bộ lịch sử trận đấu?')) {
    localStorage.removeItem('kh-history');
    localStorage.removeItem('kh-2048-best');
    renderStats();
  }
}
