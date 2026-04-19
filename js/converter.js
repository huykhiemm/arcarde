/* ═══════════════════════════════════════════════════════
   converter.js — Language Converter (Beta)
   KhiemHuy Dev Arcade v3.0
   ═══════════════════════════════════════════════════════ */

const SAMPLE_CODE = `public RoundResult GetResult(Choice p1, Choice p2)
{
    if (p1 == p2)
        return new RoundResult(Outcome.Draw, "Hòa — cùng lựa chọn.");

    if (_wins.TryGetValue((p1, p2), out var win))
        return win;

    if (_wins.TryGetValue((p2, p1), out var opp))
        return new RoundResult(Outcome.Lose, opp.Reason);

    throw new ArgumentException($"Invalid pair: {p1}, {p2}");
}`;

function loadSampleCode() {
  document.getElementById('convInput').value = SAMPLE_CODE;
}

function copyConvOutput() {
  const txt = document.getElementById('convOutput').value;
  if (!txt) return;
  navigator.clipboard.writeText(txt);
  document.getElementById('convStatus').textContent = '✓ Đã copy!';
  setTimeout(() => document.getElementById('convStatus').textContent = '', 2000);
}

async function runConvert() {
  const code = document.getElementById('convInput').value.trim();
  if (!code) {
    document.getElementById('convStatus').textContent = '⚠ Vui lòng nhập code';
    return;
  }
  const fromLang = document.getElementById('fromLang').value;
  const toLang = document.getElementById('toLang').value;
  if (fromLang === toLang) {
    document.getElementById('convStatus').textContent = '⚠ Ngôn ngữ nguồn và đích giống nhau';
    return;
  }
  const langNames = { csharp: 'C#', javascript: 'JavaScript', python: 'Python', java: 'Java' };
  document.getElementById('convOutput').value = '// Đang chuyển đổi...';
  document.getElementById('convStatus').textContent = '⟳ Đang xử lý...';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Convert this ${langNames[fromLang]} code to ${langNames[toLang]}. Return ONLY the converted code, no explanation, no markdown fences.\n\n${code}`
        }]
      })
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('convOutput').value = `// Lỗi: ${data.error.message}`;
      document.getElementById('convStatus').textContent = '✗ Lỗi API';
      return;
    }
    const result = data.content.map(i => i.text || '').join('').replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    document.getElementById('convOutput').value = result;
    document.getElementById('convStatus').textContent = `✓ Chuyển đổi xong — ${langNames[fromLang]} → ${langNames[toLang]}`;
  } catch (e) {
    document.getElementById('convOutput').value = `// Không thể kết nối API.\n// Đây là bản demo — tính năng AI convert cần API key.\n\n// Converted ${langNames[fromLang]} → ${langNames[toLang]}:\n// [Code would appear here]`;
    document.getElementById('convStatus').textContent = '⚠ Chế độ demo (chưa có API key)';
  }
}
