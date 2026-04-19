/* ═══════════════════════════════════════════════════════
   app.js — Navigation, Theme, Init
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

// ── THEME ──
let currentTheme = localStorage.getItem('kh-theme') || 'dark';

function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('kh-theme', t);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// ── NAVIGATION ──
const PAGE_NAV_MAP = {
  home: 'Trang chủ',
  games: 'Trò chơi',
  rps: 'Trò chơi',
  game2048: 'Trò chơi',
  caro: 'Trò chơi',
  algo: 'Thuật toán',
  code: 'Mã nguồn',
  converter: 'Chuyển đổi',
  stats: 'Thống kê',
  about: 'Giới thiệu'
};

function showPage(id) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');

  // Update nav active state
  const navTarget = PAGE_NAV_MAP[id] || '';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const linkText = link.textContent.trim().split('\n')[0].trim();
    if (linkText === navTarget) link.classList.add('active');
  });

  // Close mobile menu
  closeMobileMenu();

  // Scroll to top
  window.scrollTo(0, 0);

  // Page-specific init
  if (id === 'stats' && typeof renderStats === 'function') renderStats();
  if (id === 'algo' && typeof initAlgo === 'function') initAlgo();
  if (id === 'code' && typeof initCode === 'function') initCode();
  if (id === 'game2048' && typeof init2048 === 'function') init2048();
  if (id === 'caro' && typeof initCaro === 'function') initCaro();
}

// ── HAMBURGER MENU ──
function toggleMobileMenu() {
  const links = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.nav-overlay');

  links.classList.toggle('open');
  hamburger.classList.toggle('open');
  overlay.classList.toggle('show');

  // Prevent body scroll when menu is open
  document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
}

function closeMobileMenu() {
  const links = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.nav-overlay');

  if (links) links.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  document.body.style.overflow = '';
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);

  // Init algorithms if on that page
  if (typeof randomizeArray === 'function') randomizeArray();
  if (typeof renderAlgoExplain === 'function') renderAlgoExplain();
  if (typeof initCode === 'function') initCode();
  if (typeof renderStats === 'function') renderStats();
});
