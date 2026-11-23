import { icon } from '../core/icons.js';
import { ALGOS, createRandomArray, createSortGenerator } from '../engines/sorting.engine.js';

const SPEEDS = [
  { label: '0.5×', ms: 180 },
  { label: '1×', ms: 85 },
  { label: '2×', ms: 35 },
  { label: 'Max', ms: 12 },
];

export const sortingView = {
  mount(root) {
    let algoKey = 'bubble';
    let size = 28;
    let speedMs = 35;
    let arr = createRandomArray(size);
    let maxVal = Math.max(...arr, 1);
    let bars = [];
    let gen = null;
    let timerId = null;
    let status = 'Idle'; // 'Idle' | 'Running' | 'Paused' | 'Done'
    let comps = 0;
    let swaps = 0;

    const sec = document.createElement('section');

    // Header
    const head = document.createElement('header');
    head.className = 'module__head';
    const h1 = document.createElement('h1');
    h1.className = 'module__title';
    h1.textContent = 'Sorting Visualizer';
    const sub = document.createElement('p');
    sub.className = 'module__sub';
    sub.textContent = 'Bảy thuật toán sắp xếp dạng Generator — cập nhật trực tiếp DOM 60fps, không tạo lại phần tử.';
    head.append(h1, sub);

    // Two-column layout
    const layout = document.createElement('div');
    layout.className = 'module';

    // Main stage
    const stage = document.createElement('div');
    stage.className = 'stage sort-stage';

    // Algorithm selector tabs
    const algoBar = document.createElement('div');
    algoBar.className = 'sort-algos';
    algoBar.setAttribute('role', 'tablist');
    algoBar.setAttribute('aria-label', 'Chọn thuật toán sắp xếp');
    const algoBtns = new Map();

    Object.values(ALGOS).forEach((meta) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'segmented__btn sort-algo-btn';
      btn.textContent = meta.name;
      btn.setAttribute('aria-pressed', String(meta.key === algoKey));
      btn.addEventListener('click', () => {
        if (algoKey === meta.key) return;
        algoKey = meta.key;
        algoBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === algoKey)));
        resetSort(false);
        updateComplexity();
      });
      algoBtns.set(meta.key, btn);
      algoBar.appendChild(btn);
    });

    // Control toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'sort-toolbar';

    const actionGroup = document.createElement('div');
    actionGroup.className = 'sort-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn btn--primary';

    const stepBtn = document.createElement('button');
    stepBtn.type = 'button';
    stepBtn.className = 'btn btn--ghost';
    stepBtn.innerHTML = `${icon('step', 16)}<span>Step</span>`;

    const randBtn = document.createElement('button');
    randBtn.type = 'button';
    randBtn.className = 'btn btn--ghost';
    randBtn.innerHTML = `${icon('shuffle', 16)}<span>Randomize</span>`;

    actionGroup.append(playBtn, stepBtn, randBtn);

    const paramGroup = document.createElement('div');
    paramGroup.className = 'sort-params';

    // Size slider (5-60)
    const sizeWrap = document.createElement('label');
    sizeWrap.className = 'sort-param';
    const sizeText = document.createElement('span');
    sizeText.className = 'sort-param__label';
    const sizeValEl = document.createElement('strong');
    sizeValEl.className = 'tabular';
    sizeValEl.textContent = String(size);
    sizeText.append('Kích thước: ', sizeValEl);

    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.className = 'sort-slider';
    sizeInput.min = '5';
    sizeInput.max = '60';
    sizeInput.value = String(size);
    sizeWrap.append(sizeText, sizeInput);

    // Speed segmented selector
    const speedWrap = document.createElement('div');
    speedWrap.className = 'sort-param';
    const speedLabel = document.createElement('span');
    speedLabel.className = 'sort-param__label';
    speedLabel.textContent = 'Tốc độ';
    const speedSeg = document.createElement('div');
    speedSeg.className = 'segmented';
    SPEEDS.forEach((sp) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'segmented__btn';
      b.textContent = sp.label;
      b.setAttribute('aria-pressed', String(sp.ms === speedMs));
      b.addEventListener('click', () => {
        speedMs = sp.ms;
        speedSeg.querySelectorAll('.segmented__btn').forEach((el) => {
          el.setAttribute('aria-pressed', String(el === b));
        });
      });
      speedSeg.appendChild(b);
    });
    speedWrap.append(speedLabel, speedSeg);

    paramGroup.append(sizeWrap, speedWrap);
    toolbar.append(actionGroup, paramGroup);

    // Bar Stage
    const canvas = document.createElement('div');
    canvas.className = 'sort-canvas';
    canvas.setAttribute('aria-label', 'Biểu đồ cột sắp xếp');

    // Legend
    const legend = document.createElement('div');
    legend.className = 'sort-legend';
    const legendItems = [
      ['sort-dot--comparing', 'Đang so sánh'],
      ['sort-dot--swapping', 'Đang hoán đổi'],
      ['sort-dot--pivot', 'Pivot'],
      ['sort-dot--counting', 'Đang đếm'],
      ['sort-dot--sorted', 'Đã cố định'],
    ];
    legendItems.forEach(([cls, text]) => {
      const item = document.createElement('span');
      item.className = 'sort-legend__item';
      const dot = document.createElement('span');
      dot.className = `sort-dot ${cls}`;
      const lbl = document.createElement('span');
      lbl.textContent = text;
      item.append(dot, lbl);
      legend.appendChild(item);
    });

    stage.append(algoBar, toolbar, canvas, legend);

    // Telemetry Sidebar
    const aside = document.createElement('aside');
    aside.className = 'telemetry';
    aside.setAttribute('aria-label', 'Telemetry');

    const teleTitle = document.createElement('div');
    teleTitle.className = 'telemetry__title';
    teleTitle.textContent = 'Live Telemetry';

    const grid = document.createElement('div');
    grid.className = 'telemetry__grid';

    function makeMetric(label, accent = false) {
      const card = document.createElement('div');
      card.className = 'metric';
      const l = document.createElement('div');
      l.className = 'metric__label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = accent ? 'metric__value metric__value--accent' : 'metric__value';
      card.append(l, v);
      grid.appendChild(card);
      return v;
    }

    const valComps = makeMetric('Comparisons', true);
    const valSwaps = makeMetric('Swaps');
    const valSize = makeMetric('Array Size');
    const valState = makeMetric('Status');

    // Big-O Complexity Card
    const compCard = document.createElement('div');
    compCard.className = 'tele-card';

    const compHead = document.createElement('div');
    compHead.className = 'tele-card__title';
    const compDesc = document.createElement('p');
    compDesc.className = 'tele-card__desc';

    const compTable = document.createElement('dl');
    compTable.className = 'bigo-table';

    function makeBigORow(term) {
      const row = document.createElement('div');
      row.className = 'bigo-row';
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.className = 'tabular';
      row.append(dt, dd);
      compTable.appendChild(row);
      return dd;
    }

    const ddBest = makeBigORow('Best Time');
    const ddAvg = makeBigORow('Average Time');
    const ddWorst = makeBigORow('Worst Time');
    const ddSpace = makeBigORow('Auxiliary Space');
    const ddStable = makeBigORow('Stable');

    compCard.append(compHead, compDesc, compTable);
    aside.append(teleTitle, grid, compCard);

    layout.append(stage, aside);
    sec.append(head, layout);
    root.appendChild(sec);

    // Pre-allocate exact n <div class="sort-bar"> elements on array creation / resize
    function initBarsDom() {
      canvas.replaceChildren();
      bars = [];
      maxVal = Math.max(...arr, 1);
      for (let i = 0; i < arr.length; i++) {
        const bar = document.createElement('div');
        bar.className = 'sort-bar';
        const pct = Math.max(6, Math.round((arr[i] / maxVal) * 100));
        bar.style.height = `${pct}%`;
        bar.title = String(arr[i]);
        canvas.appendChild(bar);
        bars.push(bar);
      }
    }

    // Mutate existing DOM nodes in-place without innerHTML
    function applySnapshot(snap) {
      const a = snap.array;
      const compSet = new Set(snap.comparing);
      const swapSet = new Set(snap.swapping);
      const countSet = new Set(snap.counting);
      const sortSet = new Set(snap.sorted);
      const piv = snap.pivot;

      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const v = a[i];
        const pct = Math.max(6, Math.round((v / maxVal) * 100));
        bar.style.height = `${pct}%`;

        bar.classList.toggle('is-comparing', compSet.has(i));
        bar.classList.toggle('is-swapping', swapSet.has(i));
        bar.classList.toggle('is-pivot', piv === i);
        bar.classList.toggle('is-counting', countSet.has(i));
        bar.classList.toggle('is-sorted', sortSet.has(i));
      }

      comps = snap.comps;
      swaps = snap.swaps;
      arr = a;
      updateTelemetry();
    }

    function updatePlayBtnUI() {
      if (status === 'Running') {
        playBtn.innerHTML = `${icon('pause', 16)}<span>Pause</span>`;
      } else if (status === 'Paused') {
        playBtn.innerHTML = `${icon('play', 16)}<span>Resume</span>`;
      } else {
        playBtn.innerHTML = `${icon('play', 16)}<span>Play</span>`;
      }
      stepBtn.disabled = status === 'Running';
    }

    function updateTelemetry() {
      valComps.textContent = String(comps);
      valSwaps.textContent = String(swaps);
      valSize.textContent = String(arr.length);
      valState.textContent = status;
    }

    function updateComplexity() {
      const m = ALGOS[algoKey];
      compHead.textContent = m.name;
      compDesc.textContent = m.desc;
      ddBest.textContent = m.best;
      ddAvg.textContent = m.avg;
      ddWorst.textContent = m.worst;
      ddSpace.textContent = m.space;
      ddStable.textContent = m.stable ? 'Yes' : 'No';
    }

    function clearTimer() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    }

    function stepOnce() {
      if (!gen) {
        gen = createSortGenerator(algoKey, arr);
      }
      const res = gen.next();
      if (res.done) {
        clearTimer();
        gen = null;
        status = 'Done';
        for (let i = 0; i < bars.length; i++) {
          bars[i].classList.remove('is-comparing', 'is-swapping', 'is-pivot', 'is-counting');
          bars[i].classList.add('is-sorted');
        }
        updatePlayBtnUI();
        updateTelemetry();
        return true;
      }
      applySnapshot(res.value);
      return false;
    }

    function tick() {
      if (status !== 'Running') return;
      const done = stepOnce();
      if (!done && status === 'Running') {
        timerId = setTimeout(tick, speedMs);
      }
    }

    function handlePlayPause() {
      if (status === 'Running') {
        clearTimer();
        status = 'Paused';
        updatePlayBtnUI();
        updateTelemetry();
        return;
      }
      if (status === 'Done') {
        arr = createRandomArray(size);
        initBarsDom();
        comps = 0;
        swaps = 0;
        gen = createSortGenerator(algoKey, arr);
      } else if (!gen) {
        gen = createSortGenerator(algoKey, arr);
      }
      status = 'Running';
      updatePlayBtnUI();
      updateTelemetry();
      tick();
    }

    function handleStep() {
      if (status === 'Running') return;
      if (status === 'Done') {
        arr = createRandomArray(size);
        initBarsDom();
        comps = 0;
        swaps = 0;
        gen = null;
      }
      status = 'Paused';
      updatePlayBtnUI();
      stepOnce();
    }

    function resetSort(newRandom = true) {
      clearTimer();
      gen = null;
      status = 'Idle';
      comps = 0;
      swaps = 0;
      if (newRandom) {
        arr = createRandomArray(size);
      }
      initBarsDom();
      updatePlayBtnUI();
      updateTelemetry();
    }

    playBtn.addEventListener('click', handlePlayPause);
    stepBtn.addEventListener('click', handleStep);
    randBtn.addEventListener('click', () => resetSort(true));

    sizeInput.addEventListener('input', () => {
      size = Number(sizeInput.value);
      sizeValEl.textContent = String(size);
      resetSort(true);
    });

    // Initial render
    initBarsDom();
    updatePlayBtnUI();
    updateTelemetry();
    updateComplexity();

    this._cleanup = () => {
      clearTimer();
      gen = null;
      bars = [];
    };
  },

  unmount() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
  },
};
