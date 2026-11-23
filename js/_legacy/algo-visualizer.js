/* ═══════════════════════════════════════════════════════
   algo-visualizer.js — Sorting Algorithm Visualizer
   Algorithms: Bubble, Insertion, Selection, Quick, Merge,
               Heap Sort, Counting Sort
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

let arr = [], steps = [], stepIdx = 0, sorting = false, paused = false, sortTimeout = null;
let comps = 0, swaps = 0, algoName = 'bubble', sortSpeed = 100;

const ALGOS = {
  bubble: {
    name: 'Bubble Sort',
    desc: 'So sánh từng cặp phần tử liền kề, đổi chỗ nếu sai thứ tự. Lặp lại cho đến khi toàn bộ mảng được sắp xếp. Đơn giản nhưng kém hiệu quả cho dữ liệu lớn.',
    best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true
  },
  insertion: {
    name: 'Insertion Sort',
    desc: 'Lấy từng phần tử và chèn vào đúng vị trí trong phần đã sắp xếp. Rất hiệu quả với mảng nhỏ hoặc gần như đã sắp xếp.',
    best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true
  },
  selection: {
    name: 'Selection Sort',
    desc: 'Tìm phần tử nhỏ nhất trong phần chưa sắp xếp và đặt vào đầu. Luôn O(n²) bất kể dữ liệu đầu vào.',
    best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false
  },
  quick: {
    name: 'Quick Sort',
    desc: 'Chọn một pivot, phân hoạch mảng thành hai phần nhỏ hơn và lớn hơn pivot, rồi đệ quy sắp xếp từng phần. Trung bình rất nhanh.',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false
  },
  merge: {
    name: 'Merge Sort',
    desc: 'Chia mảng thành hai nửa, sắp xếp từng nửa, rồi gộp lại. Luôn O(n log n) và ổn định, nhưng cần thêm O(n) bộ nhớ.',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true
  },
  heap: {
    name: 'Heap Sort',
    desc: 'Xây dựng Max-Heap từ mảng, rồi lần lượt lấy phần tử lớn nhất (gốc heap) ra và đặt vào cuối. In-place, không cần bộ nhớ thêm.',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false
  },
  counting: {
    name: 'Counting Sort',
    desc: 'Đếm số lần xuất hiện của mỗi giá trị, rồi xây dựng lại mảng từ bảng đếm. Rất nhanh khi range giá trị nhỏ, nhưng cần bộ nhớ thêm O(k).',
    best: 'O(n+k)', avg: 'O(n+k)', worst: 'O(n+k)', space: 'O(k)', stable: true
  }
};

function initAlgo() {
  randomizeArray();
  renderAlgoExplain();
}

function setAlgo(name) {
  algoName = name;
  document.querySelectorAll('#page-algo .algo-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.algo === name) tab.classList.add('active');
  });
  stopSort();
  randomizeArray();
  renderAlgoExplain();
}

function setSpeed(v) { sortSpeed = +v; }

function randomizeArray() {
  const slider = document.getElementById('sizeSlider');
  const n = slider ? +slider.value : 20;
  arr = Array.from({ length: n }, () => Math.floor(Math.random() * 140) + 20);
  stopSort();
  comps = 0;
  swaps = 0;
  updateAlgoStats();
  renderBars();
}

function resizeArray(n) {
  document.getElementById('statSize').textContent = n;
  randomizeArray();
}

function updateAlgoStats() {
  const compEl = document.getElementById('statComp');
  const swapEl = document.getElementById('statSwap');
  if (compEl) compEl.textContent = comps;
  if (swapEl) swapEl.textContent = swaps;
}

function renderBars(highlights = {}) {
  const canvas = document.getElementById('algoCanvas');
  if (!canvas) return;
  const maxH = 140, maxV = Math.max(...arr, 1);
  canvas.innerHTML = arr.map((v, i) => {
    const h = Math.round((v / maxV) * maxH);
    let cls = '';
    if (highlights.sorted?.includes(i)) cls = 'sorted';
    else if (highlights.pivot === i) cls = 'pivot';
    else if (highlights.comparing?.includes(i)) cls = 'comparing';
    else if (highlights.swapping?.includes(i)) cls = 'swapping';
    else if (highlights.counting?.includes(i)) cls = 'counting';
    return `<div class="bar ${cls}" style="height:${h}px;flex:1;max-width:32px;min-width:6px;" title="${v}"></div>`;
  }).join('');
}

// ── Sort Generators ──

function* bubbleSortGen(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let sw = false;
    for (let j = 0; j < n - i - 1; j++) {
      comps++;
      yield { comparing: [j, j + 1] };
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        sw = true;
        yield { swapping: [j, j + 1] };
      }
    }
    if (!sw) break;
  }
  yield { sorted: [...Array(n).keys()] };
}

function* insertionSortGen(a) {
  const n = a.length;
  yield { sorted: [0] };
  for (let i = 1; i < n; i++) {
    let key = a[i], j = i - 1;
    yield { comparing: [i, j] };
    while (j >= 0 && a[j] > key) {
      comps++;
      a[j + 1] = a[j];
      swaps++;
      yield { swapping: [j, j + 1] };
      j--;
    }
    a[j + 1] = key;
    yield { sorted: [...Array(i + 1).keys()] };
  }
  yield { sorted: [...Array(n).keys()] };
}

function* selectionSortGen(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let mi = i;
    for (let j = i + 1; j < n; j++) {
      comps++;
      yield { comparing: [mi, j], sorted: [...Array(i).keys()] };
      if (a[j] < a[mi]) mi = j;
    }
    if (mi !== i) {
      [a[i], a[mi]] = [a[mi], a[i]];
      swaps++;
      yield { swapping: [i, mi], sorted: [...Array(i).keys()] };
    }
  }
  yield { sorted: [...Array(n).keys()] };
}

function* quickSortGen(a, lo = 0, hi = a.length - 1) {
  if (lo < hi) {
    let pivot = a[hi], pi = lo;
    yield { pivot: hi };
    for (let j = lo; j < hi; j++) {
      comps++;
      yield { comparing: [j, hi], pivot: hi };
      if (a[j] <= pivot) {
        [a[pi], a[j]] = [a[j], a[pi]];
        swaps++;
        yield { swapping: [pi, j], pivot: hi };
        pi++;
      }
    }
    [a[pi], a[hi]] = [a[hi], a[pi]];
    swaps++;
    yield { swapping: [pi, hi] };
    yield* quickSortGen(a, lo, pi - 1);
    yield* quickSortGen(a, pi + 1, hi);
  }
}

function* mergeSortGen(a, l = 0, r = a.length - 1) {
  if (l >= r) return;
  const m = Math.floor((l + r) / 2);
  yield* mergeSortGen(a, l, m);
  yield* mergeSortGen(a, m + 1, r);
  const left = a.slice(l, m + 1), right = a.slice(m + 1, r + 1);
  let i = 0, j = 0, k = l;
  while (i < left.length && j < right.length) {
    comps++;
    yield { comparing: [k, m + 1 + j] };
    if (left[i] <= right[j]) { a[k++] = left[i++]; }
    else { a[k++] = right[j++]; swaps++; }
  }
  while (i < left.length) a[k++] = left[i++];
  while (j < right.length) a[k++] = right[j++];
  yield { sorted: [...Array(r - l + 1).keys()].map(x => x + l) };
}

function* heapSortGen(a) {
  const n = a.length;

  // Build max heap
  function* heapify(size, root) {
    let largest = root;
    const l = 2 * root + 1;
    const r = 2 * root + 2;

    if (l < size) {
      comps++;
      yield { comparing: [largest, l] };
      if (a[l] > a[largest]) largest = l;
    }
    if (r < size) {
      comps++;
      yield { comparing: [largest, r] };
      if (a[r] > a[largest]) largest = r;
    }

    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]];
      swaps++;
      yield { swapping: [root, largest] };
      yield* heapify(size, largest);
    }
  }

  // Build heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  // Extract elements
  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    swaps++;
    yield { swapping: [0, i], sorted: [...Array(n - i).keys()].map(x => n - 1 - x) };
    yield* heapify(i, 0);
  }
  yield { sorted: [...Array(n).keys()] };
}

function* countingSortGen(a) {
  const n = a.length;
  const max = Math.max(...a);
  const min = Math.min(...a);
  const range = max - min + 1;
  const count = Array(range).fill(0);

  // Count occurrences
  for (let i = 0; i < n; i++) {
    count[a[i] - min]++;
    comps++;
    yield { counting: [i] };
  }

  // Rebuild array
  let idx = 0;
  for (let i = 0; i < range; i++) {
    while (count[i] > 0) {
      a[idx] = i + min;
      swaps++;
      yield { swapping: [idx], sorted: [...Array(idx).keys()] };
      idx++;
      count[i]--;
    }
  }
  yield { sorted: [...Array(n).keys()] };
}

// ── Sort Execution ──
let genIterator = null;

function startSort() {
  if (sorting && !paused) return;
  if (paused) {
    paused = false;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('sortBtn').disabled = true;
    runStep();
    return;
  }
  sorting = true;
  paused = false;
  document.getElementById('sortBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  const a = [...arr];
  comps = 0;
  swaps = 0;

  const gens = {
    bubble: bubbleSortGen,
    insertion: insertionSortGen,
    selection: selectionSortGen,
    quick: quickSortGen,
    merge: mergeSortGen,
    heap: heapSortGen,
    counting: countingSortGen
  };

  genIterator = gens[algoName](a);
  arr = a;
  runStep();
}

function runStep() {
  if (!genIterator || paused) return;
  const res = genIterator.next();
  if (res.done) {
    sorting = false;
    paused = false;
    document.getElementById('sortBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    renderBars({ sorted: [...Array(arr.length).keys()] });
    updateAlgoStats();
    return;
  }
  updateAlgoStats();
  renderBars(res.value);
  sortTimeout = setTimeout(runStep, sortSpeed);
}

function pauseSort() {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
  if (!paused) runStep();
}

function stopSort() {
  sorting = false;
  paused = false;
  clearTimeout(sortTimeout);
  genIterator = null;
  const sortBtn = document.getElementById('sortBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  if (sortBtn) sortBtn.disabled = false;
  if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.textContent = '⏸ Tạm dừng';
  }
}

function renderAlgoExplain() {
  const a = ALGOS[algoName];
  const el = document.getElementById('algoExplain');
  if (!el || !a) return;
  el.innerHTML = `
    <div class="explain-title">${a.name} — Cách hoạt động</div>
    <div class="explain-body">${a.desc}</div>
    <div class="complexity-row">
      <span class="complex-chip">Best: <b>${a.best}</b></span>
      <span class="complex-chip">Avg: <b>${a.avg}</b></span>
      <span class="complex-chip">Worst: <b>${a.worst}</b></span>
      <span class="complex-chip">Space: <b>${a.space}</b></span>
      <span class="complex-chip">Stable: <b>${a.stable ? '✓ Có' : '✗ Không'}</b></span>
    </div>
  `;
}
