import { icon } from '../core/icons.js?v=4.2';

// Technical-diagram specimens: 1.25px strokes, currentColor base, .spec__accent highlights.
const W = 'fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"';
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" ${W} aria-hidden="true" focusable="false">${body}</svg>`;

function sortingSpec() {
  let s = '<path class="spec__muted" d="M10 80H150"/>';
  for (let i = 0; i < 8; i++) {
    const h = 14 + i * 7;
    const x = 15 + i * 17;
    const hot = i === 3 || i === 4;
    const barCls = i === 3
      ? 'spec__accent spec__fill spec-sort-bar-a'
      : i === 4
        ? 'spec__accent spec__fill spec-sort-bar-b'
        : '';
    s += `<rect class="${barCls}" x="${x}" y="${80 - h}" width="11" height="${h}" rx="1"/>`;
  }
  s += '<path class="spec__accent spec__draw" pathLength="1" d="M71.5 41.5V23H88.5V34.5"/>';
  s += '<path class="spec__accent" d="M69 38.5L71.5 41.5L74 38.5M86 31.5L88.5 34.5L91 31.5"/>';
  return svg(s);
}

function caroSpec() {
  let s = '';
  for (let k = 0; k < 5; k++) {
    s += `<rect class="spec__fill" stroke="none" x="${45 + k * 14}" y="${10 + k * 14}" width="14" height="14"/>`;
  }
  for (let i = 0; i <= 5; i++) {
    s += `<path class="spec__muted" d="M${45 + i * 14} 10V80M45 ${10 + i * 14}H115"/>`;
  }
  // O stones (off the winning diagonal)
  [[0, 2], [1, 3], [3, 1], [4, 2]].forEach(([r, c]) => {
    s += `<circle cx="${52 + c * 14}" cy="${17 + r * 14}" r="3.8"/>`;
  });
  // X stones along the winning diagonal + connecting strike line
  for (let k = 0; k < 5; k++) {
    const cx = 52 + k * 14;
    const cy = 17 + k * 14;
    s += `<path class="spec__accent" d="M${cx - 3.4} ${cy - 3.4}L${cx + 3.4} ${cy + 3.4}M${cx + 3.4} ${cy - 3.4}L${cx - 3.4} ${cy + 3.4}"/>`;
  }
  s += '<path class="spec__accent spec__draw spec-caro-win" pathLength="1" d="M47.5 12.5L112.5 77.5"/>';
  return svg(s);
}

function g2048Spec() {
  let s = '<defs><linearGradient id="spec-snake" x1="0" y1="0" x2="0" y2="1">' +
    '<stop class="spec__stop-b" offset="0"/><stop class="spec__stop-a" offset="1"/></linearGradient></defs>';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const anchor = r === 0 && c === 0;
      s += `<rect class="${anchor ? 'spec__accent spec__fill' : 'spec__muted'}" x="${42 + c * 20}" y="${7 + r * 20}" width="16" height="16" rx="2"/>`;
    }
  }
  s += '<path class="spec__draw" pathLength="1" stroke="url(#spec-snake)" stroke-width="1.5" d="M50 15H110V35H50V55H110V75H53"/>';
  s += '<path class="spec-snake-flow" pathLength="100" stroke-width="1.65" d="M50 15H110V35H50V55H110V75H53"/>';
  s += '<path class="spec__accent" d="M57.5 71L52 75L57.5 79"/>';
  s += '<circle class="spec__accent spec__fill" cx="50" cy="15" r="2.6"/>';
  return svg(s);
}

function rpsSpec() {
  const mk = (id, cls) =>
    `<marker id="${id}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">` +
    `<path class="${cls}" stroke="none" d="M0 0L6 3L0 6z"/></marker>`;
  let s = `<defs>${mk('spec-ar', 'spec__mk')}${mk('spec-ar-a', 'spec__mk--accent')}</defs>`;
  const cycleEdge = (d) =>
    `<path class="spec__accent spec__draw spec-rps-cycle" pathLength="24" marker-end="url(#spec-ar-a)" d="${d}"/>`;
  const innerEdge = (d) =>
    `<path class="spec__muted" marker-end="url(#spec-ar)" d="${d}"/>`;

  // Clockwise cycle R -> S -> P -> R (accented, flows on hover)
  s += cycleEdge('M88 22.8Q108.8 37.5 115.9 60.4');
  s += cycleEdge('M110.8 74.2Q80 85.5 50.8 74.2');
  s += cycleEdge('M43.2 61.6Q51.2 37.5 71 24.1');

  // Counter-transitions R -> P -> S -> R (muted inner arcs)
  s += innerEdge('M76.8 26.4Q64.8 47.6 49 64');
  s += innerEdge('M49.2 67.8Q80 60 109.2 67.8');
  s += innerEdge('M111.9 65.1Q95.2 47.6 84.1 27.6');

  [[80, 17, 'R', true], [40, 71, 'P', false], [120, 71, 'S', false]].forEach(([x, y, t, hot]) => {
    s += `<circle class="${hot ? 'spec__accent spec__fill' : ''}" cx="${x}" cy="${y}" r="9.5"/>` +
      `<text class="spec__txt ${hot ? 'spec__txt--accent' : ''}" x="${x}" y="${y + 3.2}" text-anchor="middle">${t}</text>`;
  });
  return svg(s);
}

export const MODULES = [
  {
    path: '/sorting', no: '01', spec: sortingSpec, title: 'Sorting Visualizer',
    desc: 'Bảy thuật toán sắp xếp chạy từng bước bằng generator, đếm so sánh và hoán đổi theo thời gian thực.',
    meta: ['O(n log n)', '7 algos'],
  },
  {
    path: '/caro', no: '02', spec: caroSpec, title: 'Caro vs AI',
    desc: 'Minimax với cắt tỉa Alpha-Beta và sắp xếp nước đi, chạy trong Web Worker.',
    meta: ['O(b^d)', 'alpha-beta'],
  },
  {
    path: '/2048', no: '03', spec: g2048Spec, title: '2048 Expectimax',
    desc: 'Gợi ý và tự chơi bằng Expectimax với độ sâu thích ứng, tile dịch chuyển bằng CSS transform.',
    meta: ['O(4^d)', 'expectimax'],
  },
  {
    path: '/rps', no: '04', spec: rpsSpec, title: 'RPS Markov',
    desc: 'Dự đoán nước đi bằng 3-gram và ma trận chuyển Markov bậc 1, hiển thị heatmap 3x3.',
    meta: ['O(1)', 'markov-1'],
  },
];

function card(m, idx) {
  const a = document.createElement('a');
  a.className = 'mod-card';
  a.href = '#' + m.path;
  a.style.setProperty('--stagger-index', String(idx));
  const metas = m.meta.map((t) => `<span class="tabular">${t}</span>`).join('');
  a.innerHTML =
    `<span class="mod-card__no">${m.no}</span>` +
    `<div class="spec">${m.spec()}</div>` +
    `<h2 class="mod-card__title"></h2>` +
    `<p class="mod-card__desc"></p>` +
    `<div class="mod-card__meta">${metas}<span class="mod-card__arrow">${icon('arrow-right', 16)}</span></div>`;
  a.querySelector('.mod-card__title').textContent = m.title;
  a.querySelector('.mod-card__desc').textContent = m.desc;
  return a;
}

export const homeView = {
  mount(root) {
    const wrap = document.createElement('section');
    wrap.innerHTML =
      '<header class="home__head">' +
      '<p class="eyebrow">INTERACTIVE LAB · V4.2</p>' +
      '<h1 class="home__title is-init-sweep">Thuật toán, nhìn thấy ' +
      '<em class="home__step">từng bước<span class="sr-only">.</span><span class="home__step-dot" aria-hidden="true"></span></em>' +
      '</h1>' +
      '<p class="home__lead">Bốn module tương tác: sắp xếp, Caro, 2048 và Kéo Búa Bao. Mỗi module hiển thị trực tiếp số liệu thực thi theo thời gian thực.</p>' +
      '</header><div class="card-grid"></div>';

    const h1 = wrap.querySelector('.home__title');
    const grid = wrap.querySelector('.card-grid');
    const cardEls = MODULES.map((m, idx) => {
      const el = card(m, idx);
      grid.appendChild(el);
      return el;
    });

    // Clear initial sweep class after entrance, and gently replay one sweep on H1 hover
    let sweepTimer = setTimeout(() => {
      h1.classList.remove('is-init-sweep');
    }, 1150);

    const onTitleEnter = () => {
      if (h1.classList.contains('is-init-sweep') || h1.classList.contains('is-resweep')) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      h1.classList.add('is-resweep');
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(() => {
        h1.classList.remove('is-resweep');
      }, 540);
    };
    h1.addEventListener('pointerenter', onTitleEnter);

    // Lightweight rAF cursor sheen on Home card grid (desktop hover devices only)
    let rafId = 0;
    let lastX = 0;
    let lastY = 0;
    const canHover = window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;

    const updateSheen = () => {
      rafId = 0;
      for (let i = 0; i < cardEls.length; i++) {
        const el = cardEls[i];
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${Math.round(lastX - rect.left)}px`);
        el.style.setProperty('--my', `${Math.round(lastY - rect.top)}px`);
      }
    };

    const onPointerMove = (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(updateSheen);
      }
    };

    if (canHover) {
      grid.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    root.appendChild(wrap);

    this._cleanup = () => {
      clearTimeout(sweepTimer);
      if (rafId) cancelAnimationFrame(rafId);
      h1.removeEventListener('pointerenter', onTitleEnter);
      if (canHover) {
        grid.removeEventListener('pointermove', onPointerMove);
      }
    };
  },

  unmount() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
  },
};
