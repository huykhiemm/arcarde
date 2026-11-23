// Pure Sorting Engine — Generator-based step execution with Big-O metadata.
// Zero DOM access. No global mutable state.

export const ALGOS = {
  bubble: {
    key: 'bubble',
    name: 'Bubble Sort',
    desc: 'So sánh từng cặp phần tử liền kề, đổi chỗ nếu sai thứ tự. Lặp lại cho đến khi toàn bộ mảng được sắp xếp. Đơn giản nhưng kém hiệu quả cho dữ liệu lớn.',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
  },
  insertion: {
    key: 'insertion',
    name: 'Insertion Sort',
    desc: 'Lấy từng phần tử và chèn vào đúng vị trí trong phần đã sắp xếp. Rất hiệu quả với mảng nhỏ hoặc gần như đã sắp xếp.',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
  },
  selection: {
    key: 'selection',
    name: 'Selection Sort',
    desc: 'Tìm phần tử nhỏ nhất trong phần chưa sắp xếp và đặt vào đầu. Luôn O(n²) bất kể dữ liệu đầu vào.',
    best: 'O(n²)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
  },
  quick: {
    key: 'quick',
    name: 'Quick Sort',
    desc: 'Chọn một pivot, phân hoạch mảng thành hai phần nhỏ hơn và lớn hơn pivot, rồi đệ quy sắp xếp từng phần. Trung bình rất nhanh.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n)',
    stable: false,
  },
  merge: {
    key: 'merge',
    name: 'Merge Sort',
    desc: 'Chia mảng thành hai nửa, sắp xếp từng nửa, rồi gộp lại. Luôn O(n log n) và ổn định, nhưng cần thêm O(n) bộ nhớ.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
  },
  heap: {
    key: 'heap',
    name: 'Heap Sort',
    desc: 'Xây dựng Max-Heap từ mảng, rồi lần lượt lấy phần tử lớn nhất (gốc heap) ra và đặt vào cuối. In-place, không cần bộ nhớ thêm.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
  },
  counting: {
    key: 'counting',
    name: 'Counting Sort',
    desc: 'Đếm số lần xuất hiện của mỗi giá trị, rồi xây dựng lại mảng từ bảng đếm. Rất nhanh khi range giá trị nhỏ, nhưng cần bộ nhớ thêm O(k).',
    best: 'O(n+k)',
    avg: 'O(n+k)',
    worst: 'O(n+k)',
    space: 'O(k)',
    stable: true,
  },
};

export function createRandomArray(n, min = 20, max = 160) {
  const span = max - min;
  return Array.from({ length: n }, () => Math.floor(Math.random() * span) + min);
}

function snap(a, st, highlights = {}) {
  return {
    array: a.slice(),
    comparing: highlights.comparing || [],
    swapping: highlights.swapping || [],
    pivot: highlights.pivot ?? -1,
    counting: highlights.counting || [],
    sorted: highlights.sorted || [],
    comps: st.comps,
    swaps: st.swaps,
  };
}

function rangeIdx(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => i + offset);
}

export function* bubbleSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };
  const sortedTail = [];

  for (let i = 0; i < n - 1; i++) {
    let sw = false;
    for (let j = 0; j < n - i - 1; j++) {
      st.comps++;
      yield snap(a, st, { comparing: [j, j + 1], sorted: sortedTail.slice() });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        st.swaps++;
        sw = true;
        yield snap(a, st, { swapping: [j, j + 1], sorted: sortedTail.slice() });
      }
    }
    sortedTail.push(n - 1 - i);
    if (!sw) break;
  }
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* insertionSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };

  yield snap(a, st, { sorted: [0] });
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      st.comps++;
      yield snap(a, st, { comparing: [j, j + 1], sorted: rangeIdx(i) });
      if (a[j] > key) {
        a[j + 1] = a[j];
        st.swaps++;
        yield snap(a, st, { swapping: [j, j + 1], sorted: rangeIdx(i) });
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    yield snap(a, st, { sorted: rangeIdx(i + 1) });
  }
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* selectionSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };

  for (let i = 0; i < n - 1; i++) {
    let mi = i;
    for (let j = i + 1; j < n; j++) {
      st.comps++;
      yield snap(a, st, { comparing: [mi, j], sorted: rangeIdx(i) });
      if (a[j] < a[mi]) mi = j;
    }
    if (mi !== i) {
      [a[i], a[mi]] = [a[mi], a[i]];
      st.swaps++;
      yield snap(a, st, { swapping: [i, mi], sorted: rangeIdx(i) });
    }
  }
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* quickSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };
  const fixed = new Set();

  function* qs(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) {
      fixed.add(lo);
      return;
    }
    const pivot = a[hi];
    let pi = lo;
    yield snap(a, st, { pivot: hi, sorted: [...fixed] });
    for (let j = lo; j < hi; j++) {
      st.comps++;
      yield snap(a, st, { comparing: [j, hi], pivot: hi, sorted: [...fixed] });
      if (a[j] <= pivot) {
        if (pi !== j) {
          [a[pi], a[j]] = [a[j], a[pi]];
          st.swaps++;
          yield snap(a, st, { swapping: [pi, j], pivot: hi, sorted: [...fixed] });
        }
        pi++;
      }
    }
    [a[pi], a[hi]] = [a[hi], a[pi]];
    st.swaps++;
    fixed.add(pi);
    yield snap(a, st, { swapping: [pi, hi], sorted: [...fixed] });
    yield* qs(lo, pi - 1);
    yield* qs(pi + 1, hi);
  }

  yield* qs(0, n - 1);
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* mergeSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };

  function* ms(l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    yield* ms(l, m);
    yield* ms(m + 1, r);
    const left = a.slice(l, m + 1);
    const right = a.slice(m + 1, r + 1);
    let i = 0;
    let j = 0;
    let k = l;
    while (i < left.length && j < right.length) {
      st.comps++;
      yield snap(a, st, { comparing: [k, m + 1 + j] });
      if (left[i] <= right[j]) {
        a[k++] = left[i++];
      } else {
        a[k++] = right[j++];
        st.swaps++;
        yield snap(a, st, { swapping: [k - 1] });
      }
    }
    while (i < left.length) {
      a[k++] = left[i++];
    }
    while (j < right.length) {
      a[k++] = right[j++];
    }
    yield snap(a, st, { sorted: rangeIdx(r - l + 1, l) });
  }

  yield* ms(0, n - 1);
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* heapSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };
  let sortedTail = [];

  function* heapify(size, root) {
    let largest = root;
    const l = 2 * root + 1;
    const r = 2 * root + 2;

    if (l < size) {
      st.comps++;
      yield snap(a, st, { comparing: [largest, l], sorted: sortedTail });
      if (a[l] > a[largest]) largest = l;
    }
    if (r < size) {
      st.comps++;
      yield snap(a, st, { comparing: [largest, r], sorted: sortedTail });
      if (a[r] > a[largest]) largest = r;
    }
    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]];
      st.swaps++;
      yield snap(a, st, { swapping: [root, largest], sorted: sortedTail });
      yield* heapify(size, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    st.swaps++;
    sortedTail = Array.from({ length: n - i }, (_, x) => n - 1 - x);
    yield snap(a, st, { swapping: [0, i], sorted: sortedTail });
    yield* heapify(i, 0);
  }
  yield snap(a, st, { sorted: rangeIdx(n) });
}

export function* countingSortGen(input) {
  const a = input.slice();
  const n = a.length;
  const st = { comps: 0, swaps: 0 };
  const max = Math.max(...a);
  const min = Math.min(...a);
  const range = max - min + 1;
  const count = Array(range).fill(0);

  for (let i = 0; i < n; i++) {
    count[a[i] - min]++;
    st.comps++;
    yield snap(a, st, { counting: [i] });
  }

  let idx = 0;
  for (let i = 0; i < range; i++) {
    while (count[i] > 0) {
      a[idx] = i + min;
      st.swaps++;
      yield snap(a, st, { swapping: [idx], sorted: rangeIdx(idx) });
      idx++;
      count[i]--;
    }
  }
  yield snap(a, st, { sorted: rangeIdx(n) });
}

const GENERATORS = {
  bubble: bubbleSortGen,
  insertion: insertionSortGen,
  selection: selectionSortGen,
  quick: quickSortGen,
  merge: mergeSortGen,
  heap: heapSortGen,
  counting: countingSortGen,
};

export function createSortGenerator(algoKey, array) {
  const gen = GENERATORS[algoKey] || bubbleSortGen;
  return gen(array);
}
