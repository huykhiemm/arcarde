// localStorage wrapper. Keys kept backward compatible: kh-theme, kh-history, kh-2048-best.
const K_THEME = 'kh-theme';
const K_HISTORY = 'kh-history';
const K_BEST_2048 = 'kh-2048-best';
const MAX_HISTORY = 50;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}
function readHistory() {
  try {
    const arr = JSON.parse(read(K_HISTORY, '[]'));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
// Legacy RPS entries have no `game` field.
function gameOf(entry) { return entry.game || 'rps'; }

export function getTheme() {
  return read(K_THEME, 'dark') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  write(K_THEME, theme === 'light' ? 'light' : 'dark');
}

export function getHistory(game) {
  const all = readHistory();
  return game ? all.filter((e) => gameOf(e) === game) : all;
}

// entry: { game, outcome: 'W'|'L'|'D', ...extra }. Newest first (legacy order).
export function recordMatch(entry) {
  const all = readHistory();
  all.unshift({ time: Date.now(), ...entry });
  if (all.length > MAX_HISTORY) all.length = MAX_HISTORY;
  write(K_HISTORY, JSON.stringify(all));
}

export function clearHistory(game) {
  if (!game) {
    try { localStorage.removeItem(K_HISTORY); localStorage.removeItem(K_BEST_2048); } catch { /* noop */ }
    return;
  }
  write(K_HISTORY, JSON.stringify(readHistory().filter((e) => gameOf(e) !== game)));
  if (game === '2048') { try { localStorage.removeItem(K_BEST_2048); } catch { /* noop */ } }
}

export function getBest2048() {
  const n = parseInt(read(K_BEST_2048, '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

export function setBest2048(score) {
  if (score > getBest2048()) write(K_BEST_2048, String(Math.floor(score)));
}

export function getGameStats(game) {
  const h = getHistory(game);
  const wins = h.filter((e) => e.outcome === 'W').length;
  const losses = h.filter((e) => e.outcome === 'L').length;
  const draws = h.filter((e) => e.outcome === 'D').length;
  const total = h.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const best = game === '2048'
    ? Math.max(getBest2048(), ...h.map((e) => e.score || 0))
    : 0;
  return { total, wins, losses, draws, winRate, bestScore: best };
}
