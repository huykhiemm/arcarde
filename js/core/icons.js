// Thin-stroke inline SVG icon set (24x24 viewBox, stroke-width 1.75).
const PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5h4.5"/>',
  step: '<path d="M6 5l9 7-9 7z"/><path d="M19 5v14"/>',
  shuffle: '<path d="M3 7h3.5c2 0 3.5 1 4.5 3l2 4c1 2 2.500 3 4.500 3H21"/><path d="M3 17h3.500c2 0 3.500-1 4.500-3M13 10c1-2 2.500-3 4.500-3H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.500"/><rect x="9.500" y="9.500" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1.500"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  bars: '<path d="M5 20V10M10 20V4M15 20V13M20 20V7"/>',
  hand: '<path d="M8 13V6.500a1.500 1.500 0 0 1 3 0V12M11 11V4.500a1.500 1.500 0 0 1 3 0V12M14 11V6a1.500 1.500 0 0 1 3 0v8c0 4-2.500 6-6 6-2.500 0-4-1-5.500-3L3.500 13.500a1.500 1.500 0 0 1 2.300-1.900L8 14"/>',
  sparkles: '<path d="M10 4l1.800 4.700L16.500 10.500l-4.700 1.800L10 17l-1.800-4.700L3.500 10.500l4.700-1.800z"/><path d="M18 3v4M16 5h4M18 16v4M16 18h4"/>',
  github: '<path d="M9 19c-4.300 1.400-4.300-2.500-6-3m12 5v-3.500c0-1 .1-1.400-.5-2 2.800-.3 5.500-1.400 5.500-6a4.600 4.600 0 0 0-1.300-3.200 4.200 4.200 0 0 0-.1-3.200s-1.100-.3-3.500 1.300a12 12 0 0 0-6.200 0C6.500 2.800 5.400 3.100 5.400 3.100a4.200 4.200 0 0 0-.1 3.200A4.600 4.600 0 0 0 4 9.500c0 4.600 2.700 5.700 5.500 6-.6.600-.6 1.200-.5 2V21"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export function icon(name, size = 18) {
  const body = PATHS[name] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
