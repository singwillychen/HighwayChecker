/* 擬真動態背景（Canvas 2D 即時繪製，不需任何圖檔）
 * 每個場景分兩層：
 *   bake(ctx, rng, st)  只畫一次的靜態底圖（漸層光影、材質、景深模糊）
 *   anim(ctx, t, st)    每一格疊上的動態元素（光束、粒子、雲、雨、霓虹、水波…）
 * 畫質：low＝只畫一張靜態圖；mid＝75% 解析度 30fps；high＝全解析度 60fps＋底片顆粒
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const W = 1280, H = 720;
  let quality = 'high';
  const mounts = new Set();
  const cache = new Map();
  const canFilter = (() => { try { const c = document.createElement('canvas').getContext('2d'); return 'filter' in c; } catch (e) { return false; } })();

  // ───────── 工具 ─────────
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function R(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hexA(hex, a) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function lg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
  function rg(ctx, x, y, r, stops, r0 = 0) { const g = ctx.createRadialGradient(x, y, r0, x, y, r); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
  function blur(ctx, px, fn) { ctx.save(); if (canFilter && px > 0) ctx.filter = `blur(${px * (ctx._k || 1)}px)`; fn(); ctx.restore(); }
  function glow(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg(ctx, x, y, r, [[0, hexA(color, a)], [0.35, hexA(color, a * 0.35)], [1, hexA(color, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function ridge(ctx, rng, y, amp, rough, fill, x0 = -20, x1 = W + 20) {
    const n = 128, pts = new Array(n + 1).fill(0);
    pts[0] = (rng() - 0.5) * amp; pts[n] = (rng() - 0.5) * amp;
    for (let step = n; step > 1; step /= 2) {
      for (let i = step / 2; i < n; i += step) pts[i] = (pts[i - step / 2] + pts[i + step / 2]) / 2 + (rng() - 0.5) * amp * (step / n) * rough * 2;
    }
    ctx.beginPath(); ctx.moveTo(x0, H);
    for (let i = 0; i <= n; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / n, y - Math.abs(pts[i]));
    ctx.lineTo(x1, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  // 柔軟積雲：先畫在小畫布上當作 sprite，可重複使用
  function cloudSprite(w, h, rng, light = '#ffffff', shadow = '#b8c4d6', k = 1) {
    const c = mk(w * k, h * k), x = c.getContext('2d'); x.scale(k, k);
    for (let i = 0; i < 22; i++) {
      const bx = w * (0.15 + rng() * 0.7), by = h * (0.35 + rng() * 0.4), br = h * (0.18 + rng() * 0.28);
      x.fillStyle = rg(x, bx, by, br, [[0, hexA(light, 0.95)], [0.6, hexA(light, 0.6)], [1, hexA(light, 0)]]);
      x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
    }
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = lg(x, 0, h * 0.3, 0, h, [[0, 'rgba(255,255,255,0)'], [0.6, hexA(shadow, 0.35)], [1, hexA(shadow, 0.8)]]);
    x.fillRect(0, 0, w, h);
    return c;
  }
  function grainCanvas() {
    const c = mk(192, 192), x = c.getContext('2d'), d = x.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  }
  const GRAIN = typeof document !== 'undefined' ? grainCanvas() : null;
  function vignette(ctx, a = 0.5, cx = W / 2, cy = H / 2) {
    ctx.fillStyle = rg(ctx, cx, cy, 900, [[0.35, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]);
    ctx.fillRect(0, 0, W, H);
  }
  // 透視地板（木條／磁磚），vp = 消失點
  function perspFloor(ctx, rng, y0, vp, n, colors, grain = true) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H - y0); ctx.clip();
    const span = 4200;
    for (let i = 0; i < n; i++) {
      const xa = -span / 2 + W / 2 + (span * i) / n, xb = -span / 2 + W / 2 + (span * (i + 1)) / n;
      ctx.beginPath(); ctx.moveTo(vp.x, vp.y); ctx.lineTo(xa, H + 400); ctx.lineTo(xb, H + 400); ctx.closePath();
      ctx.fillStyle = colors[(rng() * colors.length) | 0]; ctx.fill();
      ctx.strokeStyle = 'rgba(40,20,5,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (grain) {
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 260; i++) {
        const xb = rng() * span - span / 2 + W / 2, t0 = 0.35 + rng() * 0.4;
        ctx.beginPath(); ctx.moveTo(vp.x + (xb - vp.x) * t0, vp.y + (H + 400 - vp.y) * t0);
        const t1 = t0 + 0.05 + rng() * 0.15; ctx.lineTo(vp.x + (xb - vp.x) * t1, vp.y + (H + 400 - vp.y) * t1);
        ctx.strokeStyle = rng() < 0.5 ? '#3b1f0a' : '#fff1d6'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // 橫向接縫
    for (let k = 1; k < 14; k++) {
      const y = y0 + (H - y0) * Math.pow(k / 14, 1.6);
      if (rng() < 0.6) { ctx.fillStyle = 'rgba(30,15,5,.12)'; ctx.fillRect(0, y, W, 1); }
    }
    ctx.restore();
  }
  function bricks(ctx, rng, x0, y0, w, h, bw, bh, base, mortar, vary = 26) {
    ctx.fillStyle = mortar; ctx.fillRect(x0, y0, w, h);
    const [r, g, b] = [parseInt(base.slice(1, 3), 16), parseInt(base.slice(3, 5), 16), parseInt(base.slice(5, 7), 16)];
    for (let y = y0, row = 0; y < y0 + h; y += bh, row++) {
      for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x0 + w; x += bw) {
        const d = (rng() - 0.5) * vary;
        ctx.fillStyle = `rgb(${Math.max(0, r + d)},${Math.max(0, g + d * 0.6)},${Math.max(0, b + d * 0.5)})`;
        ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 1.5, y + 1.5, bw - 3, 2);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 1.5, y + bh - 3.5, bw - 3, 2);
      }
    }
  }
  function flag(ctx, x, y, w, h, t, drawFace) {
    // 以垂直切片模擬布料飄動
    const slices = 24, c = flag._c || (flag._c = mk(200, 140));
    const fx = c.getContext('2d'); fx.clearRect(0, 0, 200, 140); drawFace(fx, 200, 140);
    for (let i = 0; i < slices; i++) {
      const u = i / slices, sw = w / slices;
      const off = Math.sin(t * 2.2 - u * 6) * 6 * u, shade = Math.cos(t * 2.2 - u * 6) * 0.18 * u;
      ctx.drawImage(c, (200 * i) / slices, 0, 200 / slices + 0.5, 140, x + u * w, y + off, sw + 0.6, h);
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
      ctx.fillRect(x + u * w, y + off, sw + 0.6, h);
    }
  }
  function particles(st, n, rng, f) { st.p = st.p || Array.from({ length: n }, () => f(rng)); return st.p; }

  // ═════════════ 場景 ═════════════
  const S = {};

  // 1 日式極簡自然教室
  S.kinder = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, 0, 420, [[0, '#f4efe6'], [1, '#e3d8c6']]); ctx.fillRect(0, 0, W, 420);
      // 窗外景（景深模糊）
      const win = { x: 150, y: 46, w: 980, h: 330 }; st.win = win;
      ctx.save(); ctx.beginPath(); ctx.rect(win.x, win.y, win.w, win.h); ctx.clip();
      ctx.fillStyle = lg(ctx, 0, win.y, 0, win.y + win.h, [[0, '#7db7ea'], [0.6, '#cfe6f7'], [1, '#eef6ee']]); ctx.fillRect(win.x, win.y, win.w, win.h);
      glow(ctx, 1010, 70, 260, '#fff6d8', 0.9);
      blur(ctx, 1.2, () => {
        ctx.beginPath(); ctx.moveTo(470, 300); ctx.quadraticCurveTo(600, 150, 640, 126); ctx.quadraticCurveTo(680, 150, 820, 300); ctx.closePath();
        ctx.fillStyle = lg(ctx, 0, 126, 0, 300, [[0, '#8fa6c4'], [1, '#b9c9d9']]); ctx.fill();
        ctx.beginPath(); ctx.moveTo(596, 168); ctx.quadraticCurveTo(620, 140, 640, 126); ctx.quadraticCurveTo(660, 140, 686, 170); ctx.lineTo(668, 162); ctx.lineTo(652, 176); ctx.lineTo(636, 160); ctx.lineTo(618, 178); ctx.closePath();
        ctx.fillStyle = '#f7fbff'; ctx.fill();
      });
      blur(ctx, 1.6, () => { ridge(ctx, rng, 290, 60, 0.7, '#9ab9a0'); });
      blur(ctx, 2, () => { ridge(ctx, rng, 320, 70, 0.8, '#6f9f6c'); });
      blur(ctx, 2.6, () => { ridge(ctx, rng, 350, 50, 0.9, '#4f8550'); });
      // 前景樹冠散景
      blur(ctx, 6, () => {
        for (let i = 0; i < 26; i++) { const x = win.x + rng() * win.w, y = 300 + rng() * 80, r = 30 + rng() * 50; ctx.fillStyle = `rgba(${40 + rng() * 30},${100 + rng() * 50},${40 + rng() * 20},.9)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      });
      ctx.restore();
      // 玻璃反光
      ctx.save(); ctx.beginPath(); ctx.rect(win.x, win.y, win.w, win.h); ctx.clip(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = lg(ctx, win.x, win.y, win.x + 400, win.y + 330, [[0, 'rgba(255,255,255,.18)'], [0.5, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,.08)'], [0.6, 'rgba(255,255,255,0)']]);
      ctx.fillRect(win.x, win.y, win.w, win.h); ctx.restore();
      // 原木窗框
      const wood = (x, y, w, h, v) => { ctx.fillStyle = lg(ctx, v ? x : 0, v ? 0 : y, v ? x + w : 0, v ? 0 : y + h, [[0, '#d7b98e'], [0.5, '#c4a072'], [1, '#a5814f']]); ctx.fillRect(x, y, w, h); };
      wood(win.x - 14, win.y - 14, win.w + 28, 14); wood(win.x - 14, win.y + win.h, win.w + 28, 22);
      wood(win.x - 14, win.y - 14, 14, win.h + 28, true); wood(win.x + win.w, win.y - 14, 14, win.h + 28, true);
      for (const fx of [win.x + win.w / 4, win.x + win.w / 2, win.x + (win.w * 3) / 4]) wood(fx - 4, win.y, 8, win.h, true);
      wood(win.x, win.y + 120, win.w, 6);
      ctx.fillStyle = 'rgba(60,40,15,.25)'; ctx.fillRect(win.x - 14, win.y + win.h + 22, win.w + 28, 6);
      // 牆腳與地板
      ctx.fillStyle = lg(ctx, 0, 398, 0, 414, [[0, '#b99a70'], [1, '#8f7148']]); ctx.fillRect(0, 398, W, 16);
      perspFloor(ctx, rng, 414, { x: 640, y: 160 }, 46, ['#d9b886', '#d2ae7b', '#dcbd8e', '#cfa874', '#d6b383']);
      ctx.fillStyle = lg(ctx, 0, 414, 0, 470, [[0, 'rgba(70,40,10,.3)'], [1, 'rgba(70,40,10,0)']]); ctx.fillRect(0, 414, W, 56);
      // 地板反射窗光
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; blur(ctx, 18, () => { ctx.fillStyle = 'rgba(255,255,240,.9)'; ctx.beginPath(); ctx.moveTo(260, 430); ctx.lineTo(1020, 430); ctx.lineTo(1180, 720); ctx.lineTo(100, 720); ctx.fill(); }); ctx.restore();
      // 盆栽（左）
      ctx.fillStyle = lg(ctx, 30, 0, 110, 0, [[0, '#cfc6b8'], [0.5, '#f1ece4'], [1, '#bdb3a3']]); ctx.beginPath(); ctx.moveTo(34, 330); ctx.lineTo(112, 330); ctx.lineTo(104, 410); ctx.lineTo(42, 410); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (rng() - 0.5) * 2.2, len = 70 + rng() * 70;
        const ex = 73 + Math.cos(a) * len, ey = 330 + Math.sin(a) * len;
        ctx.strokeStyle = '#3f6b2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(73, 332); ctx.quadraticCurveTo(73 + Math.cos(a) * len * 0.4, 300, ex, ey); ctx.stroke();
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = lg(ctx, -26, 0, 26, 0, [[0, '#2f6b2a'], [0.5, '#4f9a3c'], [1, '#2a5e25']]);
        ctx.beginPath(); ctx.ellipse(0, -18, 22, 30, 0, 0, 7); ctx.fill(); ctx.restore();
      }
      // 書包櫃（右）
      ctx.fillStyle = lg(ctx, 1150, 0, 1280, 0, [[0, '#c9a578'], [1, '#a98455']]); ctx.fillRect(1150, 300, 130, 110);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#7d5f38'; ctx.fillRect(1156 + i * 42, 306, 36, 98); ctx.fillStyle = ['#d64545', '#3a6fd1', '#e0a52e'][i]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(1160 + i * 42, 330, 28, 34, 6) : ctx.rect(1160 + i * 42, 330, 28, 34); ctx.fill(); }
      vignette(ctx, 0.28);
      st.cl = [cloudSprite(220, 80, rng, '#ffffff', '#c3d3e6'), cloudSprite(160, 60, rng, '#ffffff', '#c3d3e6')];
    },
    anim(ctx, t, st) {
      const win = st.win;
      ctx.save(); ctx.beginPath();
      for (let i = 0; i < 4; i++) ctx.rect(win.x + (win.w / 4) * i + 4, win.y, win.w / 4 - 8, 120);
      ctx.clip(); ctx.globalAlpha = 0.85;
      ctx.drawImage(st.cl[0], ((t * 9) % 1500) - 260 + win.x, win.y + 18);
      ctx.drawImage(st.cl[1], ((t * 6 + 700) % 1500) - 200 + win.x, win.y + 50);
      ctx.restore();
      // 陽光光束
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = 0.05 + 0.025 * Math.sin(t * 0.6 + i * 1.7);
        const x0 = 760 + i * 95;
        ctx.fillStyle = lg(ctx, x0, 60, x0 - 330, 640, [[0, `rgba(255,244,210,${a * 1.6})`], [1, 'rgba(255,244,210,0)']]);
        ctx.beginPath(); ctx.moveTo(x0, 60); ctx.lineTo(x0 + 60, 60); ctx.lineTo(x0 - 240, 640); ctx.lineTo(x0 - 380, 640); ctx.fill();
      }
      const ps = particles(st, 60, R(5), (r) => ({ x: 380 + r() * 700, y: 80 + r() * 500, s: 0.6 + r() * 1.6, v: 4 + r() * 8, ph: r() * 6 }));
      for (const p of ps) {
        const y = ((p.y - t * p.v) % 560 + 560) % 560 + 80, x = p.x + Math.sin(t * 0.5 + p.ph) * 14;
        ctx.fillStyle = `rgba(255,250,230,${0.35 + 0.3 * Math.sin(t + p.ph)})`; ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
      }
      ctx.restore();
      // 紗簾輕擺
      for (const side of [0, 1]) {
        const bx = side ? win.x + win.w - 70 : win.x;
        for (let i = 0; i < 7; i++) {
          const sway = Math.sin(t * 0.8 + i * 0.7 + side) * 5;
          ctx.fillStyle = `rgba(255,255,255,${0.16 + (i % 2) * 0.08})`;
          ctx.beginPath(); ctx.moveTo(bx + i * 10, win.y); ctx.lineTo(bx + i * 10 + 10, win.y); ctx.quadraticCurveTo(bx + i * 10 + 10 + sway, win.y + 200, bx + i * 10 + 10 + sway * 2, win.y + win.h + 20); ctx.lineTo(bx + i * 10 + sway * 2, win.y + win.h + 20); ctx.fill();
        }
      }
    },
  };

  // 2 總統府：紅磚、白色石材腰帶、拱窗、水晶燈、拋光地板
  S.presidential = {
    bake(ctx, rng, st) {
      bricks(ctx, rng, 0, 0, W, 440, 44, 15, '#9b3a28', '#cdbfa7', 30);
      ctx.fillStyle = lg(ctx, 0, 0, 0, 440, [[0, 'rgba(20,5,0,.45)'], [0.5, 'rgba(20,5,0,.05)'], [1, 'rgba(20,5,0,.35)']]); ctx.fillRect(0, 0, W, 440);
      const stone = (y, h) => { ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, '#f6efe1'], [0.5, '#e4d7bf'], [1, '#bfae8f']]); ctx.fillRect(0, y, W, h); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, y + h, W, 5); };
      stone(118, 18); stone(422, 20);
      // 拱窗：黃昏天空＋城市燈光散景
      const arch = (x, w, top, bot) => {
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, bot); ctx.lineTo(x, top + w / 2); ctx.arc(x + w / 2, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, bot); ctx.closePath(); ctx.clip();
        ctx.fillStyle = lg(ctx, 0, top, 0, bot, [[0, '#1c2a5a'], [0.6, '#6b5a8e'], [1, '#e79a6a']]); ctx.fillRect(x, top, w, bot - top);
        blur(ctx, 3, () => { for (let i = 0; i < 18; i++) { ctx.fillStyle = hexA(['#ffd27a', '#ffe9b0', '#ff9f68'][i % 3], 0.8); ctx.beginPath(); ctx.arc(x + rng() * w, bot - 10 - rng() * 60, 2 + rng() * 4, 0, 7); ctx.fill(); } });
        ctx.restore();
        ctx.strokeStyle = '#efe5d2'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, bot); ctx.lineTo(x, top + w / 2); ctx.arc(x + w / 2, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, bot); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,40,20,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w / 2, top + 6); ctx.lineTo(x + w / 2, bot); ctx.moveTo(x, top + w * 0.9); ctx.lineTo(x + w, top + w * 0.9); ctx.stroke();
      };
      for (const x of [40, 220, 960, 1140]) arch(x, 110, 170, 410);
      // 中央走廊大門（暖光）
      ctx.save(); ctx.beginPath(); ctx.moveTo(520, 420); ctx.lineTo(520, 230); ctx.arc(640, 230, 120, Math.PI, 0); ctx.lineTo(760, 420); ctx.closePath(); ctx.clip();
      ctx.fillStyle = rg(ctx, 640, 330, 220, [[0, '#ffe7b0'], [0.5, '#c98a4a'], [1, '#5a2e14']]); ctx.fillRect(500, 100, 280, 330);
      for (let i = 1; i < 6; i++) { const s = 1 - i * 0.15; ctx.strokeStyle = `rgba(255,230,180,${0.25})`; ctx.lineWidth = 2; ctx.strokeRect(640 - 110 * s, 420 - 300 * s, 220 * s, 300 * s); }
      ctx.restore();
      ctx.strokeStyle = '#efe5d2'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(520, 420); ctx.lineTo(520, 230); ctx.arc(640, 230, 120, Math.PI, 0); ctx.lineTo(760, 420); ctx.stroke();
      // 白色壁柱
      for (const x of [180, 360, 880, 1080]) { ctx.fillStyle = lg(ctx, x, 0, x + 34, 0, [[0, '#cbbd9f'], [0.4, '#fbf6ea'], [1, '#b3a382']]); ctx.fillRect(x, 136, 34, 286); }
      // 拋光地板 + 倒影
      const refl = mk(W, 440); refl.getContext('2d').drawImage(ctx.canvas, 0, 0, ctx.canvas.width, 440 * ctx._k, 0, 0, W, 440);
      ctx.fillStyle = lg(ctx, 0, 442, 0, H, [[0, '#3a2318'], [1, '#1a0e09']]); ctx.fillRect(0, 442, W, H - 442);
      ctx.save(); ctx.globalAlpha = 0.28; ctx.translate(0, 884); ctx.scale(1, -0.75); blur(ctx, 4, () => ctx.drawImage(refl, 0, 0)); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 442, W, H); ctx.clip();
      for (let k = 0; k < 12; k++) { const y = 442 + Math.pow(k / 12, 1.7) * 300; ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, y, W, 1.2); }
      ctx.restore();
      // 紅地毯
      ctx.beginPath(); ctx.moveTo(560, 442); ctx.lineTo(720, 442); ctx.lineTo(960, H); ctx.lineTo(320, H); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 442, 0, H, [[0, '#7d0f17'], [1, '#b3121f']]); ctx.fill();
      ctx.strokeStyle = '#d4a93c'; ctx.lineWidth = 5; ctx.stroke();
      vignette(ctx, 0.5);
    },
    anim(ctx, t, st) {
      for (const [x, ph] of [[300, 0], [980, 2]]) {
        ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 40); ctx.stroke();
        ctx.fillStyle = lg(ctx, x - 50, 0, x + 50, 0, [[0, '#a7802f'], [0.5, '#f2d27a'], [1, '#a7802f']]); ctx.beginPath(); ctx.ellipse(x, 48, 52, 10, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 9; i++) { const dx = -44 + i * 11; ctx.fillStyle = 'rgba(255,248,225,.9)'; ctx.beginPath(); ctx.moveTo(x + dx, 52); ctx.lineTo(x + dx + 4, 78 + (i % 2) * 8); ctx.lineTo(x + dx + 8, 52); ctx.fill(); }
        glow(ctx, x, 62, 150, '#ffd98a', 0.55 + 0.06 * Math.sin(t * 7 + ph) + 0.04 * Math.sin(t * 13 + ph));
        for (let i = 0; i < 5; i++) { const a = (Math.sin(t * 2 + i * 1.3 + ph) + 1) / 2; glow(ctx, x - 40 + i * 20, 70 + (i % 2) * 10, 10, '#ffffff', a * 0.9); }
      }
      const roc = (f, w, h) => { f.fillStyle = '#d0202a'; f.fillRect(0, 0, w, h); f.fillStyle = '#12257a'; f.fillRect(0, 0, w / 2, h / 2); f.fillStyle = '#fff'; f.beginPath(); f.arc(w / 4, h / 4, h * 0.11, 0, 7); f.fill(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; f.beginPath(); f.moveTo(w / 4 + Math.cos(a) * h * 0.2, h / 4 + Math.sin(a) * h * 0.2); f.lineTo(w / 4 + Math.cos(a + 0.2) * h * 0.1, h / 4 + Math.sin(a + 0.2) * h * 0.1); f.lineTo(w / 4 + Math.cos(a - 0.2) * h * 0.1, h / 4 + Math.sin(a - 0.2) * h * 0.1); f.fill(); } };
      for (const [x, ph] of [[430, 0], [800, 1.3]]) {
        ctx.fillStyle = lg(ctx, x - 3, 0, x + 3, 0, [[0, '#8a6a2a'], [0.5, '#f0cf73'], [1, '#8a6a2a']]); ctx.fillRect(x - 3, 180, 6, 250);
        ctx.fillStyle = '#f0cf73'; ctx.beginPath(); ctx.arc(x, 178, 7, 0, 7); ctx.fill();
        flag(ctx, x + 3, 190, 96, 64, t + ph, roc);
      }
    },
  };

  // 3 辦公室：景深模糊的開放式辦公室
  S.office = {
    bake(ctx, rng, st) {
      blur(ctx, 4.5, () => {
        ctx.fillStyle = lg(ctx, 0, 0, 0, 130, [[0, '#dfe3e6'], [1, '#c7cdd2']]); ctx.fillRect(0, 0, W, 130);
        for (let x = -40; x < W; x += 170) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 26, 120, 40); }
        ctx.fillStyle = lg(ctx, 0, 130, 0, 400, [[0, '#9cc6e8'], [1, '#e6f0f6']]); ctx.fillRect(0, 130, W, 270);
        for (let i = 0; i < 26; i++) { const x = i * 52 + rng() * 20, h = 80 + rng() * 180; ctx.fillStyle = `rgba(${90 + rng() * 40},${110 + rng() * 40},${140 + rng() * 40},.85)`; ctx.fillRect(x, 400 - h, 44, h); }
        for (let x = 0; x < W; x += 160) { ctx.fillStyle = '#7d868e'; ctx.fillRect(x, 130, 8, 270); }
        for (let i = 0; i < 8; i++) {
          const x = 40 + i * 160;
          ctx.fillStyle = '#e8e2d6'; ctx.fillRect(x - 20, 330, 150, 16);
          ctx.fillStyle = '#20252b'; ctx.fillRect(x + 10, 270, 80, 54);
          ctx.fillStyle = hexA(['#4dabf7', '#74c0fc', '#a5d8ff'][i % 3], 0.9); ctx.fillRect(x + 14, 274, 72, 44);
          ctx.fillStyle = '#3a3f45'; ctx.fillRect(x + 45, 324, 10, 8);
        }
        for (const x of [120, 760, 1180]) { ctx.fillStyle = '#5b4636'; ctx.fillRect(x, 340, 40, 50); ctx.fillStyle = '#3f8a46'; ctx.beginPath(); ctx.arc(x + 20, 320, 40, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#d6dadd'; ctx.fillRect(0, 380, W, 40);
      });
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, W, 420);
      // 地毯磁磚
      ctx.fillStyle = '#5f6b78'; ctx.fillRect(0, 418, W, H);
      perspFloor(ctx, rng, 418, { x: 640, y: 120 }, 30, ['#606c79', '#5a6572', '#66727f'], false);
      for (let i = 0; i < 6000; i++) { ctx.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.05)'; ctx.fillRect(rng() * W, 418 + rng() * 302, 1.5, 1.5); }
      ctx.fillStyle = lg(ctx, 0, 418, 0, 470, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 418, W, 52);
      vignette(ctx, 0.35);
      st.person = (() => { const c = mk(80, 200), x = c.getContext('2d'); x.filter = canFilter ? 'blur(5px)' : 'none'; x.fillStyle = 'rgba(40,48,60,.75)'; x.beginPath(); x.arc(40, 40, 18, 0, 7); x.fill(); x.fillRect(20, 60, 40, 90); x.fillRect(24, 150, 14, 46); x.fillRect(42, 150, 14, 46); return c; })();
    },
    anim(ctx, t, st) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) glow(ctx, 90 + i * 160, 296, 60, '#6fb6ff', 0.12 + 0.05 * Math.sin(t * 3 + i));
      for (let x = -40, i = 0; x < W; x += 170, i++) { const fl = i === 4 && Math.sin(t * 17) > 0.7 && (t % 9) < 1 ? 0.05 : 0.22; glow(ctx, x + 60, 46, 120, '#ffffff', fl); }
      ctx.restore();
      const cyc = t % 22;
      if (cyc < 10) { const x = -100 + cyc * 150; ctx.globalAlpha = 0.8; ctx.drawImage(st.person, x, 200 + Math.abs(Math.sin(t * 6)) * 3, 70, 175); ctx.globalAlpha = 1; }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sx = 200 + Math.sin(t * 0.05) * 200;
      ctx.fillStyle = lg(ctx, sx, 130, sx + 200, 420, [[0, 'rgba(255,250,230,.12)'], [1, 'rgba(255,250,230,0)']]);
      ctx.beginPath(); ctx.moveTo(sx, 130); ctx.lineTo(sx + 160, 130); ctx.lineTo(sx + 420, 420); ctx.lineTo(sx + 220, 420); ctx.fill(); ctx.restore();
    },
  };

  // 4 公路之旅：沙漠台地、公路、路邊賭場霓虹（stage 0 下午 / 1 夕陽 / 2 入夜）
  S.roadtrip = {
    bake(ctx, rng, st) {
      const k = st.stage % 3; st.k = k;
      const skies = [[[0, '#3f86d6'], [0.55, '#8ec3ec'], [1, '#f3d9b0']], [[0, '#25306b'], [0.45, '#b9567a'], [0.75, '#f39a4f'], [1, '#ffd98a']], [[0, '#050818'], [0.6, '#1b1b4a'], [1, '#6b3a6a']]];
      ctx.fillStyle = lg(ctx, 0, 0, 0, 380, skies[k]); ctx.fillRect(0, 0, W, 400);
      if (k === 2) { for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(255,255,255,${rng() * 0.8})`; ctx.fillRect(rng() * W, rng() * 300, 1.4, 1.4); } glow(ctx, 900, 380, 360, '#ff9fd1', 0.45); }
      const sun = [[1000, 120, 70], [860, 330, 90], null][k];
      if (sun) { glow(ctx, sun[0], sun[1], sun[2] * 5, '#fff2c4', 0.75); ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sun[0], sun[1], sun[2] * 0.42, 0, 7); ctx.fill(); }
      if (k < 2) blur(ctx, 3, () => { for (let i = 0; i < 7; i++) { ctx.fillStyle = k ? 'rgba(255,190,150,.35)' : 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(rng() * W, 60 + rng() * 160, 120 + rng() * 160, 8 + rng() * 10, 0, 0, 7); ctx.fill(); } });
      const far = ['#8c87b8', '#7a5a8a', '#2a1f40'][k], mid = ['#c46b3a', '#9b3f2a', '#1a1028'][k], near = ['#d89a5e', '#b0603a', '#22182c'][k];
      blur(ctx, 1.5, () => ridge(ctx, rng, 340, 40, 0.5, far));
      // 台地（平頂岩）
      const mesa = (x, w, h, top) => {
        ctx.beginPath(); ctx.moveTo(x, 390); ctx.lineTo(x + w * 0.12, top + 10); ctx.lineTo(x + w * 0.18, top); ctx.lineTo(x + w * 0.82, top); ctx.lineTo(x + w * 0.88, top + 10); ctx.lineTo(x + w, 390); ctx.closePath();
        ctx.fillStyle = lg(ctx, x, 0, x + w, 0, [[0, mid], [0.6, near], [1, mid]]); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 5; i++) ctx.fillRect(x + w * 0.15, top + 20 + i * 18, w * 0.7, 3);
      };
      mesa(60, 260, 140, 250); mesa(980, 300, 160, 230); mesa(420, 140, 90, 300);
      ctx.fillStyle = lg(ctx, 0, 380, 0, H, [[0, ['#d9a76c', '#b8724a', '#2c2030'][k]], [1, ['#a86b3c', '#6e3b25', '#120c18'][k]]]); ctx.fillRect(0, 380, W, H - 380);
      for (let i = 0; i < 3000; i++) { ctx.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,240,210,.06)'; ctx.fillRect(rng() * W, 380 + rng() * 340, 2, 2); }
      for (let i = 0; i < 40; i++) { const x = rng() * W, y = 395 + Math.pow(rng(), 1.5) * 300, s = 3 + (y - 390) / 25; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + s * 0.6, y + s * 0.5, s * 1.4, s * 0.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = ['#6b7a3a', '#5c5a2e', '#2a2a22'][k]; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); }
      // 公路
      ctx.beginPath(); ctx.moveTo(300, 386); ctx.lineTo(330, 386); ctx.lineTo(140, H); ctx.lineTo(-260, H); ctx.closePath(); ctx.fillStyle = ['#4a4a4f', '#3c3638', '#141218'][k]; ctx.fill();
      ctx.strokeStyle = 'rgba(240,240,230,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(330, 386); ctx.lineTo(140, H); ctx.stroke();
      st.road = { x0: 315, y0: 386, x1: -60, y1: H };
      // 電線桿
      for (let i = 0; i < 7; i++) { const s = Math.pow(1.45, i), x = 345 + 20 * s, y = 386 + 6 * s, h = 22 * s; ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, y - h, Math.max(1, s * 0.9), h); ctx.fillRect(x - s * 3, y - h + s * 2, s * 7, Math.max(1, s * 0.6)); }
      st.sign = ['GAS · CASINO', 'SALOON · POKER', 'DAM CASINO'][k];
      ctx.fillStyle = '#2b2b30'; ctx.fillRect(196, 210, 8, 180);
      ctx.fillStyle = lg(ctx, 0, 150, 0, 220, [[0, '#2c2c34'], [1, '#141418']]); ctx.fillRect(80, 150, 240, 66);
      ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 4; ctx.strokeRect(80, 150, 240, 66);
      vignette(ctx, 0.45);
    },
    anim(ctx, t, st) {
      const k = st.k;
      // 霓虹招牌
      const on = !(Math.sin(t * 11) > 0.92 && (t % 5) < 0.6);
      ctx.save(); ctx.font = '900 30px "Arial Black", sans-serif'; ctx.textAlign = 'center';
      if (on) { ctx.shadowColor = '#ff4f7a'; ctx.shadowBlur = 18; }
      ctx.fillStyle = on ? '#ff8fa6' : '#5a3040'; ctx.fillText(st.sign, 200, 194); ctx.restore();
      for (let i = 0; i < 12; i++) { const lit = Math.floor(t * 8) % 3 === i % 3; ctx.fillStyle = lit ? '#ffe28a' : '#6b5a30'; ctx.beginPath(); ctx.arc(88 + i * 20.5, 158, 3, 0, 7); ctx.fill(); if (lit) glow(ctx, 88 + i * 20.5, 158, 10, '#ffd36b', 0.6); }
      // 熱浪扭曲／車燈
      if (k < 2) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = lg(ctx, 0, 370, 0, 400, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,240,220,.6)'], [1, 'rgba(255,255,255,0)']]);
        for (let i = 0; i < 6; i++) ctx.fillRect(0, 374 + i * 4 + Math.sin(t * 3 + i) * 2, W, 2); ctx.restore();
        const ph = (t * 0.07) % 1; if (ph < 0.5) { const u = ph * 2, x = 1300 - u * 1500, y = 470 + Math.sin(u * 30) * 3; ctx.save(); ctx.translate(x, y); ctx.rotate(u * 40); ctx.strokeStyle = 'rgba(90,60,30,.7)'; ctx.lineWidth = 1.4; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(0, 0, 14, i, i + 2.5); ctx.stroke(); } ctx.restore(); }
      } else {
        const u = (t * 0.12) % 1, r = st.road;
        const x = r.x0 + (r.x1 - r.x0) * u * u, y = r.y0 + (r.y1 - r.y0) * u * u;
        glow(ctx, x, y, 8 + u * 60, '#fff6d0', 0.9); glow(ctx, x + 8 + u * 30, y, 8 + u * 60, '#fff6d0', 0.9);
      }
      if (k === 1) for (let i = 0; i < 3; i++) { const x = ((t * 30 + i * 140) % 1500) - 100, y = 120 + i * 18 + Math.sin(t * 2 + i) * 6; ctx.strokeStyle = 'rgba(30,20,30,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - Math.abs(Math.sin(t * 8 + i)) * 5); ctx.quadraticCurveTo(x - 3, y, x, y); ctx.quadraticCurveTo(x + 3, y, x + 8, y - Math.abs(Math.sin(t * 8 + i)) * 5); ctx.stroke(); }
    },
  };

  // 5 紐約地下酒吧
  S.speakeasy = {
    bake(ctx, rng, st) {
      bricks(ctx, rng, 0, 0, W, 450, 50, 18, '#5a2a1c', '#2a1610', 34);
      ctx.fillStyle = rg(ctx, 640, 260, 760, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.75)']]); ctx.fillRect(0, 0, W, 450);
      // 高窗：雨夜曼哈頓
      ctx.save(); ctx.beginPath(); ctx.rect(470, 34, 340, 140); ctx.clip();
      ctx.fillStyle = lg(ctx, 0, 34, 0, 174, [[0, '#0b1426'], [1, '#2a3550']]); ctx.fillRect(470, 34, 340, 140);
      blur(ctx, 2.5, () => {
        for (let i = 0; i < 16; i++) { const x = 470 + i * 22, h = 40 + rng() * 100; ctx.fillStyle = '#0a0f1a'; ctx.fillRect(x, 174 - h, 20, h); for (let j = 0; j < 12; j++) if (rng() < 0.35) { ctx.fillStyle = hexA(['#ffd27a', '#ffeebb', '#9fd0ff'][j % 3], 0.9); ctx.fillRect(x + 3 + (j % 3) * 5, 174 - h + 6 + Math.floor(j / 3) * 9, 3, 4); } }
        ctx.fillStyle = '#0a0f1a'; ctx.fillRect(626, 60, 14, 120); ctx.beginPath(); ctx.moveTo(626, 60); ctx.lineTo(633, 40); ctx.lineTo(640, 60); ctx.fill();
      });
      ctx.restore();
      st.win = { x: 470, y: 34, w: 340, h: 140 };
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 12; ctx.strokeRect(470, 34, 340, 140); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(640, 34); ctx.lineTo(640, 174); ctx.stroke();
      // 酒櫃與鏡面
      ctx.fillStyle = lg(ctx, 0, 190, 0, 450, [[0, '#2a170c'], [1, '#170c06']]); ctx.fillRect(30, 190, 400, 260);
      ctx.fillStyle = lg(ctx, 40, 200, 420, 440, [[0, 'rgba(160,140,120,.25)'], [0.5, 'rgba(60,50,40,.15)'], [1, 'rgba(160,140,120,.2)']]); ctx.fillRect(40, 200, 380, 240);
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = lg(ctx, 0, 270 + r * 70, 0, 282 + r * 70, [[0, '#8a5a32'], [1, '#4a2c14']]); ctx.fillRect(36, 270 + r * 70, 388, 12);
        for (let i = 0; i < 10; i++) {
          const bx = 50 + i * 37 + rng() * 6, bh = 36 + rng() * 22, by = 270 + r * 70 - bh, col = ['#2f6b3a', '#7a3a12', '#c98a2a', '#3a2a5a', '#a01818', '#d8c070'][(rng() * 6) | 0];
          ctx.fillStyle = lg(ctx, bx, 0, bx + 18, 0, [[0, hexA(col, 0.95)], [0.35, hexA('#ffffff', 0.55)], [0.5, hexA(col, 0.9)], [1, hexA('#000000', 0.8)]]);
          ctx.beginPath(); ctx.moveTo(bx, by + bh); ctx.lineTo(bx, by + bh * 0.4); ctx.quadraticCurveTo(bx, by + bh * 0.25, bx + 6, by + bh * 0.2); ctx.lineTo(bx + 6, by); ctx.lineTo(bx + 12, by); ctx.lineTo(bx + 12, by + bh * 0.2); ctx.quadraticCurveTo(bx + 18, by + bh * 0.25, bx + 18, by + bh * 0.4); ctx.lineTo(bx + 18, by + bh); ctx.fill();
          ctx.fillStyle = 'rgba(240,230,200,.8)'; ctx.fillRect(bx + 2, by + bh * 0.55, 14, bh * 0.22);
        }
      }
      // 吧台檯面
      ctx.fillStyle = lg(ctx, 0, 440, 0, 470, [[0, '#7a3e1a'], [0.3, '#c27a44'], [1, '#3a1a08']]); ctx.fillRect(0, 440, 470, 26);
      // 霓虹管（暗）
      st.neon = { x: 1040, y: 150 };
      ctx.fillStyle = lg(ctx, 0, 450, 0, H, [[0, '#1d110b'], [1, '#0a0604']]); ctx.fillRect(0, 450, W, H);
      perspFloor(ctx, rng, 470, { x: 640, y: 100 }, 40, ['#24150d', '#2b1a10', '#1f120a'], true);
      // 牆上老照片
      for (const [x, y] of [[880, 230], [960, 260], [1180, 220]]) { ctx.fillStyle = '#2a1a0c'; ctx.fillRect(x, y, 60, 76); ctx.fillStyle = lg(ctx, x, y, x + 60, y + 76, [[0, '#8b7a5c'], [1, '#4a3f2c']]); ctx.fillRect(x + 6, y + 6, 48, 64); }
      vignette(ctx, 0.6);
    },
    anim(ctx, t, st) {
      // 霓虹 JAZZ
      const flick = Math.sin(t * 23) > 0.95 || (t % 7 > 6.7 && Math.sin(t * 40) > 0);
      ctx.save(); ctx.font = '900 72px "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4;
      if (!flick) { ctx.shadowColor = '#ff3f8e'; ctx.shadowBlur = 30; }
      ctx.strokeStyle = flick ? '#5a2238' : '#ffb3d1'; ctx.strokeText('JAZZ', st.neon.x, st.neon.y);
      ctx.shadowColor = '#3fb6ff'; ctx.font = '900 26px "Arial Black", sans-serif'; ctx.fillStyle = '#bfe6ff'; ctx.fillText('♠ CLUB 1929 ♠', st.neon.x, st.neon.y + 44); ctx.restore();
      if (!flick) glow(ctx, st.neon.x, st.neon.y - 20, 240, '#ff3f8e', 0.18);
      // 搖晃吊燈與光錐
      for (const [x, ph] of [[300, 0], [640, 1.4], [980, 2.6]]) {
        const a = Math.sin(t * 0.9 + ph) * 0.05, lx = x + Math.sin(a) * 180, ly = 180 + (1 - Math.cos(a)) * 180;
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(lx, ly - 18); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lg(ctx, lx, ly, lx, ly + 420, [[0, 'rgba(255,214,140,.28)'], [1, 'rgba(255,214,140,0)']]);
        ctx.beginPath(); ctx.moveTo(lx - 20, ly); ctx.lineTo(lx + 20, ly); ctx.lineTo(lx + 160 + a * 800, ly + 440); ctx.lineTo(lx - 160 + a * 800, ly + 440); ctx.fill(); ctx.restore();
        ctx.fillStyle = lg(ctx, lx - 28, 0, lx + 28, 0, [[0, '#5a4220'], [0.5, '#d9b06a'], [1, '#5a4220']]); ctx.beginPath(); ctx.moveTo(lx - 8, ly - 20); ctx.lineTo(lx + 8, ly - 20); ctx.lineTo(lx + 28, ly); ctx.lineTo(lx - 28, ly); ctx.fill();
        glow(ctx, lx, ly + 2, 60, '#ffd88a', 0.8);
      }
      // 雨滴滑落
      const w = st.win;
      ctx.save(); ctx.beginPath(); ctx.rect(w.x, w.y, w.w, w.h); ctx.clip();
      const ps = particles(st, 40, R(9), (r) => ({ x: w.x + r() * w.w, y: r() * w.h, v: 30 + r() * 80, l: 6 + r() * 14 }));
      ctx.strokeStyle = 'rgba(190,220,255,.55)'; ctx.lineWidth = 1.2;
      for (const p of ps) { const y = w.y + ((p.y + t * p.v) % w.h); ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - 1, y + p.l); ctx.stroke(); }
      ctx.restore();
      // 煙霧
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) { const u = ((t * 0.05 + i / 6) % 1), x = 200 + i * 170 + Math.sin(t * 0.3 + i) * 40, y = 460 - u * 420; ctx.fillStyle = rg(ctx, x, y, 90 + u * 120, [[0, `rgba(200,190,180,${0.08 * (1 - u)})`], [1, 'rgba(200,190,180,0)']]); ctx.fillRect(x - 220, y - 220, 440, 440); }
      ctx.restore();
    },
  };

  // 6 內華達沙漠新開幕賭場（夜景）
  S.simpsontown = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, 0, 420, [[0, '#070a24'], [0.55, '#2c1a52'], [1, '#c4507a']]); ctx.fillRect(0, 0, W, 420);
      st.stars = Array.from({ length: 160 }, () => ({ x: rng() * W, y: rng() * 260, s: rng() * 1.6 + 0.3, p: rng() * 6 }));
      blur(ctx, 1, () => ridge(ctx, rng, 360, 70, 0.6, '#1a0f2e'));
      ctx.fillStyle = lg(ctx, 0, 380, 0, H, [[0, '#2a1830'], [1, '#0c0810']]); ctx.fillRect(0, 380, W, H);
      // 兩側建築
      const bld = (x, w, h, col, label) => {
        ctx.fillStyle = lg(ctx, x, 0, x + w, 0, [[0, col], [1, hexA('#000000', 0.9)]]); ctx.fillRect(x, 400 - h, w, h);
        for (let yy = 400 - h + 14; yy < 390; yy += 22) for (let xx = x + 10; xx < x + w - 14; xx += 22) if (rng() < 0.55) { ctx.fillStyle = hexA(['#ffd27a', '#ffeebb'][(rng() * 2) | 0], 0.8); ctx.fillRect(xx, yy, 10, 12); }
        st.labels = st.labels || []; st.labels.push({ x: x + w / 2, y: 400 - h - 24, label });
      };
      bld(20, 200, 200, '#3a2a4a', 'DONUTS'); bld(1060, 200, 220, '#2a3a4a', 'MOTEL');
      // 主賭場
      ctx.fillStyle = lg(ctx, 0, 110, 0, 400, [[0, '#3b2050'], [1, '#170c22']]); ctx.fillRect(400, 110, 480, 290);
      for (let yy = 150; yy < 380; yy += 26) for (let xx = 420; xx < 860; xx += 30) { ctx.fillStyle = hexA(rng() < 0.6 ? '#ffcf6a' : '#5a3a70', 0.85); ctx.fillRect(xx, yy, 16, 14); }
      ctx.fillStyle = '#111'; ctx.fillRect(560, 340, 160, 60);
      // 棕櫚樹剪影
      const palm = (x, h) => { ctx.strokeStyle = '#08050c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, 410); ctx.quadraticCurveTo(x + 10, 410 - h / 2, x + 4, 410 - h); ctx.stroke(); ctx.fillStyle = '#08050c'; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.5; ctx.beginPath(); ctx.moveTo(x + 4, 410 - h); ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 50, 410 - h + Math.sin(a) * 30 - 10, x + 4 + Math.cos(a) * 80, 410 - h + Math.sin(a) * 30 + 30); ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 40, 410 - h + Math.sin(a) * 20 + 4, x + 4, 410 - h); ctx.fill(); } };
      palm(330, 220); palm(950, 250); palm(260, 160);
      vignette(ctx, 0.5);
    },
    anim(ctx, t, st) {
      for (const s of st.stars) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.sin(t * 2 + s.p)})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
      // 探照燈
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [x, ph] of [[500, 0], [780, 2]]) {
        const a = -Math.PI / 2 + Math.sin(t * 0.4 + ph) * 0.6;
        ctx.fillStyle = lg(ctx, x, 110, x + Math.cos(a) * 700, 110 + Math.sin(a) * 700, [[0, 'rgba(200,220,255,.25)'], [1, 'rgba(200,220,255,0)']]);
        ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x + Math.cos(a - 0.06) * 900, 110 + Math.sin(a - 0.06) * 900); ctx.lineTo(x + Math.cos(a + 0.06) * 900, 110 + Math.sin(a + 0.06) * 900); ctx.fill();
      }
      ctx.restore();
      // 跑馬燈＋招牌
      ctx.save(); ctx.font = '900 46px "Arial Black", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#1a0a1a'; ctx.fillRect(450, 50, 380, 80);
      for (let i = 0; i < 26; i++) { const lit = (Math.floor(t * 10) + i) % 4 === 0; const x = 456 + i * 14.6; for (const y of [56, 124]) { ctx.fillStyle = lit ? '#fff3b0' : '#7a6a30'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); } }
      ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 20 + 6 * Math.sin(t * 4); ctx.fillStyle = '#ffe680'; ctx.fillText('YOUR CASINO', 640, 108); ctx.restore();
      ctx.save(); ctx.font = '900 26px "Arial Black", sans-serif'; ctx.textAlign = 'center';
      for (const l of st.labels || []) { const on = Math.sin(t * 3 + l.x) > -0.9; ctx.shadowColor = l.label === 'DONUTS' ? '#ff5fa2' : '#5fd0ff'; ctx.shadowBlur = on ? 18 : 0; ctx.fillStyle = on ? (l.label === 'DONUTS' ? '#ffc0dc' : '#c8f0ff') : '#444'; ctx.fillText(l.label, l.x, l.y); }
      ctx.restore();
      glow(ctx, 640, 390, 260, '#ffb347', 0.15 + 0.03 * Math.sin(t * 2));
    },
  };

  // 7 白宮橢圓辦公室
  S.oval = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, 0, 440, [[0, '#efe6c8'], [1, '#e2d5ae']]); ctx.fillRect(0, 0, W, 440);
      for (let x = 0; x < W; x += 24) { ctx.fillStyle = 'rgba(180,160,100,.06)'; ctx.fillRect(x, 0, 12, 440); }
      ctx.fillStyle = lg(ctx, 0, 0, 0, 40, [[0, '#fbf6e6'], [1, '#cbb98a']]); ctx.fillRect(0, 0, W, 36);
      // 三扇窗：明亮戶外（模糊）
      st.wins = [];
      for (const x of [390, 570, 750]) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, 90, 140, 300); ctx.clip();
        ctx.fillStyle = lg(ctx, 0, 90, 0, 390, [[0, '#bfe0ff'], [0.6, '#eaf6ff'], [1, '#cfe8c8']]); ctx.fillRect(x, 90, 140, 300);
        blur(ctx, 5, () => { for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${60 + rng() * 40},${120 + rng() * 40},${60 + rng() * 30},.9)`; ctx.beginPath(); ctx.arc(x + rng() * 140, 300 + rng() * 90, 30 + rng() * 30, 0, 7); ctx.fill(); } });
        ctx.restore();
        ctx.strokeStyle = '#fbfaf5'; ctx.lineWidth = 8; ctx.strokeRect(x, 90, 140, 300);
        ctx.lineWidth = 4; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + (140 * i) / 3, 90); ctx.lineTo(x + (140 * i) / 3, 390); ctx.stroke(); } for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x, 90 + i * 60); ctx.lineTo(x + 140, 90 + i * 60); ctx.stroke(); }
        // 金色帷幔（褶皺）
        for (const [dx, w] of [[-44, 56], [128, 56]]) {
          for (let i = 0; i < 8; i++) { ctx.fillStyle = lg(ctx, x + dx + (i * w) / 8, 0, x + dx + ((i + 1) * w) / 8, 0, [[0, '#a87a12'], [0.5, '#f2cf62'], [1, '#8a6208']]); ctx.fillRect(x + dx + (i * w) / 8, 70, w / 8 + 0.5, 340); }
        }
        ctx.fillStyle = lg(ctx, 0, 62, 0, 96, [[0, '#f2cf62'], [1, '#9a700e']]); ctx.beginPath(); ctx.moveTo(x - 48, 66); ctx.lineTo(x + 188, 66); ctx.quadraticCurveTo(x + 70, 120, x - 48, 66); ctx.fill();
        st.wins.push(x);
      }
      // 壁柱與壁燈
      for (const x of [120, 300, 960, 1140]) { ctx.fillStyle = lg(ctx, x, 0, x + 30, 0, [[0, '#d8caa0'], [0.5, '#fbf6e6'], [1, '#cdbd90']]); ctx.fillRect(x, 36, 30, 404); }
      // 國旗
      const us = (f, w, h) => { for (let i = 0; i < 13; i++) { f.fillStyle = i % 2 ? '#ffffff' : '#b22234'; f.fillRect(0, (i * h) / 13, w, h / 13 + 0.5); } f.fillStyle = '#3c3b6e'; f.fillRect(0, 0, w * 0.42, h * 0.54); f.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) f.fillRect(5 + c * 13, 5 + r * 14, 3, 3); };
      st.us = us;
      ctx.fillStyle = lg(ctx, 0, 440, 0, H, [[0, '#cbbd96'], [1, '#a89a72']]); ctx.fillRect(0, 440, W, H);
      ctx.save(); ctx.beginPath(); ctx.ellipse(640, 600, 720, 220, 0, 0, 7); ctx.clip();
      ctx.fillStyle = '#1e3a78'; ctx.fillRect(0, 380, W, 400);
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.moveTo(640, 600); ctx.lineTo(640 + Math.cos(a) * 900, 600 + Math.sin(a) * 260); ctx.lineTo(640 + Math.cos(a + 0.13) * 900, 600 + Math.sin(a + 0.13) * 260); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = '#c9a33a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(640, 600, 720, 220, 0, 0, 7); ctx.stroke();
      // 堅毅桌
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(170, 500, 130, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = lg(ctx, 60, 0, 280, 0, [[0, '#3a1e0c'], [0.5, '#7a4420'], [1, '#3a1e0c']]); ctx.fillRect(60, 390, 220, 110);
      ctx.fillStyle = lg(ctx, 0, 380, 0, 396, [[0, '#9a5a2a'], [1, '#4a2410']]); ctx.fillRect(52, 380, 236, 16);
      vignette(ctx, 0.3);
    },
    anim(ctx, t, st) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const x of st.wins) {
        const a = 0.09 + 0.03 * Math.sin(t * 0.5 + x);
        ctx.fillStyle = lg(ctx, x + 70, 120, x - 100, 640, [[0, `rgba(255,248,220,${a})`], [1, 'rgba(255,248,220,0)']]);
        ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x + 140, 110); ctx.lineTo(x - 10, 680); ctx.lineTo(x - 260, 680); ctx.fill();
      }
      ctx.restore();
      for (const [x, ph] of [[250, 0], [1030, 1.7]]) {
        ctx.fillStyle = lg(ctx, x - 3, 0, x + 3, 0, [[0, '#8a6a2a'], [0.5, '#f0cf73'], [1, '#8a6a2a']]); ctx.fillRect(x - 3, 130, 6, 320);
        ctx.fillStyle = '#e9c45a'; ctx.beginPath(); ctx.moveTo(x - 10, 128); ctx.lineTo(x, 108); ctx.lineTo(x + 10, 128); ctx.fill();
        flag(ctx, x + 3, 140, 100, 66, t * 0.5 + ph, x < 640 ? st.us : (f, w, h) => { f.fillStyle = '#1b2f6a'; f.fillRect(0, 0, w, h); f.fillStyle = '#e9c45a'; f.beginPath(); f.arc(w / 2, h / 2, h * 0.25, 0, 7); f.fill(); });
      }
    },
  };

  // 8 天堂
  S.heaven = {
    bake(ctx, rng, st) {
      ctx.fillStyle = rg(ctx, 640, 90, 900, [[0, '#fffbe8'], [0.3, '#fbefd0'], [0.7, '#cfe3f8'], [1, '#9cc4ec']]); ctx.fillRect(0, 0, W, H);
      // 遠方珍珠門
      blur(ctx, 1.5, () => {
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(470, 380); ctx.lineTo(470, 170); ctx.arc(640, 170, 170, Math.PI, 0); ctx.lineTo(810, 380); ctx.stroke();
        ctx.strokeStyle = 'rgba(220,180,90,.85)'; ctx.lineWidth = 4;
        for (let x = 500; x <= 780; x += 28) { ctx.beginPath(); ctx.moveTo(x, 380); ctx.lineTo(x, 170 - Math.sqrt(Math.max(0, 150 * 150 - (x - 640) ** 2)) + 20); ctx.stroke(); }
        for (const x of [470, 810]) { ctx.fillStyle = rg(ctx, x, 140, 22, [[0, '#ffffff'], [1, '#d8d0c0']]); ctx.beginPath(); ctx.arc(x, 140, 22, 0, 7); ctx.fill(); }
      });
      glow(ctx, 640, 200, 360, '#fff2c0', 0.7);
      st.layers = [0, 1, 2].map((l) => Array.from({ length: 7 }, () => ({ x: rng() * 1600 - 160, y: 300 + l * 110 + rng() * 60, s: 0.8 + l * 0.5 + rng() * 0.4, spr: cloudSprite(320, 120, rng, '#ffffff', l ? '#c7d4ea' : '#d9cfe0') })));
      for (const c of st.layers[0]) ctx.drawImage(c.spr, c.x, c.y - 40, 320 * c.s, 120 * c.s);
      ctx.fillStyle = lg(ctx, 0, 480, 0, H, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.9)']]); ctx.fillRect(0, 480, W, H);
    },
    anim(ctx, t, st) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.08 + (i / 13) * 0.84) + Math.sin(t * 0.1) * 0.05, al = 0.05 + 0.04 * Math.sin(t * 0.7 + i * 2);
        ctx.fillStyle = lg(ctx, 640, 60, 640 + Math.cos(a) * 900, 60 + Math.sin(a) * 900, [[0, `rgba(255,236,170,${al})`], [1, 'rgba(255,236,170,0)']]);
        ctx.beginPath(); ctx.moveTo(640, 60); ctx.lineTo(640 + Math.cos(a - 0.04) * 1100, 60 + Math.sin(a - 0.04) * 1100); ctx.lineTo(640 + Math.cos(a + 0.04) * 1100, 60 + Math.sin(a + 0.04) * 1100); ctx.fill();
      }
      ctx.restore();
      for (let l = 1; l < 3; l++) for (const c of st.layers[l]) { const x = ((c.x + t * (6 + l * 6)) % 1700) - 200; ctx.globalAlpha = 0.9; ctx.drawImage(c.spr, x, c.y, 320 * c.s, 120 * c.s); }
      ctx.globalAlpha = 1;
      const ps = particles(st, 50, R(3), (r) => ({ x: r() * W, y: r() * H, v: 6 + r() * 14, p: r() * 6, s: 1 + r() * 2.2 }));
      for (const p of ps) { const y = ((p.y - t * p.v) % H + H) % H, x = p.x + Math.sin(t * 0.6 + p.p) * 20; glow(ctx, x, y, p.s * 5, '#ffe9a0', 0.6 + 0.4 * Math.sin(t * 2 + p.p)); }
    },
  };

  // 9 西方極樂淨土：金色晚霞、霧中寶塔、蓮池倒影
  S.pureland = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, 0, 430, [[0, '#4a3a7a'], [0.4, '#d8789a'], [0.75, '#ffc27a'], [1, '#ffe7b0']]); ctx.fillRect(0, 0, W, 430);
      glow(ctx, 640, 300, 520, '#fff0c8', 0.8);
      ctx.fillStyle = '#fff7df'; ctx.beginPath(); ctx.arc(640, 300, 70, 0, 7); ctx.fill();
      for (let i = 1; i < 4; i++) { ctx.strokeStyle = `rgba(255,230,160,${0.25 / i})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(640, 300, 70 + i * 40, 0, 7); ctx.stroke(); }
      blur(ctx, 2, () => ridge(ctx, rng, 330, 90, 0.7, 'rgba(150,110,150,.75)'));
      blur(ctx, 1.2, () => ridge(ctx, rng, 370, 70, 0.8, 'rgba(110,80,110,.85)'));
      const pagoda = (x, s) => { ctx.fillStyle = 'rgba(60,35,60,.92)'; for (let i = 0; i < 6; i++) { const w = (90 - i * 12) * s, y = 400 - i * 30 * s; ctx.fillRect(x - w * 0.35, y - 24 * s, w * 0.7, 24 * s); ctx.beginPath(); ctx.moveTo(x - w * 0.62, y - 22 * s); ctx.quadraticCurveTo(x, y - 40 * s, x + w * 0.62, y - 22 * s); ctx.lineTo(x + w * 0.5, y - 26 * s); ctx.lineTo(x - w * 0.5, y - 26 * s); ctx.fill(); } ctx.fillRect(x - 1.5 * s, 400 - 210 * s, 3 * s, 40 * s); };
      blur(ctx, 0.8, () => { pagoda(200, 1); pagoda(1090, 0.85); pagoda(940, 0.55); });
      // 蓮池（倒映天空）
      ctx.fillStyle = lg(ctx, 0, 410, 0, H, [[0, '#ffd59a'], [0.3, '#c47a8e'], [1, '#2c2f5a']]); ctx.fillRect(0, 410, W, H);
      ctx.save(); ctx.globalAlpha = 0.25; ctx.translate(0, 820); ctx.scale(1, -1); const refl = mk(W, 410); refl.getContext('2d').drawImage(ctx.canvas, 0, 0, ctx.canvas.width, 410 * ctx._k, 0, 0, W, 410); blur(ctx, 3, () => ctx.drawImage(refl, 0, 0)); ctx.restore();
      for (let i = 0; i < 18; i++) {
        const x = rng() * W, y = 430 + Math.pow(rng(), 0.8) * 280, s = 0.4 + ((y - 420) / 300) * 1.2;
        ctx.fillStyle = lg(ctx, x - 60 * s, y, x + 60 * s, y, [[0, '#1f5a2a'], [0.5, '#4c9a46'], [1, '#1f5a2a']]);
        ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 16 * s, 0, 0.2, Math.PI * 2 - 0.2); ctx.lineTo(x, y); ctx.fill();
        if (rng() < 0.45) {
          for (let p = 0; p < 7; p++) { const a = -Math.PI / 2 + (p - 3) * 0.32; ctx.save(); ctx.translate(x, y - 6 * s); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = lg(ctx, 0, 0, 0, -36 * s, [[0, '#f7c3d6'], [1, '#fff6fa']]); ctx.beginPath(); ctx.ellipse(0, -18 * s, 8 * s, 20 * s, 0, 0, 7); ctx.fill(); ctx.restore(); }
          glow(ctx, x, y - 12 * s, 20 * s, '#ffe08a', 0.6);
        }
      }
      vignette(ctx, 0.35);
    },
    anim(ctx, t, st) {
      // 太陽倒影波光
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const y = 420 + i * 9, w = 60 - i * 3 + Math.sin(t * 3 + i) * 14; ctx.fillStyle = `rgba(255,236,190,${0.35 - i * 0.02})`; ctx.fillRect(640 - w / 2 + Math.sin(t * 2 + i * 1.3) * 6, y, w, 2); }
      ctx.restore();
      // 漣漪
      for (let i = 0; i < 4; i++) { const u = ((t * 0.2 + i / 4) % 1), x = [180, 1100, 420, 900][i], y = [520, 600, 650, 480][i]; ctx.strokeStyle = `rgba(255,240,220,${0.35 * (1 - u)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 10 + u * 70, 3 + u * 18, 0, 0, 7); ctx.stroke(); }
      // 天燈冉冉上升
      const ps = particles(st, 14, R(11), (r) => ({ x: r() * W, y: r() * 400, v: 5 + r() * 8, s: 0.6 + r() * 0.8, p: r() * 6 }));
      for (const p of ps) { const y = ((p.y - t * p.v) % 460 + 460) % 460 - 40, x = p.x + Math.sin(t * 0.4 + p.p) * 16; glow(ctx, x, y, 26 * p.s, '#ffb04a', 0.55); ctx.fillStyle = lg(ctx, 0, y - 10 * p.s, 0, y + 10 * p.s, [[0, '#ffdd9a'], [1, '#ff8a3a']]); ctx.fillRect(x - 6 * p.s, y - 9 * p.s, 12 * p.s, 18 * p.s); }
      // 雲霧飄移
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) { const x = ((t * (8 + i * 4) + i * 500) % 1800) - 300; ctx.fillStyle = rg(ctx, x, 360 + i * 20, 340, [[0, 'rgba(255,230,240,.18)'], [1, 'rgba(255,230,240,0)']]); ctx.fillRect(x - 340, 200, 680, 340); }
      ctx.restore();
    },
  };

  // 10 外太空
  S.space = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, W, H, [[0, '#04030c'], [0.5, '#0d0a26'], [1, '#05040e']]); ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      blur(ctx, 18, () => {
        for (let i = 0; i < 46; i++) { const a = rng() * 0.6 + 0.2, x = 100 + rng() * 700 + i * 6, y = 80 + rng() * 380, r = 60 + rng() * 160, col = ['#b0306e', '#3a3aa8', '#1f8a9a', '#7a2ab0', '#d0604a'][(rng() * 5) | 0]; ctx.fillStyle = rg(ctx, x, y, r, [[0, hexA(col, a * 0.5)], [1, hexA(col, 0)]]); ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      });
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; blur(ctx, 14, () => { for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(20,10,30,.6)'; ctx.beginPath(); ctx.ellipse(200 + rng() * 600, 150 + rng() * 300, 60 + rng() * 80, 14 + rng() * 20, rng() * 3, 0, 7); ctx.fill(); } }); ctx.restore();
      for (let i = 0; i < 700; i++) { const x = rng() * W, y = rng() * H, s = Math.pow(rng(), 3) * 2 + 0.3; ctx.fillStyle = `rgba(${220 + rng() * 35},${220 + rng() * 35},255,${0.4 + rng() * 0.6})`; ctx.fillRect(x, y, s, s); }
      for (let i = 0; i < 14; i++) { const x = rng() * W, y = rng() * 500; glow(ctx, x, y, 14, '#cfe0ff', 0.9); ctx.strokeStyle = 'rgba(220,235,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke(); }
      st.tw = Array.from({ length: 60 }, () => ({ x: rng() * W, y: rng() * 520, p: rng() * 6 }));
      // 環狀行星
      const px = 1060, py = 150, pr = 88;
      const ring = (front) => { ctx.save(); ctx.translate(px, py); ctx.rotate(-0.32); ctx.beginPath(); ctx.ellipse(0, 0, 190, 40, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.strokeStyle = 'rgba(230,200,160,.75)'; ctx.lineWidth = 16; ctx.stroke(); ctx.strokeStyle = 'rgba(180,150,120,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 160, 32, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke(); ctx.restore(); };
      ring(false);
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.clip();
      ctx.fillStyle = '#d9a46a'; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = hexA(['#e9c08a', '#b9784a', '#f4d6a6', '#a8643a'][i % 4], 0.7); ctx.fillRect(px - pr, py - pr + i * 13 + rng() * 4, pr * 2, 6 + rng() * 6); }
      ctx.fillStyle = rg(ctx, px - 40, py - 40, pr * 1.6, [[0, 'rgba(255,255,255,.15)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.85)']]); ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      ctx.restore(); ring(true);
      // 地球
      const ex = 140, ey = 580, er = 110;
      glow(ctx, ex, ey, er * 1.35, '#4dabf7', 0.45);
      ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.clip();
      ctx.fillStyle = rg(ctx, ex - 30, ey - 30, er * 1.3, [[0, '#4a9fe0'], [1, '#0d2a5a']]); ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
      blur(ctx, 1, () => { for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(70,140,70,.85)'; ctx.beginPath(); ctx.ellipse(ex - 70 + rng() * 140, ey - 70 + rng() * 140, 14 + rng() * 30, 8 + rng() * 20, rng() * 3, 0, 7); ctx.fill(); } for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(ex - 90 + rng() * 180, ey - 90 + rng() * 180, 30 + rng() * 30, 4 + rng() * 5, rng(), 0, 7); ctx.fill(); } });
      ctx.fillStyle = rg(ctx, ex - 50, ey - 50, er * 1.5, [[0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,10,.9)']]); ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
      ctx.restore();
      // 太空站平台
      ctx.fillStyle = lg(ctx, 0, 470, 0, H, [[0, '#1a1f2e'], [1, '#07090f']]); ctx.beginPath(); ctx.ellipse(640, 690, 760, 230, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(99,230,190,.25)'; ctx.lineWidth = 1;
      for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(640 + i * 30, 470); ctx.lineTo(640 + i * 130, H); ctx.stroke(); }
      vignette(ctx, 0.4);
    },
    anim(ctx, t, st) {
      for (const s of st.tw) { const a = (Math.sin(t * 3 + s.p) + 1) / 2; if (a > 0.6) glow(ctx, s.x, s.y, 4 + a * 4, '#ffffff', a * 0.8); }
      const u = (t % 9) / 1.2;
      if (u < 1) { const x0 = 300 + (t % 37) * 20, y0 = 60, x = x0 + u * 380, y = y0 + u * 190; ctx.strokeStyle = lg(ctx, x - 120, y - 60, x, y, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.9)']]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 120, y - 60); ctx.lineTo(x, y); ctx.stroke(); glow(ctx, x, y, 10, '#ffffff', 1); }
      for (let i = 0; i < 5; i++) { const x = ((t * (8 + i * 3) + i * 300) % 1500) - 100, y = 250 + i * 50 + Math.sin(t * 0.3 + i) * 10; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3 + i); ctx.fillStyle = lg(ctx, -8, -8, 8, 8, [[0, '#8a8070'], [1, '#2a2620']]); ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-2, -8); ctx.lineTo(7, -5); ctx.lineTo(8, 4); ctx.lineTo(0, 8); ctx.lineTo(-7, 5); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 3; r++) { const a = 0.25 + 0.2 * Math.sin(t * 2 - r); ctx.strokeStyle = `rgba(99,230,190,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(640, 690, 700 - r * 110, 210 - r * 34, 0, Math.PI, 0); ctx.stroke(); }
      ctx.restore();
    },
  };

  // 主選單：模糊的賭場大廳散景
  S.menu = {
    bake(ctx, rng, st) {
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#120822'], [1, '#05020c']]); ctx.fillRect(0, 0, W, H);
      blur(ctx, 7, () => {
        for (let i = 0; i < 12; i++) { const x = i * 112 - 20, h = 300 + (i % 3) * 30; ctx.fillStyle = '#1d1035'; ctx.fillRect(x, H - h, 92, h); ctx.fillStyle = hexA(['#ff4f9a', '#4fc3ff', '#ffd43b', '#7cff8a'][i % 4], 0.8); ctx.fillRect(x + 12, H - h + 30, 68, 50); }
        for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(255,220,150,.9)'; ctx.beginPath(); ctx.ellipse(80 + i * 145, 40, 50, 10, 0, 0, 7); ctx.fill(); }
      });
      st.b = Array.from({ length: 50 }, () => ({ x: rng() * W, y: rng() * H, r: 10 + rng() * 40, c: ['#ff4f9a', '#4fc3ff', '#ffd43b', '#b07cff', '#ff9f43'][(rng() * 5) | 0], p: rng() * 6 }));
      vignette(ctx, 0.6);
    },
    anim(ctx, t, st) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const b of st.b) { const a = 0.12 + 0.1 * Math.sin(t * 1.2 + b.p); ctx.fillStyle = rg(ctx, b.x, b.y, b.r, [[0, hexA(b.c, a)], [0.8, hexA(b.c, a * 0.7)], [1, hexA(b.c, 0)]]); ctx.beginPath(); ctx.arc(b.x, b.y + Math.sin(t * 0.3 + b.p) * 6, b.r, 0, 7); ctx.fill(); }
      ctx.restore();
      for (let i = 0; i < 40; i++) { const lit = (Math.floor(t * 8) + i) % 5 === 0; ctx.fillStyle = lit ? '#ffe28a' : '#5a3a20'; ctx.beginPath(); ctx.arc(20 + i * 32, 12, 4, 0, 7); ctx.fill(); if (lit) glow(ctx, 20 + i * 32, 12, 14, '#ffd36b', 0.7); }
    },
  };

  // ═════════════ 引擎 ═════════════
  const RES = { low: 0.6, mid: 0.75, high: 1 };
  function baked(name, stage, k) {
    const key = `${name}|${stage}|${k}`;
    if (cache.has(key)) return cache.get(key);
    const sc = S[name] || S.menu;
    const c = mk(W * k, H * k), ctx = c.getContext('2d');
    ctx._k = k; ctx.scale(k, k);
    const st = { stage: stage || 0 };
    sc.bake(ctx, R(name.length * 97 + (stage || 0) * 13 + 7), st);
    const v = { canvas: c, st };
    cache.set(key, v);
    if (cache.size > 14) cache.delete(cache.keys().next().value);
    return v;
  }

  function drawFrame(m, t) {
    const sc = S[m.name] || S.menu;
    const ctx = m.ctx, k = m.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(m.base.canvas, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx._k = k;
    sc.anim(ctx, t, m.base.st);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (quality === 'high' && GRAIN) {
      ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.translate((Math.random() * 192) | 0, (Math.random() * 192) | 0);
      ctx.fillRect(-192, -192, W + 192, H + 192); ctx.restore();
    }
  }

  function mount(el, name, stage) {
    for (const m of mounts) if (m.el === el) mounts.delete(m);
    const k = RES[quality] || 1;
    const c = mk(W * k, H * k);
    c.style.cssText = 'width:100%;height:100%;display:block';
    el.innerHTML = ''; el.appendChild(c);
    const m = { el, name, stage: stage || 0, k, canvas: c, ctx: c.getContext('2d'), base: baked(name, stage || 0, k), last: 0 };
    drawFrame(m, performance.now() / 1000);
    mounts.add(m);
    return m;
  }

  function still(name, stage, w, h) {
    const b = baked(name, stage || 0, 0.6);
    const c = mk(w, h);
    const ctx = c.getContext('2d');
    ctx.drawImage(b.canvas, 0, 0, w, h);
    const k = w / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx._k = k;
    try { (S[name] || S.menu).anim(ctx, 3, { ...b.st, p: undefined }); } catch (e) { /* 縮圖忽略動畫錯誤 */ }
    return c;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (quality === 'low') return;
    const t = now / 1000, interval = quality === 'high' ? 0 : 1 / 30;
    for (const m of mounts) {
      if (!m.el.isConnected) { mounts.delete(m); continue; }
      if (m.el.offsetParent === null || document.hidden) continue;
      if (t - m.last < interval) continue;
      m.last = t;
      drawFrame(m, t);
    }
  }
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(loop);

  function setQuality(q) {
    if (q === quality) return;
    quality = q;
    for (const m of [...mounts]) mount(m.el, m.name, m.stage);
  }

  HP.Backdrop = { mount, still, setQuality, SCENES: S };
})(typeof window !== 'undefined' ? window : globalThis);
