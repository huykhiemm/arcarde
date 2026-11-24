import { icon } from './core/icons.js?v=4.2';
import { getTheme, setTheme } from './core/store.js?v=4.2';
import * as audio from './core/audio.js?v=4.2';
import { registerRoute, initRouter } from './core/router.js?v=4.2';
import { homeView } from './views/home.js?v=4.2';
import { sortingView } from './views/sorting.view.js?v=4.2';
import { caroView } from './views/caro.view.js?v=4.2';
import { game2048View } from './views/game2048.view.js?v=4.2';
import { rpsView } from './views/rps.view.js?v=4.2';

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 18);
    btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  }
}

// Global tactile audio toggle
function syncSoundBtn() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  const on = audio.isEnabled();
  btn.innerHTML = icon(on ? 'volume' : 'volume-off', 18);
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', on ? 'Tắt âm thanh tương tác' : 'Bật âm thanh tương tác');
  btn.title = on ? 'Âm thanh: Bật' : 'Âm thanh: Tắt';
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

  const soundBtn = document.getElementById('sound-toggle');
  if (!audio.isSupported()) {
    soundBtn.disabled = true;
  } else {
    soundBtn.addEventListener('click', () => {
      audio.toggle();
    });
  }
  audio.onChange(syncSoundBtn);
  syncSoundBtn();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend();
    else audio.resume();
  });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  });
  applyTheme(getTheme());
}

registerRoute('/', homeView);
registerRoute('/sorting', sortingView);
registerRoute('/caro', caroView);
registerRoute('/2048', game2048View);
registerRoute('/rps', rpsView);

initChrome();
initRouter(document.getElementById('app'));
