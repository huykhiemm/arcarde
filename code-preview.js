/* ═══════════════════════════════════════════════════════
   code-preview.js — Code Display with Syntax Highlighting
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

const CODE_SAMPLES = {
  cs: {
    file: 'RockPaperScissors.cs',
    code: `<span class="cmt">// ╔═══════════════════════════════════════╗
// ║  Rock Paper Scissors — Refactored     ║
// ║  Copyright © 2025 KhiemHuy           ║
// ╚═══════════════════════════════════════╝</span>

<span class="kw">using</span> System;
<span class="kw">using</span> System.Collections.Generic;
<span class="kw">using</span> System.Linq;

<span class="kw">namespace</span> <span class="cls">KhiemHuy.GameArcade</span>
{
    <span class="cmt">// ── Enums ───────────────────────────────</span>
    <span class="kw">public enum</span> <span class="cls">Choice</span> { Keo = <span class="num">1</span>, Bua = <span class="num">2</span>, Bao = <span class="num">3</span> }
    <span class="kw">public enum</span> <span class="cls">Outcome</span> { Win, Lose, Draw }

    <span class="cmt">// ── Value Objects ───────────────────────</span>
    <span class="kw">public readonly record struct</span> <span class="cls">RoundResult</span>(
        <span class="cls">Outcome</span> Outcome,
        <span class="kw">string</span> Reason
    );

    <span class="cmt">// ── Rules Engine — O(1) lookup ──────────</span>
    <span class="kw">public static class</span> <span class="cls">RulesEngine</span>
    {
        <span class="kw">private static readonly</span> <span class="cls">Dictionary</span>&lt;(<span class="cls">Choice</span>, <span class="cls">Choice</span>), <span class="cls">RoundResult</span>&gt; _wins
            = <span class="kw">new</span>()
            {
                [(Choice.Keo, Choice.Bao)] = <span class="kw">new</span>(<span class="cls">Outcome</span>.Win,  <span class="str">"Kéo cắt Bao."</span>),
                [(Choice.Bua, Choice.Keo)] = <span class="kw">new</span>(<span class="cls">Outcome</span>.Win,  <span class="str">"Búa đập Kéo."</span>),
                [(Choice.Bao, Choice.Bua)] = <span class="kw">new</span>(<span class="cls">Outcome</span>.Win,  <span class="str">"Bao bọc Búa."</span>),
            };

        <span class="kw">public static</span> <span class="cls">RoundResult</span> <span class="fn">Evaluate</span>(<span class="cls">Choice</span> p1, <span class="cls">Choice</span> p2)
        {
            <span class="kw">if</span> (p1 == p2)
                <span class="kw">return new</span>(<span class="cls">Outcome</span>.Draw, <span class="str">"Hòa — cùng lựa chọn."</span>);

            <span class="kw">if</span> (_wins.<span class="fn">TryGetValue</span>((p1, p2), <span class="kw">out var</span> win))
                <span class="kw">return</span> win;

            <span class="kw">if</span> (_wins.<span class="fn">TryGetValue</span>((p2, p1), <span class="kw">out var</span> opp))
                <span class="kw">return new</span>(<span class="cls">Outcome</span>.Lose, opp.Reason);

            <span class="kw">throw new</span> <span class="cls">ArgumentException</span>(<span class="str">$"Invalid pair: {p1}, {p2}"</span>);
        }
    }

    <span class="cmt">// ── Markov AI ───────────────────────────</span>
    <span class="kw">public class</span> <span class="cls">MarkovAI</span>
    {
        <span class="kw">private readonly</span> <span class="cls">Dictionary</span>&lt;<span class="cls">Choice</span>, <span class="kw">int</span>&gt; _freq;
        <span class="kw">private readonly</span> <span class="cls">Dictionary</span>&lt;<span class="cls">Choice</span>, <span class="cls">Dictionary</span>&lt;<span class="cls">Choice</span>, <span class="kw">int</span>&gt;&gt; _markov;
        <span class="kw">private readonly</span> <span class="cls">List</span>&lt;<span class="cls">Choice</span>&gt; _history = [];

        <span class="kw">public void</span> <span class="fn">Observe</span>(<span class="cls">Choice</span> c)
        {
            _freq[c]++;
            <span class="kw">if</span> (_history.<span class="fn">Count</span> > <span class="num">0</span>)
                _markov[_history[^<span class="num">1</span>]][c]++;
            _history.<span class="fn">Add</span>(c);
        }

        <span class="kw">public</span> <span class="cls">Choice</span> <span class="fn">Predict</span>(<span class="kw">bool</span> smart = <span class="kw">true</span>)
        {
            <span class="cmt">// 1. 3-gram pattern → 2. Markov → 3. Frequency</span>
            <span class="cmt">// Mỗi tầng có xác suất sử dụng để tránh deterministic</span>
            ...
        }

        <span class="kw">private static</span> <span class="cls">Choice</span> <span class="fn">CounterOf</span>(<span class="cls">Choice</span> c) => c <span class="kw">switch</span>
        {
            <span class="cls">Choice</span>.Keo => <span class="cls">Choice</span>.Bua,
            <span class="cls">Choice</span>.Bua => <span class="cls">Choice</span>.Bao,
            <span class="cls">Choice</span>.Bao => <span class="cls">Choice</span>.Keo,
            _ => <span class="kw">throw new</span> <span class="cls">ArgumentOutOfRangeException</span>()
        };
    }
}`
  },
  js: {
    file: 'MarkovAI.js',
    code: `<span class="cmt">// ╔═══════════════════════════════════════╗
// ║  Markov AI — JavaScript               ║
// ║  Copyright © 2025 KhiemHuy           ║
// ╚═══════════════════════════════════════╝</span>

<span class="kw">class</span> <span class="cls">MarkovAI</span> {
  #freq    = { <span class="num">1</span>: <span class="num">0</span>, <span class="num">2</span>: <span class="num">0</span>, <span class="num">3</span>: <span class="num">0</span> };
  #markov  = {
    <span class="num">1</span>: { <span class="num">1</span>: <span class="num">0</span>, <span class="num">2</span>: <span class="num">0</span>, <span class="num">3</span>: <span class="num">0</span> },
    <span class="num">2</span>: { <span class="num">1</span>: <span class="num">0</span>, <span class="num">2</span>: <span class="num">0</span>, <span class="num">3</span>: <span class="num">0</span> },
    <span class="num">3</span>: { <span class="num">1</span>: <span class="num">0</span>, <span class="num">2</span>: <span class="num">0</span>, <span class="num">3</span>: <span class="num">0</span> },
  };
  #history = [];
  #WINDOW  = <span class="num">30</span>;

  <span class="fn">observe</span>(choice) {
    <span class="kw">this</span>.#freq[choice]++;
    <span class="kw">if</span> (<span class="kw">this</span>.#history.length > <span class="num">0</span>)
      <span class="kw">this</span>.#markov[<span class="kw">this</span>.#history.<span class="fn">at</span>(-<span class="num">1</span>)][choice]++;
    <span class="kw">this</span>.#history.<span class="fn">push</span>(choice);
    <span class="kw">if</span> (<span class="kw">this</span>.#history.length > <span class="kw">this</span>.#WINDOW)
      <span class="kw">this</span>.#history.<span class="fn">shift</span>();
  }

  <span class="fn">predict</span>(smart = <span class="kw">true</span>) {
    <span class="kw">if</span> (!smart || <span class="kw">this</span>.#history.length < <span class="num">2</span>)
      <span class="kw">return</span> <span class="kw">this</span>.#rand();

    <span class="cmt">// 1. 3-gram pattern detection</span>
    <span class="kw">if</span> (<span class="kw">this</span>.#history.length >= <span class="num">3</span>) {
      <span class="kw">const</span> pred = <span class="kw">this</span>.#patternPredict(...);
      <span class="kw">if</span> (pred) <span class="kw">return</span> <span class="cls">Math</span>.<span class="fn">random</span>() < <span class="num">0.8</span>
        ? <span class="kw">this</span>.#counter(pred) : <span class="kw">this</span>.#rand();
    }

    <span class="cmt">// 2. Markov chain transition</span>
    <span class="kw">const</span> mpred = <span class="kw">this</span>.#mostLikely(
      <span class="kw">this</span>.#markov[<span class="kw">this</span>.#history.<span class="fn">at</span>(-<span class="num">1</span>)]
    );
    <span class="kw">if</span> (mpred) <span class="kw">return</span> <span class="cls">Math</span>.<span class="fn">random</span>() < <span class="num">0.7</span>
      ? <span class="kw">this</span>.#counter(mpred) : <span class="kw">this</span>.#rand();

    <span class="cmt">// 3. Frequency fallback</span>
    <span class="kw">const</span> fpred = <span class="kw">this</span>.#mostLikely(<span class="kw">this</span>.#freq);
    <span class="kw">return</span> <span class="cls">Math</span>.<span class="fn">random</span>() < <span class="num">0.6</span>
      ? <span class="kw">this</span>.#counter(fpred) : <span class="kw">this</span>.#rand();
  }
}`
  },
  py: {
    file: 'markov_ai.py',
    code: `<span class="cmt"># ╔═══════════════════════════════════════╗
# ║  Markov AI — Python                   ║
# ║  Copyright © 2025 KhiemHuy           ║
# ╚═══════════════════════════════════════╝</span>

<span class="kw">from</span> <span class="cls">enum</span> <span class="kw">import</span> IntEnum
<span class="kw">from</span> <span class="cls">collections</span> <span class="kw">import</span> defaultdict, deque
<span class="kw">import</span> random


<span class="kw">class</span> <span class="cls">Choice</span>(IntEnum):
    KEO = <span class="num">1</span>
    BUA = <span class="num">2</span>
    BAO = <span class="num">3</span>


<span class="kw">class</span> <span class="cls">MarkovAI</span>:
    WINDOW = <span class="num">30</span>

    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="kw">self</span>):
        <span class="kw">self</span>.freq    = defaultdict(<span class="kw">int</span>)
        <span class="kw">self</span>.markov  = {c: defaultdict(<span class="kw">int</span>) <span class="kw">for</span> c <span class="kw">in</span> <span class="cls">Choice</span>}
        <span class="kw">self</span>.history: deque[<span class="cls">Choice</span>] = deque(maxlen=<span class="kw">self</span>.WINDOW)

    <span class="kw">def</span> <span class="fn">observe</span>(<span class="kw">self</span>, c: <span class="cls">Choice</span>) -> <span class="kw">None</span>:
        <span class="kw">if</span> <span class="kw">self</span>.history:
            <span class="kw">self</span>.markov[<span class="kw">self</span>.history[-<span class="num">1</span>]][c] += <span class="num">1</span>
        <span class="kw">self</span>.freq[c] += <span class="num">1</span>
        <span class="kw">self</span>.history.<span class="fn">append</span>(c)

    <span class="kw">def</span> <span class="fn">predict</span>(<span class="kw">self</span>, smart: <span class="kw">bool</span> = <span class="kw">True</span>) -> <span class="cls">Choice</span>:
        <span class="kw">if</span> <span class="kw">not</span> smart <span class="kw">or</span> <span class="fn">len</span>(<span class="kw">self</span>.history) < <span class="num">2</span>:
            <span class="kw">return</span> random.<span class="fn">choice</span>(<span class="fn">list</span>(<span class="cls">Choice</span>))

        <span class="cmt"># 1. 3-gram → 2. Markov → 3. Frequency</span>
        ...

    <span class="kw">def</span> <span class="fn">_counter</span>(<span class="kw">self</span>, c: <span class="cls">Choice</span>) -> <span class="cls">Choice</span>:
        <span class="kw">return</span> {
            <span class="cls">Choice</span>.KEO: <span class="cls">Choice</span>.BUA,
            <span class="cls">Choice</span>.BUA: <span class="cls">Choice</span>.BAO,
            <span class="cls">Choice</span>.BAO: <span class="cls">Choice</span>.KEO
        }[c]`
  },
  java: {
    file: 'MarkovAI.java',
    code: `<span class="cmt">// ╔═══════════════════════════════════════╗
// ║  Markov AI — Java                     ║
// ║  Copyright © 2025 KhiemHuy           ║
// ╚═══════════════════════════════════════╝</span>

<span class="kw">package</span> khiemhuy.arcade;

<span class="kw">import</span> java.util.*;

<span class="kw">public class</span> <span class="cls">MarkovAI</span> {
    <span class="kw">private static final int</span> WINDOW = <span class="num">30</span>;
    <span class="kw">private final</span> <span class="cls">Map</span>&lt;<span class="cls">Choice</span>, <span class="cls">Integer</span>&gt; freq;
    <span class="kw">private final</span> <span class="cls">Map</span>&lt;<span class="cls">Choice</span>, <span class="cls">Map</span>&lt;<span class="cls">Choice</span>, <span class="cls">Integer</span>&gt;&gt; markov;
    <span class="kw">private final</span> <span class="cls">Deque</span>&lt;<span class="cls">Choice</span>&gt; history = <span class="kw">new</span> <span class="cls">ArrayDeque</span>&lt;&gt;();
    <span class="kw">private final</span> <span class="cls">Random</span> rng = <span class="kw">new</span> <span class="cls">Random</span>();

    <span class="kw">public void</span> <span class="fn">observe</span>(<span class="cls">Choice</span> c) {
        freq.<span class="fn">merge</span>(c, <span class="num">1</span>, <span class="cls">Integer</span>::sum);
        <span class="kw">if</span> (!history.<span class="fn">isEmpty</span>())
            markov.<span class="fn">get</span>(history.<span class="fn">peekLast</span>())
                .<span class="fn">merge</span>(c, <span class="num">1</span>, <span class="cls">Integer</span>::sum);
        history.<span class="fn">addLast</span>(c);
        <span class="kw">if</span> (history.<span class="fn">size</span>() > WINDOW)
            history.<span class="fn">pollFirst</span>();
    }

    <span class="kw">public</span> <span class="cls">Choice</span> <span class="fn">predict</span>(<span class="kw">boolean</span> smart) {
        <span class="cls">Choice</span>[] all = <span class="cls">Choice</span>.<span class="fn">values</span>();
        <span class="kw">if</span> (!smart || history.<span class="fn">size</span>() < <span class="num">2</span>)
            <span class="kw">return</span> all[rng.<span class="fn">nextInt</span>(all.length)];

        <span class="cmt">// 1. Pattern → 2. Markov → 3. Frequency</span>
        ...
    }

    <span class="kw">private</span> <span class="cls">Choice</span> <span class="fn">counter</span>(<span class="cls">Choice</span> c) {
        <span class="kw">return switch</span> (c) {
            <span class="kw">case</span> KEO -> <span class="cls">Choice</span>.BUA;
            <span class="kw">case</span> BUA -> <span class="cls">Choice</span>.BAO;
            <span class="kw">case</span> BAO -> <span class="cls">Choice</span>.KEO;
        };
    }
}`
  }
};

let currentLang = 'cs';

function initCode() { showCode('cs'); }

function showCode(lang) {
  currentLang = lang;
  document.querySelectorAll('#page-code .algo-tab').forEach((t, i) => {
    t.classList.toggle('active', ['cs', 'js', 'py', 'java'][i] === lang);
  });
  const s = CODE_SAMPLES[lang];
  if (!s) return;
  document.getElementById('codeFileName').textContent = s.file;
  document.getElementById('codeDisplay').innerHTML = s.code;
}

function copyCode() {
  const txt = document.getElementById('codeDisplay').textContent;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.querySelector('#page-code .ctrl-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Đã copy!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}
