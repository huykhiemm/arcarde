/* ═══════════════════════════════════════════════════════
   game2048.js — Game 2048
   Algorithm: Greedy merge + Expectimax concepts
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

let board2048 = [];
let score2048 = 0;
let best2048 = parseInt(localStorage.getItem('kh-2048-best') || '0');
let gameOver2048 = false;
let won2048 = false;
let keepPlaying = false;

function init2048() {
  board2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
  score2048 = 0;
  gameOver2048 = false;
  won2048 = false;
  keepPlaying = false;
  spawnTile();
  spawnTile();
  render2048();
}

function spawnTile() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board2048[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board2048[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function render2048() {
  const boardEl = document.getElementById('board2048');
  if (!boardEl) return;

  boardEl.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = board2048[r][c];
      const cell = document.createElement('div');
      cell.className = 'tile-cell';
      if (val) {
        const tile = document.createElement('div');
        const cls = val <= 2048 ? `tile-${val}` : 'tile-super';
        tile.className = `tile ${cls}`;
        tile.textContent = val;
        cell.appendChild(tile);
      }
      boardEl.appendChild(cell);
    }
  }

  // Update scores
  const scoreEl = document.getElementById('score2048');
  const bestEl = document.getElementById('best2048');
  if (scoreEl) scoreEl.textContent = score2048;
  if (bestEl) bestEl.textContent = best2048;

  // Check win
  if (!won2048 && !keepPlaying) {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (board2048[r][c] === 2048) {
          won2048 = true;
          show2048Message('🎉 Bạn thắng!', 'Đạt 2048! Tiếp tục chơi?', true);
          return;
        }
  }

  // Check game over
  if (isGameOver2048()) {
    gameOver2048 = true;
    show2048Message('💀 Thua rồi!', `Điểm: ${score2048}`, false);
    save2048History('L');
  }
}

function show2048Message(title, sub, canContinue) {
  const boardEl = document.getElementById('board2048');
  const msg = document.createElement('div');
  msg.className = 'game-2048-message';
  msg.innerHTML = `
    <div class="msg-title">${title}</div>
    <div class="msg-sub">${sub}</div>
    <div class="game-2048-controls">
      ${canContinue ? '<button class="btn-primary" onclick="continue2048()">Tiếp tục</button>' : ''}
      <button class="btn-ghost" onclick="init2048()">Chơi lại</button>
    </div>
  `;
  boardEl.appendChild(msg);
}

function continue2048() {
  keepPlaying = true;
  const msg = document.querySelector('.game-2048-message');
  if (msg) msg.remove();
}

function isGameOver2048() {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (board2048[r][c] === 0) return false;
      if (c < 3 && board2048[r][c] === board2048[r][c + 1]) return false;
      if (r < 3 && board2048[r][c] === board2048[r + 1][c]) return false;
    }
  return true;
}

function slide(row) {
  let arr = row.filter(x => x !== 0);
  let merged = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      merged += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < 4) arr.push(0);
  return { result: arr, merged };
}

function move2048(direction) {
  if (gameOver2048 && !keepPlaying) return;

  const prev = JSON.stringify(board2048);
  let totalMerged = 0;

  if (direction === 'left') {
    for (let r = 0; r < 4; r++) {
      const { result, merged } = slide(board2048[r]);
      board2048[r] = result;
      totalMerged += merged;
    }
  } else if (direction === 'right') {
    for (let r = 0; r < 4; r++) {
      const { result, merged } = slide(board2048[r].reverse());
      board2048[r] = result.reverse();
      totalMerged += merged;
    }
  } else if (direction === 'up') {
    for (let c = 0; c < 4; c++) {
      const col = [board2048[0][c], board2048[1][c], board2048[2][c], board2048[3][c]];
      const { result, merged } = slide(col);
      for (let r = 0; r < 4; r++) board2048[r][c] = result[r];
      totalMerged += merged;
    }
  } else if (direction === 'down') {
    for (let c = 0; c < 4; c++) {
      const col = [board2048[3][c], board2048[2][c], board2048[1][c], board2048[0][c]];
      const { result, merged } = slide(col);
      for (let r = 0; r < 4; r++) board2048[3 - r][c] = result[r];
      totalMerged += merged;
    }
  }

  if (JSON.stringify(board2048) !== prev) {
    score2048 += totalMerged;
    if (score2048 > best2048) {
      best2048 = score2048;
      localStorage.setItem('kh-2048-best', best2048.toString());
    }
    spawnTile();
    render2048();
  }
}

function save2048History(outcome) {
  let history = JSON.parse(localStorage.getItem('kh-history') || '[]');
  history.unshift({
    game: '2048',
    score: score2048,
    outcome: outcome,
    time: new Date().toISOString()
  });
  if (history.length > 50) history.pop();
  localStorage.setItem('kh-history', JSON.stringify(history));
}

// ── Keyboard Controls ──
document.addEventListener('keydown', e => {
  const page = document.getElementById('page-game2048');
  if (!page || !page.classList.contains('active')) return;

  const keyMap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down'
  };
  if (keyMap[e.key]) {
    e.preventDefault();
    move2048(keyMap[e.key]);
  }
});

// ── Touch / Swipe Controls ──
(function () {
  let startX, startY;
  const minSwipe = 30;

  document.addEventListener('touchstart', e => {
    const page = document.getElementById('page-game2048');
    if (!page || !page.classList.contains('active')) return;
    const board = document.getElementById('board2048');
    if (!board || !board.contains(e.target)) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const page = document.getElementById('page-game2048');
    if (!page || !page.classList.contains('active')) return;
    if (startX === undefined) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = startY = undefined;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move2048(dx > 0 ? 'right' : 'left');
    } else {
      move2048(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });
})();
