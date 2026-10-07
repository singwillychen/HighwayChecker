/* 各關卡背景（1280×720 SVG，卡通扁平風格） */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const O = '#1a1a1a';
  const W = 1280, H = 720;
  const wrap = (inner, defs = '') => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;
  const rnd = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  function stars(n, seed, maxY = H) {
    const r = rnd(seed); let s = '';
    for (let i = 0; i < n; i++) s += `<circle cx="${(r() * W) | 0}" cy="${(r() * maxY) | 0}" r="${(r() * 1.8 + 0.4).toFixed(1)}" fill="#fff" opacity="${(r() * 0.7 + 0.3).toFixed(2)}" class="twinkle" style="animation-delay:${(r() * 4).toFixed(1)}s"/>`;
    return s;
  }
  const cloud = (x, y, s = 1, fill = '#fff', op = 1) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op}"><path d="M0,40 Q-10,10 30,12 Q40,-14 80,0 Q110,-20 140,10 Q180,8 176,40 Z" fill="${fill}" stroke="${O}" stroke-width="3"/></g>`;

  const SCENES = {
    // 日本大自然極簡風教室
    kinder() {
      let s = `<rect width="${W}" height="${H}" fill="#f4ecd8"/>`;
      // 大窗戶：山丘、富士山、樹
      s += `<rect x="120" y="60" width="1040" height="330" rx="10" fill="#bfe3f2" stroke="#8b6b4a" stroke-width="16"/>`;
      s += `<path d="M128,300 Q360,200 620,290 Q860,210 1152,280 L1152,382 L128,382 Z" fill="#8fc97a" stroke="${O}" stroke-width="3"/>`;
      s += `<path d="M520,260 L640,130 L760,260 Z" fill="#7a8fb8" stroke="${O}" stroke-width="3"/><path d="M604,170 L640,130 L676,170 Q658,160 640,176 Q622,160 604,170 Z" fill="#fff"/>`;
      s += `<path d="M128,340 Q400,280 700,340 Q950,300 1152,330 L1152,382 L128,382 Z" fill="#6bb35a" stroke="${O}" stroke-width="3"/>`;
      for (const [x, y] of [[230, 290], [300, 310], [960, 290], [1060, 300]]) s += `<rect x="${x - 5}" y="${y}" width="10" height="40" fill="#8b6b4a"/><circle cx="${x}" cy="${y - 10}" r="30" fill="#4c9a4a" stroke="${O}" stroke-width="3"/>`;
      s += `<circle cx="1050" cy="120" r="36" fill="#ffe066" stroke="${O}" stroke-width="3"/>`;
      s += cloud(220, 100, 0.8) + cloud(820, 90, 0.6);
      s += `<line x1="640" y1="60" x2="640" y2="390" stroke="#8b6b4a" stroke-width="10"/><line x1="120" y1="225" x2="1160" y2="225" stroke="#8b6b4a" stroke-width="6" opacity=".6"/>`;
      // 木地板與牆腳
      s += `<rect y="400" width="${W}" height="320" fill="#e2c391"/>`;
      for (let x = 0; x < W; x += 80) s += `<line x1="${x}" y1="400" x2="${x - 60}" y2="720" stroke="#c9a46c" stroke-width="3"/>`;
      s += `<rect y="392" width="${W}" height="14" fill="#a07850"/>`;
      // 小朋友的畫、花盆、燈籠
      s += `<g transform="translate(40 300)"><rect x="0" y="40" width="50" height="50" rx="6" fill="#d9480f" stroke="${O}" stroke-width="3"/><path d="M25,40 Q0,0 10,-30 M25,40 Q40,-10 50,-20 M25,40 Q20,-20 30,-50" stroke="#2b8a3e" stroke-width="6" fill="none"/></g>`;
      s += `<g transform="translate(1190 300)"><rect x="0" y="40" width="50" height="50" rx="6" fill="#1971c2" stroke="${O}" stroke-width="3"/><circle cx="25" cy="20" r="26" fill="#f783ac" stroke="${O}" stroke-width="3"/><circle cx="25" cy="20" r="9" fill="#ffd43b"/></g>`;
      return wrap(s);
    },

    // 總統府：紅磚、白色腰帶、中央塔、紅地毯
    presidential() {
      let s = `<rect width="${W}" height="${H}" fill="#7a2e22"/>`;
      for (let y = 0; y < 420; y += 22) for (let x = (y / 22) % 2 ? -30 : 0; x < W; x += 60) s += `<rect x="${x}" y="${y}" width="58" height="20" fill="#9c3b2b" stroke="#6b2419" stroke-width="2"/>`;
      s += `<rect y="150" width="${W}" height="26" fill="#f1e3c8" stroke="${O}" stroke-width="3"/><rect y="400" width="${W}" height="26" fill="#f1e3c8" stroke="${O}" stroke-width="3"/>`;
      // 拱窗
      for (let i = 0; i < 6; i++) {
        const x = 80 + i * 210;
        if (i === 2 || i === 3) continue;
        s += `<path d="M${x},380 L${x},240 Q${x + 50},180 ${x + 100},240 L${x + 100},380 Z" fill="#2b2b4a" stroke="#f1e3c8" stroke-width="10"/><line x1="${x + 50}" y1="210" x2="${x + 50}" y2="380" stroke="#f1e3c8" stroke-width="4"/>`;
      }
      // 中央塔（窗中景）
      s += `<rect x="530" y="40" width="220" height="360" fill="#9c3b2b" stroke="${O}" stroke-width="4"/>`;
      s += `<rect x="560" y="80" width="160" height="70" fill="#f1e3c8" stroke="${O}" stroke-width="3"/><circle cx="640" cy="115" r="26" fill="#fff" stroke="${O}" stroke-width="3"/><path d="M640,115 L640,96 M640,115 L654,122" stroke="${O}" stroke-width="3"/>`;
      s += `<path d="M580,40 L640,-10 L700,40 Z" fill="#f1e3c8" stroke="${O}" stroke-width="3"/>`;
      for (let i = 0; i < 3; i++) s += `<path d="M${565 + i * 55},380 L${565 + i * 55},250 Q${590 + i * 55},220 ${615 + i * 55},250 L${615 + i * 55},380 Z" fill="#2b2b4a" stroke="#f1e3c8" stroke-width="6"/>`;
      // 國旗
      for (const x of [420, 860]) s += `<line x1="${x}" y1="200" x2="${x}" y2="420" stroke="#d4af37" stroke-width="6"/><g transform="translate(${x + 3} 205)"><rect width="90" height="60" fill="#d52b1e" stroke="${O}" stroke-width="2"/><rect width="45" height="30" fill="#00227b"/><circle cx="22.5" cy="15" r="7" fill="#fff"/></g>`;
      // 地板、紅地毯、水晶燈
      s += `<rect y="426" width="${W}" height="294" fill="#4a3426"/>`;
      for (let x = 0; x < W; x += 64) s += `<rect x="${x}" y="426" width="62" height="294" fill="${(x / 64) % 2 ? '#553b2b' : '#4a3426'}"/>`;
      s += `<path d="M520,426 L760,426 L900,720 L380,720 Z" fill="#b5172a" stroke="#d4af37" stroke-width="6"/>`;
      for (const x of [200, 1080]) s += `<g transform="translate(${x} 0)"><line x1="0" y1="0" x2="0" y2="60" stroke="#d4af37" stroke-width="3"/><path d="M-50,60 L50,60 L30,100 L-30,100 Z" fill="#ffe8a3" stroke="#d4af37" stroke-width="3"/>${[-40, -20, 0, 20, 40].map((d) => `<circle cx="${d}" cy="108" r="6" fill="#fff9db" class="twinkle"/>`).join('')}</g>`;
      return wrap(s);
    },

    // 辦公室午餐桌
    office() {
      let s = `<rect width="${W}" height="${H}" fill="#dfe6e9"/>`;
      s += `<rect y="0" width="${W}" height="70" fill="#f8f9fa"/>`;
      for (let x = 60; x < W; x += 240) s += `<rect x="${x}" y="18" width="160" height="26" rx="4" fill="#fff" stroke="#adb5bd" stroke-width="3" class="flicker"/>`;
      // 隔間
      for (let i = 0; i < 6; i++) s += `<rect x="${i * 220 - 20}" y="230" width="200" height="190" fill="#a5b4c4" stroke="${O}" stroke-width="3"/><rect x="${i * 220 + 30}" y="180" width="90" height="62" rx="4" fill="#343a40" stroke="${O}" stroke-width="3"/><rect x="${i * 220 + 38}" y="188" width="74" height="44" fill="#4dabf7" opacity=".8"/>`;
      // 白板、海報
      s += `<rect x="460" y="90" width="360" height="130" fill="#fff" stroke="${O}" stroke-width="4"/><text x="640" y="135" font-size="26" text-anchor="middle" font-weight="900" fill="#1971c2">Q3 業績目標 📈</text><path d="M500,200 L560,180 L620,190 L700,140 L780,120" fill="none" stroke="#e03131" stroke-width="5"/>`;
      s += `<rect x="70" y="90" width="130" height="110" fill="#ffd43b" stroke="${O}" stroke-width="3"/><text x="135" y="140" font-size="18" text-anchor="middle" font-weight="900">團隊合作</text><text x="135" y="168" font-size="14" text-anchor="middle">TEAMWORK!</text>`;
      // 飲水機、微波爐
      s += `<g transform="translate(1110 250)"><rect x="0" y="60" width="70" height="130" fill="#e9ecef" stroke="${O}" stroke-width="3"/><path d="M8,60 L8,0 Q35,-20 62,0 L62,60 Z" fill="#a5d8ff" stroke="${O}" stroke-width="3" opacity=".9"/></g>`;
      s += `<rect x="960" y="110" width="120" height="76" rx="6" fill="#868e96" stroke="${O}" stroke-width="3"/><rect x="970" y="122" width="76" height="52" fill="#212529"/><circle cx="1062" cy="135" r="5" fill="#69db7c"/>`;
      s += `<rect y="420" width="${W}" height="300" fill="#8395a7"/>`;
      for (let x = 0; x < W; x += 60) for (let y = 420; y < 720; y += 60) s += `<rect x="${x}" y="${y}" width="58" height="58" fill="${(x + y) % 120 ? '#8a9bb0' : '#7f91a6'}"/>`;
      return wrap(s);
    },

    // 公路之旅：沙漠公路與小鎮賭場招牌（stage 決定招牌文字）
    roadtrip(stage = 0) {
      const signs = ['GAS · CASINO', 'SALOON · POKER', 'DAM CASINO'];
      const skies = [['#ffb86b', '#ffe3b3'], ['#ff8e72', '#ffd8a8'], ['#5f3dc4', '#ff922b']];
      const [a, b] = skies[stage % 3];
      const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
      s += `<circle cx="1000" cy="230" r="80" fill="#fff3bf" opacity=".9"/>`;
      s += `<path d="M0,330 L120,220 L200,280 L320,180 L460,300 L600,240 L760,310 L900,210 L1060,300 L1180,230 L1280,280 L1280,400 L0,400 Z" fill="#c2703d" stroke="${O}" stroke-width="3"/>`;
      s += `<path d="M120,330 L170,220 L240,220 L290,330 Z" fill="#a85a2e" stroke="${O}" stroke-width="3"/>`;
      s += `<rect y="380" width="${W}" height="340" fill="#e8b878"/>`;
      s += `<path d="M560,380 L720,380 L1100,720 L180,720 Z" fill="#495057" stroke="${O}" stroke-width="3"/>`;
      for (let i = 0; i < 6; i++) { const y = 400 + i * 55, w = 4 + i * 3; s += `<rect x="${640 - w / 2}" y="${y}" width="${w}" height="${18 + i * 5}" fill="#ffd43b"/>`; }
      // 仙人掌
      for (const [x, sc] of [[90, 1.2], [1180, 1], [400, 0.6]]) s += `<g transform="translate(${x} 470) scale(${sc})"><path d="M0,0 L0,-120 Q0,-140 15,-140 Q30,-140 30,-120 L30,0 Z M0,-60 L-25,-60 L-25,-90 Q-25,-100 -15,-100 Q-5,-100 -5,-90 L-5,-75 L0,-75 M30,-80 L50,-80 L50,-105 Q50,-115 40,-115 Q32,-115 32,-105 L32,-95" fill="#2f9e44" stroke="${O}" stroke-width="3"/></g>`;
      // 小鎮賭場招牌
      s += `<g transform="translate(150 140)"><rect x="0" y="0" width="300" height="110" rx="14" fill="#212529" stroke="#ffd43b" stroke-width="6"/><text x="150" y="68" font-size="34" text-anchor="middle" font-weight="900" fill="#ff6b6b" class="neon">${signs[stage % 3]}</text><rect x="140" y="110" width="20" height="160" fill="#495057" stroke="${O}" stroke-width="3"/>${[...Array(12)].map((_, i) => `<circle cx="${14 + i * 25}" cy="10" r="5" fill="#ffd43b" class="twinkle" style="animation-delay:${i * 0.15}s"/>`).join('')}</g>`;
      // 休旅車（一家人在車上）
      s += `<g transform="translate(900 400)"><rect x="0" y="40" width="260" height="80" rx="18" fill="#4dabf7" stroke="${O}" stroke-width="4"/><path d="M30,40 L60,0 L210,0 L240,40 Z" fill="#74c0fc" stroke="${O}" stroke-width="4"/><rect x="70" y="8" width="60" height="30" fill="#e7f5ff" stroke="${O}" stroke-width="3"/><rect x="140" y="8" width="60" height="30" fill="#e7f5ff" stroke="${O}" stroke-width="3"/>` +
        `<circle cx="100" cy="26" r="11" fill="#FFD521" stroke="${O}" stroke-width="2"/><circle cx="170" cy="28" r="9" fill="#FFD521" stroke="${O}" stroke-width="2"/><text x="190" y="36" font-size="18">🐶</text><text x="80" y="36" font-size="14">🐱</text>` +
        `<rect x="10" y="64" width="240" height="14" fill="#fff" opacity=".6"/><circle cx="60" cy="120" r="24" fill="#212529" stroke="${O}" stroke-width="3"/><circle cx="200" cy="120" r="24" fill="#212529" stroke="${O}" stroke-width="3"/><circle cx="60" cy="120" r="9" fill="#adb5bd"/><circle cx="200" cy="120" r="9" fill="#adb5bd"/>` +
        `<rect x="40" y="-24" width="180" height="24" rx="6" fill="#c08552" stroke="${O}" stroke-width="3"/><text x="130" y="-6" font-size="14" text-anchor="middle" font-weight="900">LAS VEGAS OR BUST</text></g>`;
      s += `<g transform="translate(30 560)"><rect width="200" height="56" rx="8" fill="#2b8a3e" stroke="#fff" stroke-width="4"/><text x="100" y="36" font-size="22" font-weight="900" text-anchor="middle" fill="#fff">Las Vegas ${[340, 180, 30][stage % 3]} mi</text></g>`;
      return wrap(s, defs);
    },

    // 紐約地下酒吧
    speakeasy() {
      let s = `<rect width="${W}" height="${H}" fill="#2b1a12"/>`;
      for (let y = 0; y < 460; y += 26) for (let x = (y / 26) % 2 ? -40 : 0; x < W; x += 80) s += `<rect x="${x}" y="${y}" width="78" height="24" fill="#5a2e1e" stroke="#3a1d12" stroke-width="2"/>`;
      // 高窗：雨中曼哈頓天際線
      s += `<rect x="460" y="30" width="360" height="150" fill="#1b2a4a" stroke="#111" stroke-width="12"/>`;
      for (let i = 0; i < 12; i++) { const h = 40 + ((i * 37) % 90); s += `<rect x="${466 + i * 30}" y="${174 - h}" width="26" height="${h}" fill="#111827"/>${h > 70 ? `<rect x="${474 + i * 30}" y="${184 - h}" width="5" height="6" fill="#ffd43b"/>` : ''}`; }
      s += `<path d="M620,174 L620,60 L626,40 L632,60 L632,174 Z" fill="#111827"/>`;
      for (let i = 0; i < 20; i++) s += `<line x1="${470 + i * 18}" y1="${36 + (i * 13) % 60}" x2="${464 + i * 18}" y2="${56 + (i * 13) % 60}" stroke="#a5d8ff" stroke-width="1.5" opacity=".6" class="rain"/>`;
      s += `<line x1="640" y1="30" x2="640" y2="180" stroke="#111" stroke-width="8"/>`;
      // 吧台酒櫃
      s += `<rect x="40" y="200" width="380" height="240" fill="#3b2314" stroke="${O}" stroke-width="4"/>`;
      for (let r = 0; r < 3; r++) { s += `<rect x="50" y="${270 + r * 60}" width="360" height="8" fill="#6b4226"/>`; for (let i = 0; i < 9; i++) s += `<rect x="${62 + i * 38}" y="${228 + r * 60}" width="16" height="42" rx="4" fill="${['#2b8a3e', '#c92a2a', '#e8590c', '#ffd43b', '#1971c2'][(i + r) % 5]}" stroke="${O}" stroke-width="2" opacity=".9"/>`; }
      // 霓虹招牌
      s += `<g class="neon"><text x="1040" y="140" font-size="64" text-anchor="middle" font-weight="900" fill="none" stroke="#ff6b9d" stroke-width="4" font-family="Bungee, sans-serif">JAZZ</text><text x="1040" y="210" font-size="30" text-anchor="middle" fill="#74c0fc" font-weight="900">♠ CLUB 1929 ♠</text></g>`;
      s += `<g transform="translate(1100 260)"><path d="M0,0 Q30,40 10,100 Q-20,140 20,180" fill="none" stroke="#ffd43b" stroke-width="10"/><circle cx="20" cy="180" r="18" fill="#ffd43b" stroke="${O}" stroke-width="3"/></g>`;
      // 吊燈光暈
      s += `<defs><radialGradient id="lamp"><stop offset="0" stop-color="#ffe8a3" stop-opacity=".55"/><stop offset="1" stop-color="#ffe8a3" stop-opacity="0"/></radialGradient></defs><ellipse cx="640" cy="400" rx="560" ry="300" fill="url(#lamp)"/>`;
      s += `<rect y="440" width="${W}" height="280" fill="#1e120c"/>`;
      for (let x = 0; x < W; x += 40) s += `<rect x="${x}" y="440" width="20" height="280" fill="#24160e"/>`;
      return wrap(s);
    },

    // 內華達沙漠的卡通小鎮賭場
    simpsontown() {
      const defs = `<linearGradient id="sky6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74c0fc"/><stop offset="1" stop-color="#d0ebff"/></linearGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#sky6)"/>`;
      s += cloud(100, 60, 1) + cloud(700, 40, 0.8) + cloud(1050, 90, 0.9);
      s += `<path d="M0,330 Q300,260 600,320 Q900,270 1280,320 L1280,420 L0,420 Z" fill="#f0c27b" stroke="${O}" stroke-width="3"/>`;
      // 小鎮建築
      const blds = [[30, '#ff8787', '甜甜圈'], [230, '#74c0fc', 'KWIK'], [880, '#b197fc', '酒館'], [1070, '#69db7c', 'BOWL']];
      for (const [x, c, t] of blds) s += `<rect x="${x}" y="210" width="180" height="210" fill="${c}" stroke="${O}" stroke-width="4"/><rect x="${x + 20}" y="250" width="50" height="50" fill="#e7f5ff" stroke="${O}" stroke-width="3"/><rect x="${x + 110}" y="250" width="50" height="50" fill="#e7f5ff" stroke="${O}" stroke-width="3"/><rect x="${x + 65}" y="340" width="50" height="80" fill="#8d5524" stroke="${O}" stroke-width="3"/><rect x="${x + 20}" y="180" width="140" height="36" rx="6" fill="#fff" stroke="${O}" stroke-width="3"/><text x="${x + 90}" y="206" font-size="22" text-anchor="middle" font-weight="900">${t}</text>`;
      // 巨型甜甜圈招牌
      s += `<g transform="translate(130 110)"><circle r="56" fill="#f783ac" stroke="${O}" stroke-width="5"/><circle r="22" fill="#d0ebff" stroke="${O}" stroke-width="4"/>${[...Array(10)].map((_, i) => `<rect x="${Math.cos(i) * 38}" y="${Math.sin(i * 1.7) * 38}" width="10" height="4" fill="${['#fff', '#ffd43b', '#4dabf7'][i % 3]}" transform="rotate(${i * 40})"/>`).join('')}</g>`;
      // 你的賭場（中央）
      s += `<rect x="430" y="120" width="420" height="300" fill="#fff3bf" stroke="${O}" stroke-width="5"/><path d="M410,130 L640,40 L870,130 Z" fill="#e03131" stroke="${O}" stroke-width="5"/>`;
      s += `<rect x="470" y="150" width="340" height="70" rx="10" fill="#212529" stroke="#ffd43b" stroke-width="5"/><text x="640" y="200" font-size="40" text-anchor="middle" font-weight="900" fill="#ffd43b" class="neon" font-family="Bungee, sans-serif">YOUR CASINO</text>`;
      for (let i = 0; i < 4; i++) s += `<g transform="translate(${470 + i * 90} 250)"><rect width="66" height="100" rx="8" fill="#c92a2a" stroke="${O}" stroke-width="3"/><rect x="8" y="14" width="50" height="28" fill="#fff" stroke="${O}" stroke-width="2"/><text x="33" y="35" font-size="16" text-anchor="middle">🍒7🍋</text><line x1="66" y1="30" x2="78" y2="10" stroke="${O}" stroke-width="4"/><circle cx="78" cy="10" r="6" fill="#e03131" stroke="${O}" stroke-width="2"/></g>`;
      s += `<rect y="420" width="${W}" height="300" fill="#9c36b5"/>`;
      for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) s += `<text x="${i * 80 + 20}" y="${470 + j * 80}" font-size="30" fill="#be4bdb" opacity=".6">${['♠', '♥', '♦', '♣'][(i + j) % 4]}</text>`;
      return wrap(s, defs);
    },

    // 白宮橢圓辦公室
    oval() {
      let s = `<rect width="${W}" height="${H}" fill="#f3e9c6"/>`;
      // 牆面壁柱
      for (let x = 40; x < W; x += 200) s += `<rect x="${x}" y="40" width="30" height="400" fill="#efe1b0" stroke="#c9b67a" stroke-width="2"/>`;
      s += `<rect y="0" width="${W}" height="40" fill="#e8d99a" stroke="#c9b67a" stroke-width="3"/>`;
      // 三扇窗與金色窗簾
      for (const x of [380, 560, 740]) s += `<rect x="${x}" y="90" width="160" height="300" fill="#a5d8ff" stroke="#fff" stroke-width="10"/><line x1="${x + 80}" y1="90" x2="${x + 80}" y2="390" stroke="#fff" stroke-width="5"/><line x1="${x}" y1="240" x2="${x + 160}" y2="240" stroke="#fff" stroke-width="5"/>` +
        `<path d="M${x - 20},70 Q${x + 10},240 ${x - 10},400 L${x + 30},400 Q${x + 40},240 ${x + 20},70 Z M${x + 180},70 Q${x + 150},240 ${x + 170},400 L${x + 130},400 Q${x + 120},240 ${x + 140},70 Z" fill="#e0a800" stroke="${O}" stroke-width="3"/>`;
      s += `<rect x="350" y="62" width="580" height="20" rx="6" fill="#c9a227" stroke="${O}" stroke-width="3"/>`;
      // 旗幟
      s += `<g transform="translate(250 150)"><line x1="0" y1="0" x2="0" y2="300" stroke="#c9a227" stroke-width="6"/><path d="M4,6 Q50,0 90,14 L90,140 Q50,120 4,130 Z" fill="#fff" stroke="${O}" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="4" y="${10 + i * 18}" width="86" height="9" fill="#c92a2a"/>`).join('')}<rect x="4" y="6" width="40" height="60" fill="#1c3d7a"/></g>`;
      s += `<g transform="translate(1030 150)"><line x1="0" y1="0" x2="0" y2="300" stroke="#c9a227" stroke-width="6"/><path d="M4,6 Q50,0 90,14 L90,140 Q50,120 4,130 Z" fill="#1c3d7a" stroke="${O}" stroke-width="2"/><circle cx="46" cy="66" r="20" fill="#ffd43b"/></g>`;
      // 地毯（藍色橢圓 + 太陽紋）
      s += `<rect y="430" width="${W}" height="290" fill="#cfc19a"/>`;
      s += `<ellipse cx="640" cy="590" rx="700" ry="200" fill="#1c3d7a" stroke="#c9a227" stroke-width="10"/>`;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += `<line x1="640" y1="590" x2="${640 + Math.cos(a) * 640}" y2="${590 + Math.sin(a) * 180}" stroke="#25498c" stroke-width="12"/>`; }
      s += `<ellipse cx="640" cy="590" rx="200" ry="60" fill="#f3e9c6" stroke="#c9a227" stroke-width="6"/>`;
      // 堅毅桌（被推到一旁）
      s += `<g transform="translate(70 380)"><rect width="200" height="110" rx="6" fill="#6b3e1f" stroke="${O}" stroke-width="4"/><rect x="70" y="40" width="60" height="70" fill="#4a2a14" stroke="${O}" stroke-width="3"/><rect x="0" y="-10" width="200" height="16" fill="#8d5524" stroke="${O}" stroke-width="3"/><text x="100" y="80" font-size="26" text-anchor="middle" fill="#c9a227">★</text></g>`;
      return wrap(s);
    },

    // 天堂
    heaven() {
      const defs = `<radialGradient id="hv" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#d0ebff"/><stop offset="1" stop-color="#a5d8ff"/></radialGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#hv)"/>`;
      for (let i = 0; i < 18; i++) { const a = -Math.PI + (i / 17) * Math.PI; s += `<path d="M640,120 L${640 + Math.cos(a - 0.04) * 1400},${120 + Math.sin(a - 0.04) * -1400} L${640 + Math.cos(a + 0.04) * 1400},${120 + Math.sin(a + 0.04) * -1400} Z" fill="#fff3bf" opacity=".25"/>`; }
      // 珍珠門
      s += `<g transform="translate(640 0)"><path d="M-260,420 L-260,170 Q-260,40 0,40 Q260,40 260,170 L260,420" fill="none" stroke="#fff" stroke-width="40"/><path d="M-260,420 L-260,170 Q-260,40 0,40 Q260,40 260,170 L260,420" fill="none" stroke="#e9ecef" stroke-width="40" stroke-dasharray="2 40" stroke-linecap="round"/>` +
        `${[-220, -160, -100, -40, 20, 80, 140, 200].map((x) => `<line x1="${x}" y1="${x < 0 ? 100 : 100}" x2="${x}" y2="420" stroke="#ffd43b" stroke-width="6"/>`).join('')}<path d="M-240,180 Q0,80 240,180" fill="none" stroke="#ffd43b" stroke-width="6"/>` +
        `${[-250, 250].map((x) => `<circle cx="${x}" cy="160" r="16" fill="#fff" stroke="#adb5bd" stroke-width="3"/>`).join('')}</g>`;
      // 雲海地面
      s += `<rect y="430" width="${W}" height="290" fill="#f8f9fa"/>`;
      for (let i = 0; i < 14; i++) s += cloud(-60 + i * 100, 400 + (i % 3) * 20, 1.1, '#fff', 1);
      for (let i = 0; i < 4; i++) s += cloud(i * 360 + 40, 70 + (i % 2) * 60, 0.7, '#fff', 0.9);
      s += `<g transform="translate(1040 150)"><rect x="0" y="0" width="120" height="160" rx="10" fill="#fff9db" stroke="#c9a227" stroke-width="4"/><text x="60" y="40" font-size="18" text-anchor="middle" font-weight="900" fill="#c9a227">生命冊</text>${[0, 1, 2, 3, 4].map((i) => `<line x1="20" y1="${60 + i * 20}" x2="100" y2="${60 + i * 20}" stroke="#ced4da" stroke-width="3"/>`).join('')}</g>`;
      return wrap(s, defs);
    },

    // 佛國淨土：蓮池、寶塔、祥雲
    pureland() {
      const defs = `<linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8cc"/><stop offset=".6" stop-color="#ffd8a8"/><stop offset="1" stop-color="#fcc2d7"/></linearGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#pl)"/>`;
      s += `<circle cx="640" cy="230" r="200" fill="#fff3bf" opacity=".7"/><circle cx="640" cy="230" r="150" fill="none" stroke="#ffd43b" stroke-width="6" stroke-dasharray="10 12"/>`;
      // 寶塔
      for (const [x, sc] of [[180, 1], [1100, 0.9]]) {
        let p = '';
        for (let i = 0; i < 5; i++) { const w = 160 - i * 24, y = 360 - i * 52; p += `<rect x="${-w / 2 + 10}" y="${y - 40}" width="${w - 20}" height="40" fill="#c92a2a" stroke="${O}" stroke-width="3"/><path d="M${-w / 2 - 14},${y - 40} Q0,${y - 64} ${w / 2 + 14},${y - 40} Z" fill="#2b8a3e" stroke="${O}" stroke-width="3"/>`; }
        s += `<g transform="translate(${x} 40) scale(${sc})">${p}<line x1="0" y1="56" x2="0" y2="20" stroke="#ffd43b" stroke-width="6"/></g>`;
      }
      // 祥雲（如意雲紋）
      const xiang = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M0,30 Q-20,30 -20,12 Q-20,-6 0,-4 Q4,-24 26,-20 Q44,-30 56,-12 Q76,-14 74,6 Q90,14 76,30 Z" fill="#fff" stroke="#e8590c" stroke-width="3"/><path d="M10,14 q8,-10 16,0 q8,10 16,0" fill="none" stroke="#e8590c" stroke-width="2"/></g>`;
      s += xiang(340, 90, 1.4) + xiang(880, 60, 1.2) + xiang(520, 400, 1) + xiang(1000, 330, 1.1);
      // 蓮池
      s += `<rect y="430" width="${W}" height="290" fill="#63c5b5"/>`;
      for (let i = 0; i < 6; i++) s += `<ellipse cx="${100 + i * 220}" cy="${470 + (i % 2) * 30}" rx="70" ry="16" fill="#2b8a3e" stroke="${O}" stroke-width="2"/>`;
      for (const x of [140, 560, 980, 1200]) s += `<g transform="translate(${x} 460)">${[-40, -20, 0, 20, 40].map((r) => `<path d="M0,0 Q${r * 0.7},-50 ${r * 0.2},-60 Q${r * 1.1},-40 0,0 Z" fill="#faa2c1" stroke="${O}" stroke-width="2" transform="rotate(${r} 0 0)"/>`).join('')}<circle cx="0" cy="-14" r="8" fill="#ffd43b" stroke="${O}" stroke-width="2"/></g>`;
      return wrap(s, defs);
    },

    // 外太空
    space() {
      const defs = `<radialGradient id="sp" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#2b1b5a"/><stop offset="1" stop-color="#05030f"/></radialGradient><radialGradient id="neb" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e64980" stop-opacity=".45"/><stop offset="1" stop-color="#e64980" stop-opacity="0"/></radialGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#sp)"/>`;
      s += `<ellipse cx="300" cy="200" rx="360" ry="200" fill="url(#neb)"/><ellipse cx="1050" cy="500" rx="300" ry="160" fill="url(#neb)" opacity=".7"/>`;
      s += stars(160, 42);
      // 地球、土星
      s += `<g transform="translate(150 560)"><circle r="90" fill="#339af0" stroke="${O}" stroke-width="4"/><path d="M-60,-40 Q-20,-70 10,-40 Q30,-10 0,10 Q-40,20 -60,-40 Z M20,30 Q60,10 70,40 Q50,70 20,60 Z" fill="#51cf66" stroke="${O}" stroke-width="3"/></g>`;
      s += `<g transform="translate(1080 150)"><ellipse rx="150" ry="30" fill="none" stroke="#ffd8a8" stroke-width="14" transform="rotate(-15)"/><circle r="70" fill="#ffc078" stroke="${O}" stroke-width="4"/><path d="M-66,-10 Q0,6 66,-14 M-60,22 Q0,36 60,16" stroke="#e8590c" stroke-width="5" fill="none"/><path d="M-148,10 Q0,70 148,-50" fill="none" stroke="#ffd8a8" stroke-width="14" transform="rotate(-15)" opacity="0"/></g>`;
      // 銀河賭場霓虹招牌
      s += `<g class="neon"><text x="640" y="80" font-size="46" text-anchor="middle" font-weight="900" fill="none" stroke="#63e6be" stroke-width="3" font-family="Bungee, sans-serif">GALACTIC CASINO</text></g>`;
      // 漂浮平台
      s += `<ellipse cx="640" cy="640" rx="720" ry="150" fill="#343a40" stroke="#63e6be" stroke-width="6"/><ellipse cx="640" cy="640" rx="600" ry="110" fill="none" stroke="#63e6be" stroke-width="2" stroke-dasharray="20 14" class="spin-dash"/>`;
      return wrap(s, defs);
    },

    // 主選單背景：現代賭場
    menu() {
      const defs = `<radialGradient id="mg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#3b1d6e"/><stop offset="1" stop-color="#0b0620"/></radialGradient>`;
      let s = `<rect width="${W}" height="${H}" fill="url(#mg)"/>`;
      s += stars(60, 7, 300);
      for (let i = 0; i < 9; i++) s += `<rect x="${i * 150 - 20}" y="${380 - (i % 3) * 30}" width="110" height="${340 + (i % 3) * 30}" rx="8" fill="#1b0f3b" stroke="#7048e8" stroke-width="3"/><rect x="${i * 150}" y="${400 - (i % 3) * 30}" width="70" height="40" fill="#ffd43b" opacity=".25" class="twinkle" style="animation-delay:${i * 0.3}s"/>`;
      for (let i = 0; i < 30; i++) s += `<circle cx="${40 + i * 42}" cy="16" r="6" fill="${i % 2 ? '#ffd43b' : '#ff6b6b'}" class="twinkle" style="animation-delay:${(i % 6) * 0.2}s"/>`;
      return wrap(s, defs);
    },
  };

  function render(name, stage) {
    const f = SCENES[name] || SCENES.menu;
    return f(stage || 0);
  }

  HP.Scenes = { render, SCENES };
})(typeof window !== 'undefined' ? window : globalThis);
