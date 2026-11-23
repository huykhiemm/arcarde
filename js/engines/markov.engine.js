// Pure RPS & Markov Engine — O(1) rules lookup, 3-gram + 1st-order Markov + Frequency fallback.
// Zero DOM access.

export const CHOICES = [1, 2, 3];
export const CHOICE_META = {
  1: { id: 1, name: 'Kéo', icon: 'scissors', key: '1' },
  2: { id: 2, name: 'Búa', icon: 'rock', key: '2' },
  3: { id: 3, name: 'Bao', icon: 'paper', key: '3' },
};

const RULES = {
  '1-3': 'W',
  '2-1': 'W',
  '3-2': 'W',
  '1-2': 'L',
  '2-3': 'L',
  '3-1': 'L',
};

const REASONS = {
  '1-3': 'Kéo cắt Bao.',
  '2-1': 'Búa đập Kéo.',
  '3-2': 'Bao bọc Búa.',
  '1-2': 'Kéo thua Búa.',
  '2-3': 'Búa thua Bao.',
  '3-1': 'Bao thua Kéo.',
};

export function evaluateRound(p1, p2) {
  if (p1 === p2) return { outcome: 'D', reason: 'Hòa — cùng lựa chọn.' };
  const key = `${p1}-${p2}`;
  return { outcome: RULES[key] || 'L', reason: REASONS[key] || '' };
}

export function counterOf(c) {
  return c === 1 ? 2 : c === 2 ? 3 : 1;
}

export class MarkovAI {
  constructor(windowSize = 30) {
    this.windowSize = windowSize;
    this.reset();
  }

  reset() {
    this.counts = { 1: 0, 2: 0, 3: 0 };
    this.markov = {
      1: { 1: 0, 2: 0, 3: 0 },
      2: { 1: 0, 2: 0, 3: 0 },
      3: { 1: 0, 2: 0, 3: 0 },
    };
    this.history = [];
    this.totalPredictions = 0;
    this.correctPredictions = 0;
    this.lastDecision = {
      layer: 'Random',
      predictedPlayer: null,
      confidence: 33,
      aiChoice: null,
    };
  }

  // Evaluate deterministic prediction without mutating state
  peekPrediction(smart = true) {
    if (!smart || this.history.length < 2) {
      return { layer: 'Random', predictedPlayer: null, confidence: 33 };
    }

    // 1. 3-gram pattern detection
    if (this.history.length >= 3) {
      const last3 = this.history.slice(-3);
      const nc = { 1: 0, 2: 0, 3: 0 };
      for (let i = 0; i + 3 < this.history.length; i++) {
        if (
          this.history[i] === last3[0] &&
          this.history[i + 1] === last3[1] &&
          this.history[i + 2] === last3[2]
        ) {
          const nextMove = this.history[i + 3];
          nc[nextMove] = (nc[nextMove] || 0) + 1;
        }
      }
      const sum3 = nc[1] + nc[2] + nc[3];
      if (sum3 > 0) {
        const sorted = Object.entries(nc).sort((a, b) => b[1] - a[1]);
        const pred = +sorted[0][0];
        const conf = Math.round((sorted[0][1] / sum3) * 100);
        return { layer: '3-gram', predictedPlayer: pred, confidence: conf };
      }
    }

    // 2. 1st-order Markov transition matrix
    const last = this.history[this.history.length - 1];
    const row = this.markov[last];
    const rowSum = row[1] + row[2] + row[3];
    if (rowSum > 0) {
      const sorted = Object.entries(row).sort((a, b) => b[1] - a[1]);
      const pred = +sorted[0][0];
      const conf = Math.round((sorted[0][1] / rowSum) * 100);
      return { layer: 'Markov-1', predictedPlayer: pred, confidence: conf };
    }

    // 3. Frequency fallback
    const total = this.counts[1] + this.counts[2] + this.counts[3];
    if (total > 0) {
      const sorted = Object.entries(this.counts).sort((a, b) => b[1] - a[1]);
      const most = +sorted[0][0];
      const conf = Math.round((sorted[0][1] / total) * 100);
      return { layer: 'Frequency', predictedPlayer: most, confidence: conf };
    }

    return { layer: 'Random', predictedPlayer: null, confidence: 33 };
  }

  choose(smart = true) {
    const info = this.peekPrediction(smart);
    let aiChoice;

    if (!smart || info.layer === 'Random' || !info.predictedPlayer) {
      aiChoice = Math.ceil(Math.random() * 3);
    } else if (info.layer === '3-gram') {
      aiChoice = Math.random() < 0.8 ? counterOf(info.predictedPlayer) : Math.ceil(Math.random() * 3);
    } else if (info.layer === 'Markov-1') {
      aiChoice = Math.random() < 0.7 ? counterOf(info.predictedPlayer) : Math.ceil(Math.random() * 3);
    } else {
      aiChoice = Math.random() < 0.6 ? counterOf(info.predictedPlayer) : Math.ceil(Math.random() * 3);
    }

    this.lastDecision = {
      ...info,
      aiChoice,
    };
    return aiChoice;
  }

  observe(playerChoice) {
    if (this.lastDecision && this.lastDecision.predictedPlayer !== null) {
      this.totalPredictions++;
      if (this.lastDecision.predictedPlayer === playerChoice) {
        this.correctPredictions++;
      }
    }

    this.counts[playerChoice] = (this.counts[playerChoice] || 0) + 1;
    if (this.history.length > 0) {
      const prev = this.history[this.history.length - 1];
      this.markov[prev][playerChoice]++;
    }
    this.history.push(playerChoice);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  getTelemetry(smart = true) {
    const totalObs = this.counts[1] + this.counts[2] + this.counts[3];
    const frequencies = {};
    for (const c of CHOICES) {
      const count = this.counts[c];
      const pct = totalObs > 0 ? Math.round((count / totalObs) * 100) : 0;
      frequencies[c] = { count, pct };
    }

    const matrix = {};
    for (const from of CHOICES) {
      const row = this.markov[from];
      const rowTotal = row[1] + row[2] + row[3];
      matrix[from] = {};
      for (const to of CHOICES) {
        const count = row[to];
        const pct = rowTotal > 0 ? Math.round((count / rowTotal) * 100) : 0;
        matrix[from][to] = { count, pct, rowTotal };
      }
    }

    const nextPreview = this.peekPrediction(smart);
    const activeDecision = this.lastDecision.aiChoice !== null ? this.lastDecision : nextPreview;
    const accuracy = this.totalPredictions > 0
      ? Math.round((this.correctPredictions / this.totalPredictions) * 100)
      : 0;

    return {
      totalObs,
      windowLen: this.history.length,
      windowMax: this.windowSize,
      lastMove: this.history.length > 0 ? this.history[this.history.length - 1] : null,
      frequencies,
      matrix,
      layer: activeDecision.layer,
      predictedPlayer: activeDecision.predictedPlayer,
      confidence: activeDecision.confidence,
      nextPrediction: nextPreview,
      totalPredictions: this.totalPredictions,
      correctPredictions: this.correctPredictions,
      accuracy,
    };
  }
}
