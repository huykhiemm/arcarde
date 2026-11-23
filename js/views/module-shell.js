import { getGameStats } from '../core/store.js';

// Placeholder two-column module page: Main Stage + Telemetry Panel.
export function createModuleView({ game, title, subtitle }) {
  return {
    mount(root) {
      const stats = getGameStats(game);
      const metrics = [
        ['Total', stats.total],
        ['Win rate', stats.winRate + '%'],
        ['Wins', stats.wins],
        ['Losses', stats.losses],
        ['Draws', stats.draws],
        ['Best', stats.bestScore],
      ];
      const sec = document.createElement('section');
      sec.innerHTML =
        '<header class="module__head"><h1 class="module__title"></h1><p class="module__sub"></p></header>' +
        '<div class="module">' +
        '<div class="stage"><div class="stage__label">Main Stage</div>' +
        '<div class="stage__placeholder">Module sẽ được tích hợp ở Giai đoạn 2</div></div>' +
        '<aside class="telemetry" aria-label="Telemetry"><div class="telemetry__title">Telemetry</div>' +
        '<div class="telemetry__grid"></div></aside></div>';
      sec.querySelector('.module__title').textContent = title;
      sec.querySelector('.module__sub').textContent = subtitle;
      const grid = sec.querySelector('.telemetry__grid');
      metrics.forEach(([label, value]) => {
        const d = document.createElement('div');
        d.className = 'metric';
        d.innerHTML = '<div class="metric__label"></div><div class="metric__value"></div>';
        d.firstChild.textContent = label;
        d.lastChild.textContent = String(value);
        grid.appendChild(d);
      });
      root.appendChild(sec);
    },
    unmount() {},
  };
}
