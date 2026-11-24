// Unified Tactile Sound Engine (Web Audio API, zero external assets, default OFF).
import { getSound, setSound } from './store.js?v=4.2';

const SORT_MIN_HZ = 220;
const SORT_MAX_HZ = 780;
export const SORT_INTERVAL_MS = 25;
export const MERGE_INTERVAL_MS = 48;
const SLIDE_INTERVAL_MS = 35;

// C-major pentatonic scale from C4 (tile 4) up to D6 (tile 8192+)
const PENTATONIC_HZ = [
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66,
];

let ctx = null;
let noiseBuffer = null;
let enabled = getSound();
let unlockBound = false;
let lastSortMs = 0;
let lastMergeMs = 0;
let lastSlideMs = 0;
const activeVoices = new Set(); // Set<{ source: AudioScheduledSourceNode, gain: GainNode }>
const listeners = new Set();

export function isSupported() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export function isEnabled() {
  return enabled;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(enabled); } catch { /* ignore */ }
  });
}

function ensureContext() {
  if (!isSupported()) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
    const len = Math.floor(ctx.sampleRate * 0.08);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  if (ctx.state === 'suspended' && (typeof document === 'undefined' || !document.hidden)) {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function bindGestureUnlock() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    if (!enabled) return;
    const c = ensureContext();
    if (c && c.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      unlockBound = false;
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

if (enabled) {
  bindGestureUnlock();
}

function readyContext() {
  if (!enabled) return null;
  const c = ensureContext();
  if (!c || c.state !== 'running') return null;
  return c;
}

function trackVoice(source, gain) {
  const entry = { source, gain };
  activeVoices.add(entry);
  source.onended = () => {
    activeVoices.delete(entry);
    try {
      source.disconnect();
      gain.disconnect();
    } catch { /* ignore */ }
  };
}

/** Toggle or set global sound state (call from user gesture when enabling). */
export function setEnabled(next) {
  if (next && !isSupported()) return false;
  enabled = Boolean(next);
  setSound(enabled);
  if (enabled) {
    ensureContext();
    bindGestureUnlock();
  } else {
    stopAll();
  }
  notify();
  return enabled;
}

export function enable() {
  return setEnabled(true);
}

export function disable() {
  setEnabled(false);
}

export function toggle() {
  const next = !enabled;
  setEnabled(next);
  if (next) playRpsSelect();
  return next;
}

export function stopAll() {
  const now = ctx ? ctx.currentTime : 0;
  activeVoices.forEach(({ source, gain }) => {
    try {
      if (ctx) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.002);
        source.stop(now + 0.008);
      } else {
        source.stop();
      }
    } catch { /* already stopped */ }
  });
  activeVoices.clear();
}

export function suspend() {
  stopAll();
  if (ctx && ctx.state === 'running') {
    ctx.suspend().catch(() => {});
  }
}

export function resume() {
  if (enabled && ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function playFilteredNoise(c, t, durationS, filterType, freqHz, q, peakGain) {
  if (!noiseBuffer) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freqHz, t);
  filter.Q.setValueAtTime(q, t);

  const gain = c.createGain();
  const attack = Math.min(0.002, durationS * 0.25);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peakGain, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationS);
  gain.gain.setValueAtTime(0, t + durationS + 0.002);

  src.connect(filter).connect(gain).connect(c.destination);
  trackVoice(src, gain);
  src.start(t);
  src.stop(t + durationS + 0.004);
}

/** 1. Sorting: smooth 30ms triangle tone mapped linearly [min, max] -> 220–780 Hz (>=25ms throttle). */
export function playSortStep(value, min = 0, max = 1) {
  const c = readyContext();
  if (!c) return;
  const nowMs = performance.now();
  if (nowMs - lastSortMs < SORT_INTERVAL_MS) return;
  lastSortMs = nowMs;

  const span = max - min;
  const raw = span > 0 ? (value - min) / span : 0.5;
  const r = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0.5));
  const t = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(SORT_MIN_HZ + r * (SORT_MAX_HZ - SORT_MIN_HZ), t);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.038, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  gain.gain.setValueAtTime(0, t + 0.032);

  osc.connect(gain).connect(c.destination);
  trackVoice(osc, gain);
  osc.start(t);
  osc.stop(t + 0.035);
}

export function playNote(ratio) {
  playSortStep(ratio, 0, 1);
}

/** 2. Caro stone placement: 12ms bandpass noise click + warm falling sine body. */
export function playCaroMove(isAI = false) {
  const c = readyContext();
  if (!c) return;
  const t = c.currentTime;

  playFilteredNoise(c, t, 0.012, 'bandpass', isAI ? 950 : 1350, 2.8, 0.042);

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isAI ? 260 : 320, t);
  osc.frequency.exponentialRampToValueAtTime(isAI ? 110 : 140, t + 0.04);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.052, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.044);
  gain.gain.setValueAtTime(0, t + 0.046);

  osc.connect(gain).connect(c.destination);
  trackVoice(osc, gain);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** Shared warm 3-note ascending chord spaced 70ms apart (Caro 5-in-a-row & 2048 milestone). */
export function playWinChord() {
  const c = readyContext();
  if (!c) return;
  const base = c.currentTime + 0.015;
  const notes = [392.0, 493.88, 587.33]; // G4 - B4 - D5 warm triad

  notes.forEach((hz, idx) => {
    const t = base + idx * 0.07;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    gain.gain.setValueAtTime(0, t + 0.245);

    osc.connect(gain).connect(c.destination);
    trackVoice(osc, gain);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

/** 3a. 2048 ultra-light mechanical slide (15ms filtered noise, gain 0.015). */
export function play2048Slide() {
  const c = readyContext();
  if (!c) return;
  const nowMs = performance.now();
  if (nowMs - lastSlideMs < SLIDE_INTERVAL_MS) return;
  lastSlideMs = nowMs;

  playFilteredNoise(c, c.currentTime, 0.015, 'bandpass', 1100, 1.2, 0.015);
}

/** 3b. 2048 marimba/chime merge (65ms, pentatonic by log2(mergedValue), >=45ms throttle). */
export function play2048Merge(mergedValue = 4) {
  const c = readyContext();
  if (!c) return;
  const nowMs = performance.now();
  if (nowMs - lastMergeMs < MERGE_INTERVAL_MS) return;
  lastMergeMs = nowMs;

  const exp = Math.max(2, Math.round(Math.log2(Math.max(4, mergedValue))));
  const idx = Math.min(PENTATONIC_HZ.length - 1, exp - 2);
  const hz = PENTATONIC_HZ[idx];
  const t = c.currentTime;

  // Fundamental sine body (65ms)
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(hz, t);
  gain1.gain.setValueAtTime(0.0001, t);
  gain1.gain.linearRampToValueAtTime(0.048, t + 0.004);
  gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
  gain1.gain.setValueAtTime(0, t + 0.067);
  osc1.connect(gain1).connect(c.destination);
  trackVoice(osc1, gain1);
  osc1.start(t);
  osc1.stop(t + 0.07);

  // Light harmonic overtone (32ms)
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(hz * 2, t);
  gain2.gain.setValueAtTime(0.0001, t);
  gain2.gain.linearRampToValueAtTime(0.014, t + 0.003);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
  gain2.gain.setValueAtTime(0, t + 0.034);
  osc2.connect(gain2).connect(c.destination);
  trackVoice(osc2, gain2);
  osc2.start(t);
  osc2.stop(t + 0.038);
}

/** 4a. RPS crisp 8ms mechanical switch click. */
export function playRpsSelect() {
  const c = readyContext();
  if (!c) return;
  const t = c.currentTime;

  playFilteredNoise(c, t, 0.008, 'bandpass', 2200, 3.2, 0.026);

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.008);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.024, t + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
  gain.gain.setValueAtTime(0, t + 0.009);

  osc.connect(gain).connect(c.destination);
  trackVoice(osc, gain);
  osc.start(t);
  osc.stop(t + 0.011);
}

/** 4b. RPS round result: 'win' (rising 5th), 'lose' (falling minor 3rd), 'draw' (neutral double tap). */
export function playRpsResult(outcome) {
  const c = readyContext();
  if (!c) return;
  const base = c.currentTime + 0.012;

  const scheduleTone = (hz, startOffset, dur, wave, peak) => {
    const t = base + startOffset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    gain.gain.setValueAtTime(0, t + dur + 0.002);
    osc.connect(gain).connect(c.destination);
    trackVoice(osc, gain);
    osc.start(t);
    osc.stop(t + dur + 0.005);
  };

  if (outcome === 'win' || outcome === 'W') {
    scheduleTone(392.0, 0, 0.085, 'triangle', 0.038);     // G4
    scheduleTone(587.33, 0.065, 0.12, 'triangle', 0.042); // D5 (perfect 5th up)
  } else if (outcome === 'lose' || outcome === 'L') {
    scheduleTone(349.23, 0, 0.09, 'sine', 0.036);         // F4
    scheduleTone(293.66, 0.075, 0.13, 'sine', 0.034);     // D4 (minor 3rd down)
  } else {
    scheduleTone(440.0, 0, 0.032, 'triangle', 0.028);
    scheduleTone(440.0, 0.065, 0.032, 'triangle', 0.028);
  }
}
