import { icon } from './core/icons.js';
import { getTheme, setTheme } from './core/store.js';
import { registerRoute, initRouter } from './core/router.js';
import { homeView } from './views/home.js';
import { createModuleView } from './views/module-shell.js';

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 18);
    btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  }
}

function initChrome() {
  document.getElementById('github-link').innerHTML = icon('github', 18);
  const menuBtn = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');
  const backdrop = document.getElementById('drawer-backdrop');

  function setDrawer(open) {
    nav.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = icon(open ? 'close' : 'menu', 18);
  }
  setDrawer(false);
  menuBtn.addEventListener('click', () => setDrawer(!nav.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setDrawer(false));
  window.addEventListener('routechange', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  });
  applyTheme(getTheme());
}

registerRoute('/', homeView);
registerRoute('/sorting', createModuleView({ game: 'sorting', title: 'Sorting Visualizer', subtitle: 'Bảy thuật toán sắp xếp, thực thi từng bước.' }));
registerRoute('/caro', createModuleView({ game: 'caro', title: 'Caro vs AI', subtitle: 'Minimax + Alpha-Beta + Move Ordering.' }));
registerRoute('/2048', createModuleView({ game: '2048', title: '2048 Expectimax', subtitle: 'Gợi ý và tự chơi với độ sâu thích ứng.' }));
registerRoute('/rps', createModuleView({ game: 'rps', title: 'RPS Markov', subtitle: 'Ma trận chuyển Markov bậc 1 và 3-gram.' }));

initChrome();
initRouter(document.getElementById('app'));
