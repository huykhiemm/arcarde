// Hash router: #/, #/sorting, #/caro, #/2048, #/rps
const routes = new Map();
let root = null;
let current = null; // { path, view }

export function registerRoute(path, { mount, unmount }) {
  routes.set(path, { mount, unmount });
}

export function navigate(path) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target) resolve();
  else location.hash = target;
}

function currentPath() {
  const p = location.hash.replace(/^#/, '') || '/';
  return routes.has(p) ? p : '/';
}

function resolve() {
  if (!root) return;
  const path = currentPath();
  if (current && current.unmount) {
    try { current.unmount(); } catch (e) { console.error(e); }
  }
  root.replaceChildren();
  const view = routes.get(path);
  current = view || null;
  if (view && view.mount) view.mount(root);

  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.getAttribute('data-route') === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  window.dispatchEvent(new CustomEvent('routechange', { detail: { path } }));
}

export function initRouter(rootEl) {
  root = rootEl;
  window.addEventListener('hashchange', resolve);
  resolve();
}
