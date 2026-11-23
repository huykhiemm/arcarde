import { icon } from '../core/icons.js';

export const MODULES = [
  {
    path: '/sorting', icon: 'bars', title: 'Sorting Visualizer',
    desc: 'Bảy thuật toán sắp xếp chạy từng bước bằng generator, đếm so sánh và hoán đổi theo thời gian thực.',
    meta: ['O(n log n)', '7 algos'],
  },
  {
    path: '/caro', icon: 'grid', title: 'Caro vs AI',
    desc: 'Minimax với cắt tỉa Alpha-Beta và sắp xếp nước đi, chạy trong Web Worker.',
    meta: ['O(b^d)', 'alpha-beta'],
  },
  {
    path: '/2048', icon: 'cpu', title: '2048 Expectimax',
    desc: 'Gợi ý và tự chơi bằng Expectimax với độ sâu thích ứng, tile dịch chuyển bằng CSS transform.',
    meta: ['O(4^d)', 'expectimax'],
  },
  {
    path: '/rps', icon: 'hand', title: 'RPS Markov',
    desc: 'Dự đoán nước đi bằng 3-gram và ma trận chuyển Markov bậc 1, hiển thị heatmap 3x3.',
    meta: ['O(1)', 'markov-1'],
  },
];

function card(m) {
  const a = document.createElement('a');
  a.className = 'mod-card';
  a.href = '#' + m.path;
  const metas = m.meta.map((t) => `<span class="tabular">${t}</span>`).join('');
  a.innerHTML =
    `<span class="mod-card__icon">${icon(m.icon, 24)}</span>` +
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
      '<p class="eyebrow">INTERACTIVE LAB · V4.0</p>' +
      '<h1 class="home__title">Thuật toán, nhìn thấy từng bước.</h1>' +
      '<p class="home__lead">Bốn module tương tác: sắp xếp, Caro, 2048 và Kéo Búa Bao. Mỗi module hiển thị trực tiếp số liệu thực thi theo thời gian thực.</p>' +
      '</header><div class="card-grid"></div>';
    const grid = wrap.querySelector('.card-grid');
    MODULES.forEach((m) => grid.appendChild(card(m)));
    root.appendChild(wrap);
  },
  unmount() {},
};
