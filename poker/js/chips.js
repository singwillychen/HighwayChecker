/* 籌碼：配色參考拉斯維加斯／澳門等知名賭場的標準面額色（白 1、紅 5、綠 25、黑 100、紫 500、
 * 黃 1K、橘 5K、粉藍 25K、金 100K），加上卡通粗邊與邊緣色塊（edge spots）修飾。
 * 籌碼堆依資產自動拆成多疊，越有錢堆越高、越多疊，並換上高面額。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const O = '#1a1a1a';

  const DENOMS = [
    { v: 100000, c: '#e8c547', e: '#7a5c00', t: '100K' },
    { v: 25000, c: '#74c0fc', e: '#1864ab', t: '25K' },
    { v: 5000, c: '#ff922b', e: '#7a3300', t: '5K' },
    { v: 1000, c: '#ffd43b', e: '#5c4a00', t: '1K' },
    { v: 500, c: '#9775fa', e: '#f8f9fa', t: '500' },
    { v: 100, c: '#25262b', e: '#ffd43b', t: '100' },
    { v: 25, c: '#2f9e44', e: '#f8f9fa', t: '25' },
    { v: 5, c: '#e03131', e: '#f8f9fa', t: '5' },
    { v: 1, c: '#f8f9fa', e: '#1971c2', t: '1' },
  ];

  // 單枚籌碼正面（SVG）
  function chipFace(d, size = 40) {
    let spots = '';
    for (let i = 0; i < 8; i++) spots += `<rect x="-4" y="-19" width="8" height="7" fill="${d.e}" transform="rotate(${i * 45})"/>`;
    return `<svg viewBox="-20 -20 40 40" width="${size}" height="${size}" class="chip-face"><circle r="19" fill="${d.c}" stroke="${O}" stroke-width="1.6"/>${spots}` +
      `<circle r="12.5" fill="${d.c}" stroke="${d.e}" stroke-width="1.6" stroke-dasharray="2 2"/>` +
      `<text y="${d.t.length > 3 ? 3 : 3.5}" font-size="${d.t.length > 3 ? 7 : 9}" text-anchor="middle" font-weight="900" fill="${d.e}" font-family="Bungee, Arial Black, sans-serif">${d.t}</text></svg>`;
  }

  // 把金額拆成面額：像真實賭場一樣混搭面額（每層只放約 70%，其餘往小面額找），
  // 最小面額依盲注而定。資產越多 → 籌碼越多、面額越大，畫面上一眼就看得出貧富。
  function breakdown(amount, opts = {}) {
    const maxChips = opts.max || 60;
    const bb = opts.bb || 0;
    let rem = Math.max(0, Math.floor(amount));
    const lo = DENOMS.slice().reverse().filter((d) => d.v <= Math.max(1, bb / 4)).pop() || DENOMS[DENOMS.length - 1];
    const usable = DENOMS.filter((d) => d.v >= lo.v);
    const out = [];
    usable.forEach((d, i) => {
      const last = i === usable.length - 1;
      const n = last ? Math.floor(rem / d.v) : Math.floor((rem * 0.7) / d.v);
      if (n > 0) { out.push({ d, n }); rem -= n * d.v; }
    });
    if (!out.length && amount > 0) out.push({ d: DENOMS[DENOMS.length - 1], n: Math.min(maxChips, Math.ceil(amount)) });
    let total = out.reduce((s, x) => s + x.n, 0);
    while (total > maxChips) {
      const big = out.reduce((a, b) => (a.n > b.n ? a : b));
      const cut = Math.min(big.n - 1, total - maxChips);
      if (cut <= 0) break;
      big.n -= cut; total -= cut;
    }
    return out;
  }

  // 籌碼堆 HTML：每種面額一疊，每疊最多 perCol 枚，溢出另起一疊
  function stackHTML(amount, opts = {}) {
    const perCol = opts.perCol || 14;
    const scale = opts.scale || 1;
    const parts = breakdown(amount, opts);
    const cols = [];
    for (const { d, n } of parts) {
      for (let left = n; left > 0; left -= perCol) cols.push({ d, n: Math.min(perCol, left) });
    }
    if (!cols.length) return '';
    let html = `<div class="chip-stack" style="--s:${scale}">`;
    cols.slice(0, opts.maxCols || 8).forEach((col, ci) => {
      html += `<div class="chip-col" style="z-index:${20 - ci}">`;
      for (let i = 0; i < col.n; i++) html += `<i class="chip-side" style="--c:${col.d.c};--e:${col.d.e};bottom:${i * 5}px"></i>`;
      html += `<i class="chip-top" style="bottom:${col.n * 5}px">${chipFace(col.d, 36)}</i></div>`;
    });
    return html + '</div>';
  }

  function fmt(n) {
    n = Math.round(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e5) return Math.round(n / 1000) + 'K';
    return n.toLocaleString('en-US');
  }

  HP.Chips = { DENOMS, chipFace, breakdown, stackHTML, fmt };
})(typeof window !== 'undefined' ? window : globalThis);
