/* 卡通頭像 SVG 產生器（黃皮膚、大圓眼、香腸鼻、凸下巴的美式卡通風）
 * HP.Avatar.svg(look, expr) → SVG 字串
 * expr: neutral | happy | smug | worried | angry | shock | sad | think
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const O = '#1a1a1a'; // 外框線
  const SW = 3.2;
  let uid = 0;

  const GEO = {
    round:  { top: 38, eyeY: 92, ex: 20, mouthY: 140, chin: 162, hw: 54, earY: 108 },
    tall:   { top: 22, eyeY: 86, ex: 19, mouthY: 140, chin: 166, hw: 48, earY: 105 },
    kid:    { top: 18, eyeY: 90, ex: 19, mouthY: 140, chin: 164, hw: 46, earY: 108 },
    chubby: { top: 48, eyeY: 96, ex: 20, mouthY: 144, chin: 168, hw: 62, earY: 112 },
    alien:  { top: 8,  eyeY: 92, ex: 24, mouthY: 142, chin: 160, hw: 62, earY: 100 },
    robot:  { top: 30, eyeY: 88, ex: 22, mouthY: 136, chin: 160, hw: 52, earY: 100 },
    octo:   { top: 20, eyeY: 88, ex: 22, mouthY: 128, chin: 150, hw: 60, earY: 100 },
  };

  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const accColor = (accs, key, def) => {
    const a = (accs || []).find((x) => x === key || x.startsWith(key + ':'));
    if (!a) return null;
    const i = a.indexOf(':');
    return i > 0 ? a.slice(i + 1) : def;
  };
  const has = (accs, key) => (accs || []).some((x) => x === key || x.startsWith(key + ':'));

  // ───────── 身體 ─────────
  function body(sh, skin) {
    const t = sh.type || 'tshirt', c = sh.color || '#4dabf7', c2 = sh.color2 || '#fff';
    const shoulders = `M22,240 Q24,190 100,186 Q176,190 178,240 Z`;
    let s = `<path d="M84,160 L84,192 L116,192 L116,160 Z" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>`;
    if (t === 'none') return '';
    if (t === 'robot') {
      return s.replace(skin, '#868e96') + `<rect x="30" y="186" width="140" height="60" rx="14" fill="${c}" stroke="${O}" stroke-width="${SW}"/>` +
        `<rect x="70" y="200" width="60" height="26" rx="5" fill="#212529" stroke="${O}" stroke-width="2"/>` +
        `<circle cx="84" cy="213" r="5" fill="${c2}"/><circle cx="100" cy="213" r="5" fill="#ffd43b"/><circle cx="116" cy="213" r="5" fill="#ff6b6b"/>`;
    }
    s += `<path d="${shoulders}" fill="${c}" stroke="${O}" stroke-width="${SW}"/>`;
    switch (t) {
      case 'suit':
        s += `<path d="M78,188 L100,240 L122,188 Z" fill="#fff" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M95,196 L105,196 L108,236 L100,242 L92,236 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M78,188 L96,226 L84,232 L66,192 Z M122,188 L104,226 L116,232 L134,192 Z" fill="${shade(c, -18)}" stroke="${O}" stroke-width="2"/>`;
        break;
      case 'tux':
        s += `<path d="M80,188 L100,240 L120,188 Z" fill="#fff" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M88,194 L100,200 L112,194 L112,206 L100,200 L88,206 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<circle cx="100" cy="216" r="2.5" fill="${O}"/><circle cx="100" cy="228" r="2.5" fill="${O}"/>`;
        break;
      case 'shirt':
        s += `<path d="M82,188 L100,204 L118,188 L112,184 L100,196 L88,184 Z" fill="${shade(c, 20)}" stroke="${O}" stroke-width="2"/>`;
        if (c2 && c2 !== c) s += `<path d="M96,204 L104,204 L107,238 L100,244 L93,238 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        else s += `<line x1="100" y1="204" x2="100" y2="240" stroke="${O}" stroke-width="2"/><circle cx="100" cy="216" r="2" fill="${O}"/><circle cx="100" cy="228" r="2" fill="${O}"/>`;
        break;
      case 'casino':
        s += `<path d="M80,188 L100,214 L120,188" fill="none" stroke="${c2}" stroke-width="5"/>`;
        s += `<path d="M60,200 L60,240 M140,200 L140,240" stroke="${c2}" stroke-width="4"/>`;
        s += `<text x="100" y="234" font-size="18" text-anchor="middle" fill="${c2}" font-weight="900">♠</text>`;
        break;
      case 'smock':
        s += `<path d="M76,188 Q100,206 124,188" fill="#fff" stroke="${O}" stroke-width="2"/>`;
        s += `<circle cx="100" cy="222" r="9" fill="#fff" stroke="${O}" stroke-width="2"/><text x="100" y="227" font-size="11" text-anchor="middle" fill="#e03131">★</text>`;
        break;
      case 'flannel':
        for (let x = 30; x < 175; x += 16) s += `<line x1="${x}" y1="190" x2="${x}" y2="240" stroke="${c2}" stroke-width="5" opacity=".6"/>`;
        for (let y = 198; y < 240; y += 14) s += `<line x1="24" y1="${y}" x2="176" y2="${y}" stroke="${c2}" stroke-width="4" opacity=".5"/>`;
        s += `<path d="${shoulders}" fill="none" stroke="${O}" stroke-width="${SW}"/>`;
        break;
      case 'vest':
        s += `<path d="M80,188 L100,240 L120,188 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M60,192 L60,240 M140,192 L140,240" stroke="${shade(c, -30)}" stroke-width="3"/>`;
        break;
      case 'cardigan':
        s += `<path d="M84,188 L100,240 L116,188 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<circle cx="92" cy="214" r="3" fill="#fff" stroke="${O}"/><circle cx="94" cy="228" r="3" fill="#fff" stroke="${O}"/>`;
        break;
      case 'hoodie':
        s += `<path d="M64,192 Q100,170 136,192 Q100,214 64,192 Z" fill="${shade(c, -20)}" stroke="${O}" stroke-width="2"/>`;
        s += `<line x1="92" y1="200" x2="90" y2="222" stroke="#fff" stroke-width="2"/><line x1="108" y1="200" x2="110" y2="222" stroke="#fff" stroke-width="2"/>`;
        break;
      case 'dress':
        s += `<path d="M70,190 L70,240 M130,190 L130,240" stroke="${shade(c, -30)}" stroke-width="3"/>`;
        break;
      case 'apron':
        s += `<path d="M70,196 L130,196 L134,240 L66,240 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<rect x="86" y="212" width="28" height="14" rx="3" fill="none" stroke="${O}" stroke-width="2"/>`;
        break;
      case 'robe':
        s += `<path d="M84,188 Q100,214 116,188" fill="none" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M40,206 Q100,232 166,196 L170,214 Q100,250 36,222 Z" fill="${c2}" stroke="${O}" stroke-width="2" opacity=".95"/>`;
        break;
      case 'kasaya':
        s += `<path d="M22,240 Q24,192 70,188 L140,240 Z" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        for (let i = 0; i < 4; i++) s += `<line x1="${40 + i * 20}" y1="${196 + i * 4}" x2="${76 + i * 20}" y2="240" stroke="${shade(c2, -30)}" stroke-width="2"/>`;
        break;
      case 'open_robe':
        s += `<path d="M64,188 Q100,176 136,188 L130,240 L70,240 Z" fill="${'#FFD521'}" stroke="${O}" stroke-width="2"/>`;
        s += `<path d="M78,226 Q100,250 122,226" fill="none" stroke="${O}" stroke-width="2"/><circle cx="100" cy="226" r="3" fill="${O}"/>`;
        s += `<path d="M64,188 L70,240 M136,188 L130,240" stroke="${c2}" stroke-width="6"/>`;
        break;
      case 'patched':
        s += `<rect x="46" y="204" width="20" height="16" fill="${c2}" stroke="${O}" stroke-width="2" transform="rotate(-8 56 212)"/>`;
        s += `<rect x="128" y="214" width="18" height="18" fill="#868e96" stroke="${O}" stroke-width="2" transform="rotate(10 137 223)"/>`;
        s += `<path d="M84,188 Q100,212 116,188" fill="none" stroke="${O}" stroke-width="2"/>`;
        break;
      case 'spacesuit':
        s += `<rect x="70" y="204" width="60" height="24" rx="5" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        s += `<circle cx="84" cy="216" r="4" fill="#ffd43b"/><circle cx="100" cy="216" r="4" fill="#ff6b6b"/><circle cx="116" cy="216" r="4" fill="#69db7c"/>`;
        s += `<path d="M72,186 Q100,198 128,186" fill="none" stroke="${O}" stroke-width="5"/>`;
        break;
      case 'cape':
        s += `<path d="M20,240 Q40,186 80,186 L100,214 L120,186 Q160,186 180,240 Z" fill="${c}" stroke="${O}" stroke-width="${SW}"/>`;
        s += `<path d="M68,186 L100,170 L132,186" fill="none" stroke="${c2}" stroke-width="7"/>`;
        s += `<circle cx="100" cy="222" r="9" fill="${c2}" stroke="${O}" stroke-width="2"/>`;
        break;
      default: // tshirt
        s += `<path d="M80,188 Q100,204 120,188" fill="none" stroke="${O}" stroke-width="2"/>`;
    }
    return s;
  }

  // ───────── 頭型 ─────────
  function headShape(type, skin) {
    const st = `fill="${skin}" stroke="${O}" stroke-width="${SW}"`;
    switch (type) {
      case 'tall': return `<path d="M52,166 L52,58 Q52,22 100,22 Q148,22 148,58 L148,166 Z" ${st}/>`;
      case 'kid': return `<path d="M54,164 L54,44 L60,18 L72,38 L80,14 L92,34 L100,10 L110,34 L120,14 L130,38 L140,18 L146,44 L146,164 Z" ${st}/>`;
      case 'chubby': return `<ellipse cx="100" cy="108" rx="62" ry="60" ${st}/>`;
      case 'alien': return `<path d="M100,8 C176,8 172,104 124,152 Q100,172 76,152 C28,104 24,8 100,8 Z" ${st}/>`;
      case 'robot': return `<rect x="48" y="30" width="104" height="130" rx="14" ${st}/><rect x="58" y="42" width="84" height="12" rx="4" fill="${shade(skin, -25)}"/>` +
        `<circle cx="60" cy="146" r="3" fill="${O}"/><circle cx="140" cy="146" r="3" fill="${O}"/>`;
      case 'octo': return `<path d="M44,140 Q30,40 100,20 Q170,40 156,140 Z" ${st}/>` +
        [50, 72, 94, 116, 138].map((x, i) => `<path d="M${x},136 q${i % 2 ? 8 : -8},40 ${i % 2 ? -6 : 10},70" fill="none" stroke="${O}" stroke-width="15" stroke-linecap="round"/><path d="M${x},136 q${i % 2 ? 8 : -8},40 ${i % 2 ? -6 : 10},70" fill="none" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`).join('') +
        `<circle cx="70" cy="56" r="6" fill="${shade(skin, 30)}"/><circle cx="130" cy="64" r="4" fill="${shade(skin, 30)}"/>`;
      default: return `<ellipse cx="100" cy="100" rx="54" ry="62" ${st}/>`;
    }
  }

  function ears(type, g, skin, accs) {
    if (['alien', 'robot', 'octo'].includes(type)) return '';
    const long = has(accs, 'long_ears');
    const y = g.earY, h = long ? 34 : 14;
    const L = 100 - g.hw, R = 100 + g.hw;
    return `<path d="M${L + 4},${y - 12} Q${L - 14},${y - 8} ${L - 8},${y + h * 0.5} Q${L - 6},${y + h} ${L + 4},${y + h * 0.8}" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>` +
      `<path d="M${R - 4},${y - 12} Q${R + 14},${y - 8} ${R + 8},${y + h * 0.5} Q${R + 6},${y + h} ${R - 4},${y + h * 0.8}" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>` +
      (long ? `<circle cx="${L - 6}" cy="${y + h - 2}" r="5" fill="${shade(skin, -20)}" stroke="${O}" stroke-width="2"/><circle cx="${R + 6}" cy="${y + h - 2}" r="5" fill="${shade(skin, -20)}" stroke="${O}" stroke-width="2"/>` : '');
  }

  // ───────── 頭髮（畫在頭的後面 back 或前面 front） ─────────
  function hair(h, g, layer) {
    if (!h || !h.style || h.style === 'none') return '';
    const c = h.color || '#333';
    const st = `fill="${c}" stroke="${O}" stroke-width="${SW}"`;
    const T = g.top;
    if (layer === 'back') {
      switch (h.style) {
        case 'long': return `<path d="M44,90 Q40,${T - 6} 100,${T - 6} Q160,${T - 6} 156,90 L162,196 Q130,206 128,170 L72,170 Q70,206 38,196 Z" ${st}/>`;
        case 'pigtails': return `<circle cx="38" cy="96" r="20" ${st}/><circle cx="162" cy="96" r="20" ${st}/>`;
        case 'ponytail': return `<path d="M140,70 Q190,80 176,150 Q164,120 146,110 Z" ${st}/>`;
        case 'big': return `<ellipse cx="100" cy="${T + 40}" rx="80" ry="66" ${st}/>`;
        case 'veil': return `<path d="M36,190 Q30,${T - 20} 100,${T - 24} Q170,${T - 20} 164,190 Z" fill="#fff" stroke="${O}" stroke-width="${SW}"/>`;
        case 'wild': return `<path d="M40,120 Q20,${T} 100,${T - 14} Q180,${T} 160,120 Q178,96 168,70 Q186,50 150,30 Q100,0 50,30 Q14,50 32,70 Q22,96 40,120 Z" ${st}/>`;
        case 'perm': return `<ellipse cx="100" cy="${T + 30}" rx="68" ry="44" ${st}/>`;
        case 'asym': return `<path d="M42,120 Q34,${T - 10} 104,${T - 10} Q166,${T} 160,80 L160,120 Z" ${st}/>`;
        default: return '';
      }
    }
    switch (h.style) {
      case 'short': return `<path d="M${100 - g.hw - 2},${T + 44} Q${100 - g.hw},${T - 6} 100,${T - 6} Q${100 + g.hw},${T - 6} ${100 + g.hw + 2},${T + 44} Q${100 + g.hw - 8},${T + 16} 100,${T + 18} Q${100 - g.hw + 8},${T + 16} ${100 - g.hw - 2},${T + 44} Z" ${st}/>`;
      case 'bob': return `<path d="M42,128 Q34,${T - 8} 100,${T - 8} Q166,${T - 8} 158,128 Q150,${T + 32} 100,${T + 26} Q50,${T + 32} 42,128 Z" ${st}/>`;
      case 'pigtails': return `<path d="M48,90 Q44,${T - 4} 100,${T - 4} Q156,${T - 4} 152,90 Q140,${T + 24} 100,${T + 22} Q60,${T + 24} 48,90 Z" ${st}/>`;
      case 'ponytail': return `<path d="M46,96 Q42,${T - 6} 100,${T - 6} Q158,${T - 6} 154,96 Q150,${T + 20} 100,${T + 20} Q50,${T + 20} 46,96 Z" ${st}/>`;
      case 'bun': return `<circle cx="100" cy="${T - 14}" r="18" ${st}/><path d="M46,96 Q42,${T - 4} 100,${T - 4} Q158,${T - 4} 154,96 Q144,${T + 22} 100,${T + 22} Q56,${T + 22} 46,96 Z" ${st}/>`;
      case 'mohawk': return `<path d="M88,${T + 6} L84,${T - 30} L96,${T - 14} L100,${T - 40} L106,${T - 14} L116,${T - 30} L112,${T + 6} Z" ${st}/>`;
      case 'combover': return `<path d="M${100 - g.hw},${T + 50} Q${100 - g.hw - 4},${T - 4} 104,${T - 6} Q${100 + g.hw + 8},${T - 2} ${100 + g.hw},${T + 50} Q${100 + g.hw - 6},${T + 14} 70,${T + 22} Z" ${st}/>`;
      case 'swoop': return `<path d="M${100 - g.hw - 6},${T + 54} Q${100 - g.hw - 14},${T - 14} 106,${T - 16} Q${100 + g.hw + 24},${T - 10} ${100 + g.hw + 4},${T + 46} Q${100 + g.hw - 10},${T + 12} 96,${T + 20} Q${100 - g.hw + 14},${T + 30} ${100 - g.hw - 6},${T + 54} Z" ${st}/>` +
        `<path d="M64,${T + 6} Q110,${T - 18} 150,${T + 14}" fill="none" stroke="${shade(c, -40)}" stroke-width="2"/>`;
      case 'slick': return `<path d="M${100 - g.hw},${T + 40} Q${100 - g.hw},${T - 6} 100,${T - 6} Q${100 + g.hw},${T - 6} ${100 + g.hw},${T + 40} Q${100 + g.hw - 6},${T + 10} 100,${T + 8} Q${100 - g.hw + 6},${T + 10} ${100 - g.hw},${T + 40} Z" ${st}/>` +
        `<path d="M70,${T + 4} Q100,${T - 4} 132,${T + 4}" fill="none" stroke="${shade(c, 50)}" stroke-width="2"/>`;
      case 'bald2': return `<path d="M92,${T + 2} Q94,${T - 16} 102,${T}" fill="none" stroke="${O}" stroke-width="2.4"/><path d="M100,${T + 2} Q106,${T - 18} 112,${T + 2}" fill="none" stroke="${O}" stroke-width="2.4"/>` +
        `<path d="M${100 - g.hw + 2},${g.earY - 18} l6,-6 l4,8 l6,-8 l4,8" fill="none" stroke="${O}" stroke-width="2.4"/><path d="M${100 + g.hw - 2},${g.earY - 18} l-6,-6 l-4,8 l-6,-8 l-4,8" fill="none" stroke="${O}" stroke-width="2.4"/>`;
      case 'asym': return `<path d="M44,96 Q40,${T - 8} 104,${T - 8} Q150,${T - 4} 156,70 Q120,${T + 30} 70,${T + 40} Q52,${T + 46} 44,96 Z" ${st}/>`;
      case 'big': return `<path d="M44,100 Q40,${T - 10} 100,${T - 10} Q160,${T - 10} 156,100 Q140,${T + 24} 100,${T + 18} Q60,${T + 24} 44,100 Z" ${st}/>`;
      case 'beanie': return `<path d="M${100 - g.hw - 4},${T + 40} Q${100 - g.hw},${T - 18} 100,${T - 18} Q${100 + g.hw},${T - 18} ${100 + g.hw + 4},${T + 40} Z" ${st}/>` +
        `<rect x="${100 - g.hw - 6}" y="${T + 28}" width="${g.hw * 2 + 12}" height="16" rx="6" fill="${shade(c, -30)}" stroke="${O}" stroke-width="${SW}"/><circle cx="100" cy="${T - 20}" r="9" fill="#fff" stroke="${O}" stroke-width="2"/>`;
      case 'tower': return `<path d="M58,${T + 30} Q50,-58 100,-60 Q150,-58 142,${T + 30} Q100,${T + 44} 58,${T + 30} Z" ${st}/>` +
        `<path d="M76,-20 Q90,-30 84,-44 M110,0 Q126,-10 118,-26 M90,20 Q104,10 98,-4" fill="none" stroke="${shade(c, -40)}" stroke-width="2.5"/>`;
      case 'long': return `<path d="M50,96 Q48,${T - 4} 100,${T - 4} Q152,${T - 4} 150,96 Q142,${T + 18} 104,${T + 10} L100,${T + 2} L96,${T + 10} Q58,${T + 18} 50,96 Z" ${st}/>`;
      case 'wild': return `<path d="M54,80 Q60,${T - 4} 100,${T - 6} Q140,${T - 4} 146,80 Q130,${T + 20} 100,${T + 16} Q70,${T + 20} 54,80 Z" ${st}/>`;
      case 'ushnisha': {
        let s = `<ellipse cx="100" cy="${T + 2}" rx="30" ry="22" ${st}/>`;
        s += `<path d="M46,96 Q42,${T + 4} 100,${T + 4} Q158,${T + 4} 154,96 Q140,${T + 30} 100,${T + 28} Q60,${T + 30} 46,96 Z" ${st}/>`;
        for (let r = 0; r < 3; r++) for (let i = 0; i < 7 - r * 2; i++) {
          const x = 58 + r * 14 + i * 14, y = T + 22 - r * 14;
          s += `<circle cx="${x}" cy="${y}" r="5.5" fill="${shade(c, 25)}" stroke="${O}" stroke-width="1.5"/>`;
        }
        return s;
      }
      case 'veil': return `<path d="M50,96 Q48,${T - 8} 100,${T - 10} Q152,${T - 8} 150,96 Q140,${T + 14} 100,${T + 12} Q60,${T + 14} 50,96 Z" fill="#fff" stroke="${O}" stroke-width="${SW}"/>` +
        `<path d="M70,${T + 4} Q100,${T - 26} 130,${T + 4}" fill="#1c3d7a" stroke="${O}" stroke-width="2"/><circle cx="100" cy="${T - 8}" r="6" fill="#e03131" stroke="${O}" stroke-width="1.5"/>`;
      case 'curly': {
        let s = '';
        for (let i = 0; i < 6; i++) s += `<circle cx="${62 + i * 15}" cy="${T + 6 + (i % 2) * 4}" r="11" ${st}/>`;
        return s;
      }
      case 'perm': {
        let s = '';
        for (let i = 0; i < 7; i++) s += `<circle cx="${52 + i * 16}" cy="${T + 10 + (i % 2) * 6}" r="12" ${st}/>`;
        return s;
      }
      default: return '';
    }
  }

  // ───────── 眼睛 ─────────
  function eyes(g, type, expr, skin, id, accs) {
    const ey = g.eyeY, L = 100 - g.ex, R = 100 + g.ex;
    if (type === 'alien') {
      const tilt = expr === 'angry' ? 14 : expr === 'sad' || expr === 'worried' ? -14 : 0;
      const shine = expr === 'happy' || expr === 'smug';
      return [[L - 4, 1], [R + 4, -1]].map(([x, d]) =>
        `<ellipse cx="${x}" cy="${ey}" rx="18" ry="${expr === 'smug' ? 9 : 13}" fill="#111" transform="rotate(${(-28 + tilt) * d} ${x} ${ey})"/>` +
        `<circle cx="${x - 5}" cy="${ey - 4}" r="${shine ? 5 : 3}" fill="#fff"/>`).join('');
    }
    if (type === 'robot') {
      const col = expr === 'angry' ? '#ff6b6b' : expr === 'happy' ? '#69db7c' : '#4dabf7';
      if (expr === 'happy') return `<path d="M${L - 14},${ey + 4} Q${L},${ey - 14} ${L + 14},${ey + 4} M${R - 14},${ey + 4} Q${R},${ey - 14} ${R + 14},${ey + 4}" fill="none" stroke="${col}" stroke-width="6"/>`;
      return `<rect x="${L - 16}" y="${ey - 10}" width="32" height="20" rx="4" fill="#111"/><rect x="${R - 16}" y="${ey - 10}" width="32" height="20" rx="4" fill="#111"/>` +
        `<rect x="${L - 10}" y="${ey - (expr === 'smug' ? 2 : 6)}" width="20" height="${expr === 'smug' ? 4 : 12}" fill="${col}"/><rect x="${R - 10}" y="${ey - (expr === 'smug' ? 2 : 6)}" width="20" height="${expr === 'smug' ? 4 : 12}" fill="${col}"/>`;
    }
    const r = type === 'octo' ? 15 : 17;
    let pdx = 0, pdy = 0, pr = 3.8;
    if (expr === 'think') { pdx = -5; pdy = -6; }
    if (expr === 'smug') { pdx = 5; pdy = 1; }
    if (expr === 'worried' || expr === 'sad') pdy = 4;
    if (expr === 'shock') pr = 2.4;
    if (has(accs, 'sunglasses')) {
      return `<path d="M${L - 22},${ey - 10} L${R + 22},${ey - 10} L${R + 18},${ey + 10} Q${R},${ey + 18} ${R - 14},${ey + 6} L${L + 14},${ey + 6} Q${L},${ey + 18} ${L - 18},${ey + 10} Z" fill="#111" stroke="${O}" stroke-width="2"/>` +
        `<path d="M${L - 12},${ey - 4} L${L - 2},${ey - 4}" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    }
    let s = '';
    [[L, 1], [R, -1]].forEach(([x, side], k) => {
      const cid = `e${id}_${k}`;
      s += `<clipPath id="${cid}"><circle cx="${x}" cy="${ey}" r="${r}"/></clipPath>`;
      s += `<circle cx="${x}" cy="${ey}" r="${r}" fill="#fff"/>`;
      if (expr === 'happy') {
        s += `<circle cx="${x + pdx}" cy="${ey + pdy - 2}" r="${pr}" fill="${O}"/>`;
        s += `<rect x="${x - r}" y="${ey + 5}" width="${r * 2}" height="${r}" fill="${skin}" clip-path="url(#${cid})"/>`;
        s += `<path d="M${x - r + 2},${ey + 5} Q${x},${ey + 1} ${x + r - 2},${ey + 5}" fill="none" stroke="${O}" stroke-width="2"/>`;
      } else {
        s += `<circle cx="${x + pdx}" cy="${ey + pdy}" r="${pr}" fill="${O}"/>`;
      }
      // 眼皮：用多邊形 + clip 做出斜角
      let lid = null;
      const inner = side === 1 ? 1 : -1; // 內眼角方向
      if (expr === 'smug') lid = [-r, -1, r, -1];
      if (expr === 'angry') lid = inner === 1 ? [-r, -9, r, 2] : [-r, 2, r, -9];
      if (expr === 'sad') lid = inner === 1 ? [-r, 0, r, -10] : [-r, -10, r, 0];
      if (expr === 'worried') lid = inner === 1 ? [-r, -6, r, -14] : [-r, -14, r, -6];
      if (lid) {
        s += `<polygon points="${x - r - 2},${ey - r - 2} ${x + r + 2},${ey - r - 2} ${x + r + 2},${ey + lid[3]} ${x - r - 2},${ey + lid[1]}" fill="${skin}" clip-path="url(#${cid})"/>`;
        s += `<line x1="${x + lid[0]}" y1="${ey + lid[1]}" x2="${x + lid[2]}" y2="${ey + lid[3]}" stroke="${O}" stroke-width="2.4" clip-path="url(#${cid})"/>`;
      }
      s += `<circle cx="${x}" cy="${ey}" r="${r}" fill="none" stroke="${O}" stroke-width="${SW}"/>`;
    });
    // 眉毛
    const by = ey - r - 8;
    const brow = (x1, y1, x2, y2) => `<path d="M${x1},${y1} L${x2},${y2}" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>`;
    if (expr === 'angry') s += brow(L - 14, by - 4, L + 12, by + 6) + brow(R + 14, by - 4, R - 12, by + 6);
    if (expr === 'worried' || expr === 'sad') s += brow(L - 12, by + 4, L + 12, by - 4) + brow(R + 12, by + 4, R - 12, by - 4);
    if (expr === 'smug') s += brow(R - 12, by - 6, R + 12, by - 2);
    if (expr === 'shock') s += `<path d="M${L - 12},${by - 2} Q${L},${by - 12} ${L + 12},${by - 2} M${R - 12},${by - 2} Q${R},${by - 12} ${R + 12},${by - 2}" fill="none" stroke="${O}" stroke-width="3"/>`;
    return s;
  }

  // ───────── 嘴巴與下巴 ─────────
  function muzzle(type, g, skin, stubble) {
    if (['alien', 'robot', 'octo'].includes(type)) return '';
    const y = g.mouthY, w = type === 'chubby' ? 40 : 36;
    const fill = stubble ? '#d9b26a' : skin;
    return `<path d="M${100 - w},${y - 14} Q${100 - w - 4},${g.chin + 4} 100,${g.chin + 6} Q${100 + w + 4},${g.chin + 4} ${100 + w},${y - 14} Q100,${y - 22} ${100 - w},${y - 14} Z" fill="${fill}" stroke="${O}" stroke-width="${SW}"/>`;
  }

  function nose(type, g, skin) {
    if (type === 'alien') return `<circle cx="96" cy="${g.eyeY + 26}" r="2" fill="${O}"/><circle cx="104" cy="${g.eyeY + 26}" r="2" fill="${O}"/>`;
    if (type === 'robot') return `<rect x="96" y="${g.eyeY + 14}" width="8" height="18" rx="3" fill="${shade(skin, -25)}" stroke="${O}" stroke-width="2"/>`;
    if (type === 'octo') return '';
    const y = g.eyeY + 4;
    return `<path d="M96,${y} Q90,${y + 30} 100,${y + 34} Q114,${y + 34} 108,${y + 22} L104,${y}" fill="${skin}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  }

  function mouth(g, expr, type) {
    const y = g.mouthY, x = 100;
    if (type === 'robot') {
      const pts = expr === 'happy' ? `M80,${y - 4} L90,${y + 4} L100,${y - 4} L110,${y + 4} L120,${y - 4}` : expr === 'sad' || expr === 'angry' ? `M80,${y + 4} L120,${y + 4}` : `M80,${y} L120,${y}`;
      return `<rect x="74" y="${y - 10}" width="52" height="20" rx="4" fill="#111"/><path d="${pts}" fill="none" stroke="#4dabf7" stroke-width="3"/>`;
    }
    const D = '#7a1f1f';
    switch (expr) {
      case 'happy': return `<path d="M${x - 24},${y - 6} Q${x},${y + 26} ${x + 24},${y - 6} Z" fill="${D}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/><path d="M${x - 20},${y - 4} L${x + 20},${y - 4} L${x + 16},${y + 2} L${x - 16},${y + 2} Z" fill="#fff"/><path d="M${x - 10},${y + 12} Q${x},${y + 6} ${x + 10},${y + 12}" fill="#ff8787"/>`;
      case 'smug': return `<path d="M${x - 18},${y + 4} Q${x + 4},${y + 10} ${x + 22},${y - 6}" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linecap="round"/>`;
      case 'worried': return `<path d="M${x - 18},${y + 4} Q${x - 10},${y - 4} ${x - 2},${y + 4} Q${x + 6},${y + 12} ${x + 16},${y + 2}" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linecap="round"/>`;
      case 'angry': return `<path d="M${x - 20},${y + 8} Q${x},${y - 6} ${x + 20},${y + 8} Z" fill="${D}" stroke="${O}" stroke-width="${SW}"/><path d="M${x - 16},${y + 5} L${x + 16},${y + 5}" stroke="#fff" stroke-width="3"/>`;
      case 'shock': return `<ellipse cx="${x}" cy="${y + 4}" rx="9" ry="12" fill="${D}" stroke="${O}" stroke-width="${SW}"/>`;
      case 'sad': return `<path d="M${x - 18},${y + 8} Q${x},${y - 6} ${x + 18},${y + 8}" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linecap="round"/>`;
      case 'think': return `<path d="M${x - 10},${y + 4} L${x + 14},${y + 1}" stroke="${O}" stroke-width="${SW}" stroke-linecap="round"/>`;
      default: return `<path d="M${x - 18},${y + 2} Q${x},${y + 8} ${x + 18},${y + 2}" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linecap="round"/>`;
    }
  }

  // ───────── 配件 ─────────
  function accessories(accs, g, type, layer, skin) {
    let s = '';
    const T = g.top, ey = g.eyeY, L = 100 - g.ex, R = 100 + g.ex;
    for (const a of accs || []) {
      const [k, col] = a.split(':');
      if (layer === 'back') {
        if (k === 'aura') s += `<circle cx="100" cy="95" r="98" fill="url(#auraGrad)" opacity=".85"/><circle cx="100" cy="95" r="86" fill="none" stroke="#ffd43b" stroke-width="4" stroke-dasharray="6 8"/>`;
        if (k === 'wings') s += `<path d="M40,190 Q-10,150 6,110 Q30,140 60,160 Z M160,190 Q210,150 194,110 Q170,140 140,160 Z" fill="#fff" stroke="${O}" stroke-width="2.5"/>`;
        if (k === 'staff') s += `<path d="M184,240 L176,40 Q170,20 186,18" fill="none" stroke="#7a4b22" stroke-width="8" stroke-linecap="round"/>`;
        continue;
      }
      switch (k) {
        case 'glasses':
          s += `<circle cx="${L}" cy="${ey}" r="19" fill="none" stroke="${O}" stroke-width="3.5"/><circle cx="${R}" cy="${ey}" r="19" fill="none" stroke="${O}" stroke-width="3.5"/><line x1="${L + 19}" y1="${ey}" x2="${R - 19}" y2="${ey}" stroke="${O}" stroke-width="3"/>`; break;
        case 'monocle': s += `<circle cx="${R}" cy="${ey}" r="19" fill="none" stroke="#ffd43b" stroke-width="4"/><path d="M${R + 18},${ey + 6} Q${R + 30},${ey + 40} ${R + 10},${ey + 70}" fill="none" stroke="#ffd43b" stroke-width="2"/>`; break;
        case 'sunglasses_top': s += `<rect x="${L - 18}" y="${T + 6}" width="32" height="12" rx="5" fill="#111"/><rect x="${R - 14}" y="${T + 6}" width="32" height="12" rx="5" fill="#111"/>`; break;
        case 'halo': s += `<ellipse cx="100" cy="${Math.min(T, 30) - 24}" rx="40" ry="9" fill="none" stroke="#ffd43b" stroke-width="7"/><ellipse cx="100" cy="${Math.min(T, 30) - 24}" rx="40" ry="9" fill="none" stroke="#fff3bf" stroke-width="2"/>`; break;
        case 'crown': s += `<path d="M62,${T + 8} L62,${T - 30} L78,${T - 12} L100,${T - 40} L122,${T - 12} L138,${T - 30} L138,${T + 8} Z" fill="#ffd43b" stroke="${O}" stroke-width="${SW}"/><circle cx="100" cy="${T - 6}" r="6" fill="#e03131" stroke="${O}" stroke-width="1.5"/>`; break;
        case 'tiara': s += `<path d="M74,${T + 8} L82,${T - 6} L92,${T + 2} L100,${T - 12} L108,${T + 2} L118,${T - 6} L126,${T + 8}" fill="#fff3bf" stroke="${O}" stroke-width="2"/><circle cx="100" cy="${T - 4}" r="3" fill="#f06595"/>`; break;
        case 'bow': s += `<path d="M120,${T + 4} l18,-12 l0,24 Z M120,${T + 4} l-18,-12 l0,24 Z" fill="#f03e3e" stroke="${O}" stroke-width="2"/><circle cx="120" cy="${T + 4}" r="5" fill="#c92a2a" stroke="${O}" stroke-width="2"/>`; break;
        case 'kinder_hat': s += `<ellipse cx="100" cy="${T + 14}" rx="${g.hw + 14}" ry="11" fill="#ffd43b" stroke="${O}" stroke-width="${SW}"/><path d="M${100 - g.hw + 6},${T + 12} Q${100 - g.hw + 6},${T - 30} 100,${T - 30} Q${100 + g.hw - 6},${T - 30} ${100 + g.hw - 6},${T + 12} Z" fill="#ffd43b" stroke="${O}" stroke-width="${SW}"/><path d="M${100 - g.hw + 8},${T + 2} L${100 + g.hw - 8},${T + 2}" stroke="#e03131" stroke-width="5"/>`; break;
        case 'trucker_cap': s += `<path d="M${100 - g.hw - 2},${T + 30} Q${100 - g.hw},${T - 16} 100,${T - 16} Q${100 + g.hw},${T - 16} ${100 + g.hw + 2},${T + 30} Z" fill="#1971c2" stroke="${O}" stroke-width="${SW}"/><path d="M${100 - g.hw},${T + 28} L${100 + g.hw + 36},${T + 30} L${100 + g.hw},${T + 38} Z" fill="#1864ab" stroke="${O}" stroke-width="2.5"/><rect x="80" y="${T - 6}" width="40" height="22" rx="3" fill="#fff" stroke="${O}" stroke-width="2"/><text x="100" y="${T + 10}" font-size="12" text-anchor="middle" font-weight="900" fill="#c92a2a">66</text>`; break;
        case 'hat_cowboy': s += `<ellipse cx="100" cy="${T + 18}" rx="78" ry="14" fill="#8d5524" stroke="${O}" stroke-width="${SW}"/><path d="M62,${T + 16} Q60,${T - 34} 84,${T - 30} Q100,${T - 18} 116,${T - 30} Q140,${T - 34} 138,${T + 16} Z" fill="#a0663a" stroke="${O}" stroke-width="${SW}"/><path d="M63,${T + 6} L137,${T + 6}" stroke="#4d3319" stroke-width="6"/>`; break;
        case 'tophat': s += `<ellipse cx="100" cy="${T + 10}" rx="62" ry="10" fill="#111" stroke="${O}" stroke-width="2"/><rect x="66" y="${T - 56}" width="68" height="66" rx="4" fill="#111"/><rect x="66" y="${T - 4}" width="68" height="9" fill="#c92a2a"/>`; break;
        case 'fedora': s += `<ellipse cx="100" cy="${T + 16}" rx="72" ry="12" fill="#343a40" stroke="${O}" stroke-width="${SW}"/><path d="M64,${T + 14} Q62,${T - 34} 100,${T - 26} Q138,${T - 34} 136,${T + 14} Z" fill="#495057" stroke="${O}" stroke-width="${SW}"/><path d="M65,${T + 4} L135,${T + 4}" stroke="#111" stroke-width="7"/>`; break;
        case 'jigong_hat': s += `<path d="M58,${T + 26} L70,${T - 34} L132,${T - 34} L142,${T + 26} Z" fill="#8a6d3b" stroke="${O}" stroke-width="${SW}"/><path d="M66,${T + 4} L136,${T + 4}" stroke="#5c4a2a" stroke-width="3"/><text x="100" y="${T - 4}" font-size="22" text-anchor="middle" font-weight="900" fill="#ffd43b" stroke="${O}" stroke-width=".8">佛</text><path d="M128,${T - 30} l10,-10 l-2,12" fill="#8a6d3b" stroke="${O}" stroke-width="2"/>`; break;
        case 'helmet_white': s += `<path d="M${100 - g.hw - 4},${T + 30} Q${100 - g.hw - 4},${T - 20} 100,${T - 20} Q${100 + g.hw + 4},${T - 20} ${100 + g.hw + 4},${T + 30} Z" fill="#fff" stroke="${O}" stroke-width="${SW}"/><text x="100" y="${T + 18}" font-size="20" text-anchor="middle" font-weight="900" fill="#111">MP</text>`; break;
        case 'helmet_glass': s += `<circle cx="100" cy="100" r="86" fill="#a5d8ff" fill-opacity=".25" stroke="${O}" stroke-width="${SW}"/><path d="M50,60 Q70,30 100,26" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>`; break;
        case 'antenna': s += `<path d="M84,${T + 6} Q70,${T - 30} 60,${T - 40} M116,${T + 6} Q130,${T - 30} 140,${T - 40}" fill="none" stroke="${O}" stroke-width="3"/><circle cx="60" cy="${T - 40}" r="7" fill="#ffd43b" stroke="${O}" stroke-width="2"/><circle cx="140" cy="${T - 40}" r="7" fill="#ffd43b" stroke="${O}" stroke-width="2"/>`; break;
        case 'antenna_bulb': s += `<line x1="100" y1="${T}" x2="100" y2="${T - 30}" stroke="${O}" stroke-width="4"/><circle cx="100" cy="${T - 36}" r="9" fill="#ff6b6b" stroke="${O}" stroke-width="2"/>`; break;
        case 'third_eye': s += `<ellipse cx="100" cy="${ey - 34}" rx="10" ry="7" fill="#fff" stroke="${O}" stroke-width="2"/><circle cx="100" cy="${ey - 34}" r="3.5" fill="#e03131"/>`; break;
        case 'urna': s += `<circle cx="100" cy="${ey - 22}" r="3.5" fill="#e03131"/>`; break;
        case 'monk_dots': for (let i = 0; i < 6; i++) s += `<circle cx="${84 + (i % 3) * 16}" cy="${T + 12 + Math.floor(i / 3) * 12}" r="2.5" fill="#c08552"/>`; break;
        case 'blush': s += `<ellipse cx="${L - 10}" cy="${ey + 26}" rx="10" ry="6" fill="#ff8787" opacity=".6"/><ellipse cx="${R + 10}" cy="${ey + 26}" rx="10" ry="6" fill="#ff8787" opacity=".6"/>`; break;
        case 'bandaid': s += `<rect x="${R}" y="${ey + 20}" width="22" height="9" rx="4" fill="#ffc9c9" stroke="${O}" stroke-width="1.8" transform="rotate(-20 ${R + 11} ${ey + 24})"/>`; break;
        case 'crumbs': s += `<circle cx="84" cy="${g.mouthY + 16}" r="2.5" fill="#a0663a"/><circle cx="114" cy="${g.mouthY + 20}" r="2" fill="#a0663a"/><circle cx="100" cy="${g.mouthY + 24}" r="2.2" fill="#a0663a"/>`; break;
        case 'earrings': s += `<circle cx="${100 - g.hw - 4}" cy="${g.earY + 18}" r="5" fill="#ffd43b" stroke="${O}" stroke-width="1.5"/><circle cx="${100 + g.hw + 4}" cy="${g.earY + 18}" r="5" fill="#ffd43b" stroke="${O}" stroke-width="1.5"/>`; break;
        case 'lipstick': break; // 由嘴巴顏色處理即可
        case 'mustache': s += `<path d="M76,${g.mouthY - 6} Q88,${g.mouthY - 18} 100,${g.mouthY - 8} Q112,${g.mouthY - 18} 124,${g.mouthY - 6} Q112,${g.mouthY - 2} 100,${g.mouthY - 4} Q88,${g.mouthY - 2} 76,${g.mouthY - 6} Z" fill="${col || '#333'}" stroke="${O}" stroke-width="2"/>`; break;
        case 'beard': s += `<path d="M${100 - g.hw + 6},${g.mouthY - 20} Q${100 - g.hw + 2},${g.chin + 20} 100,${g.chin + 22} Q${100 + g.hw - 2},${g.chin + 20} ${100 + g.hw - 6},${g.mouthY - 20} Q${100 + 26},${g.mouthY + 16} 100,${g.mouthY + 16} Q${100 - 26},${g.mouthY + 16} ${100 - g.hw + 6},${g.mouthY - 20} Z" fill="${col || '#555'}" stroke="${O}" stroke-width="2.4"/>`; break;
        case 'longbeard': s += `<path d="M${100 - g.hw + 4},${g.mouthY - 22} Q${100 - g.hw},${g.chin + 50} 100,${g.chin + 74} Q${100 + g.hw},${g.chin + 50} ${100 + g.hw - 4},${g.mouthY - 22} Q${126},${g.mouthY + 16} 100,${g.mouthY + 16} Q74,${g.mouthY + 16} ${100 - g.hw + 4},${g.mouthY - 22} Z" fill="${col || '#eee'}" stroke="${O}" stroke-width="2.4"/>` +
          `<path d="M86,${g.chin + 10} Q90,${g.chin + 40} 96,${g.chin + 56} M112,${g.chin + 10} Q110,${g.chin + 40} 104,${g.chin + 56}" fill="none" stroke="${shade(col || '#eeeeee', -40)}" stroke-width="1.5"/>`; break;
        case 'toothpick': s += `<line x1="112" y1="${g.mouthY + 2}" x2="138" y2="${g.mouthY - 6}" stroke="#c08552" stroke-width="3"/>`; break;
        case 'cigar': s += `<rect x="112" y="${g.mouthY - 2}" width="34" height="9" rx="3" fill="#6b4f2a" stroke="${O}" stroke-width="2" transform="rotate(-8 112 ${g.mouthY})"/><circle cx="148" cy="${g.mouthY - 8}" r="3" fill="#ff922b"/>`; break;
        case 'flag_pin': s += `<rect x="128" y="200" width="14" height="10" fill="#e03131" stroke="${O}" stroke-width="1"/><rect x="128" y="200" width="7" height="5" fill="#1c3d7a"/>`; break;
        case 'pearl': for (let i = 0; i < 9; i++) s += `<circle cx="${72 + i * 7}" cy="${190 + Math.sin(i / 8 * Math.PI) * 10}" r="4" fill="#fff" stroke="${O}" stroke-width="1"/>`; break;
        case 'gold_chain': s += `<path d="M76,190 Q100,222 124,190" fill="none" stroke="#ffd43b" stroke-width="5" stroke-dasharray="4 2"/>`; break;
        case 'cross_necklace': s += `<path d="M84,190 Q100,206 116,190" fill="none" stroke="#ffd43b" stroke-width="2"/><path d="M100,204 v16 M94,210 h12" stroke="#ffd43b" stroke-width="3"/>`; break;
        case 'beads': for (let i = 0; i < 11; i++) s += `<circle cx="${66 + i * 6.8}" cy="${190 + Math.sin(i / 10 * Math.PI) * 22}" r="5" fill="#8d5524" stroke="${O}" stroke-width="1"/>`; break;
        case 'lanyard': s += `<path d="M84,190 L96,232 M116,190 L104,232" stroke="#1971c2" stroke-width="3"/><rect x="90" y="228" width="20" height="14" rx="2" fill="#fff" stroke="${O}" stroke-width="1.5"/>`; break;
        case 'earpiece': s += `<path d="M${100 + g.hw + 6},${g.earY} Q${100 + g.hw + 14},${g.earY + 40} ${100 + g.hw - 4},${g.chin + 20}" fill="none" stroke="#adb5bd" stroke-width="2"/>`; break;
        case 'long_tie': s += `<path d="M96,196 L104,196 L110,248 L100,256 L90,248 Z" fill="${col || '#e03131'}" stroke="${O}" stroke-width="2"/>`; break;
        case 'tattoo': s += `<text x="58" y="232" font-size="14" fill="#1864ab" font-weight="900">✠</text>`; break;
        case 'rose': s += `<circle cx="130" cy="206" r="6" fill="#e03131" stroke="${O}" stroke-width="1.5"/><path d="M130,212 l-4,10" stroke="#2b8a3e" stroke-width="2"/>`; break;
        case 'keys': s += `<circle cx="150" cy="214" r="7" fill="none" stroke="#ffd43b" stroke-width="3"/><path d="M150,221 v16 h6 M150,230 h5" stroke="#ffd43b" stroke-width="3" fill="none"/>`; break;
        case 'vase': s += `<path d="M150,236 Q140,214 148,204 L146,196 L156,196 L154,204 Q164,214 154,236 Z" fill="#e7f5ff" stroke="${O}" stroke-width="2"/><path d="M151,196 Q146,180 156,172" fill="none" stroke="#2b8a3e" stroke-width="2"/>`; break;
        case 'fan': s += `<path d="M150,240 L176,196 Q190,214 182,236 Z" fill="#e9ecef" stroke="${O}" stroke-width="2"/><path d="M150,240 L184,214" stroke="${O}" stroke-width="1"/>`; break;
        case 'gourd': s += `<circle cx="36" cy="222" r="10" fill="#e8590c" stroke="${O}" stroke-width="2"/><circle cx="36" cy="206" r="7" fill="#e8590c" stroke="${O}" stroke-width="2"/>`; break;
        case 'donut': s += `<circle cx="158" cy="226" r="16" fill="#f783ac" stroke="${O}" stroke-width="2.5"/><circle cx="158" cy="226" r="5" fill="#c08552" stroke="${O}" stroke-width="2"/><path d="M148,220 l3,2 M162,216 l2,3 M166,230 l-3,2" stroke="#fff" stroke-width="2"/>`; break;
        case 'slingshot': s += `<path d="M38,240 L38,218 L28,200 M38,218 L48,200" fill="none" stroke="#8d5524" stroke-width="4"/>`; break;
        default: break;
      }
    }
    return s;
  }

  // ───────── 特殊動物／物件頭（背景角色） ─────────
  function special(type, skin, expr) {
    const happy = expr === 'happy';
    const eyes = (x1, x2, y) => `<circle cx="${x1}" cy="${y}" r="7" fill="#fff" stroke="${O}" stroke-width="2.5"/><circle cx="${x2}" cy="${y}" r="7" fill="#fff" stroke="${O}" stroke-width="2.5"/><circle cx="${x1 + 1}" cy="${y + 1}" r="3" fill="${O}"/><circle cx="${x2 + 1}" cy="${y + 1}" r="3" fill="${O}"/>`;
    switch (type) {
      case 'dog': return `<ellipse cx="100" cy="190" rx="58" ry="44" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><path d="M44,70 Q20,120 50,150 L66,96 Z M156,70 Q180,120 150,150 L134,96 Z" fill="${shade(skin, -40)}" stroke="${O}" stroke-width="${SW}"/>` +
        `<ellipse cx="100" cy="110" rx="56" ry="50" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><ellipse cx="100" cy="130" rx="28" ry="20" fill="#fff4e6" stroke="${O}" stroke-width="2.5"/><ellipse cx="100" cy="118" rx="10" ry="7" fill="${O}"/>` + eyes(80, 120, 96) +
        `<path d="M100,126 v8 M88,138 Q100,${happy ? 150 : 142} 112,138" fill="none" stroke="${O}" stroke-width="2.5"/>${happy ? '<path d="M96,140 q4,14 8,0" fill="#ff8787" stroke="#1a1a1a" stroke-width="2"/>' : ''}`;
      case 'cat': return `<ellipse cx="100" cy="190" rx="54" ry="44" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><path d="M54,82 L60,30 L92,64 Z M146,82 L140,30 L108,64 Z" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>` +
        `<ellipse cx="100" cy="106" rx="54" ry="46" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><path d="M70,74 l8,10 M100,64 v12 M130,74 l-8,10" stroke="${shade(skin, -50)}" stroke-width="4"/>` + eyes(80, 120, 100) +
        `<path d="M96,118 L104,118 L100,124 Z" fill="#ff8787" stroke="${O}" stroke-width="1.5"/><path d="M100,124 q-8,8 -14,2 M100,124 q8,8 14,2 M60,118 h-24 M60,126 l-22,6 M140,118 h24 M140,126 l22,6" fill="none" stroke="${O}" stroke-width="2"/>`;
      case 'sheep': return `<ellipse cx="100" cy="170" rx="70" ry="50" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>` + [60, 84, 108, 132].map((x) => `<circle cx="${x + 4}" cy="134" r="18" fill="${skin}" stroke="${O}" stroke-width="2.5"/>`).join('') +
        `<ellipse cx="100" cy="110" rx="32" ry="38" fill="#343a40" stroke="${O}" stroke-width="${SW}"/>` + eyes(88, 112, 102) + `<path d="M92,128 q8,6 16,0" fill="none" stroke="#fff" stroke-width="2"/>`;
      case 'monkey': return `<ellipse cx="100" cy="196" rx="50" ry="40" fill="#e8590c" stroke="${O}" stroke-width="${SW}"/><circle cx="46" cy="104" r="18" fill="#ffd8a8" stroke="${O}" stroke-width="${SW}"/><circle cx="154" cy="104" r="18" fill="#ffd8a8" stroke="${O}" stroke-width="${SW}"/>` +
        `<ellipse cx="100" cy="100" rx="56" ry="58" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><path d="M60,104 Q60,72 100,80 Q140,72 140,104 Q140,150 100,150 Q60,150 60,104 Z" fill="#ffd8a8" stroke="${O}" stroke-width="2.5"/>` +
        `<path d="M50,64 Q100,36 150,64" fill="none" stroke="#ffd43b" stroke-width="8"/><circle cx="100" cy="46" r="5" fill="#ffd43b"/>` + eyes(84, 116, 100) + `<path d="M84,128 Q100,${happy ? 146 : 136} 116,128" fill="${happy ? '#7a1f1f' : 'none'}" stroke="${O}" stroke-width="2.5"/>`;
      case 'pig': return `<ellipse cx="100" cy="196" rx="60" ry="42" fill="#5c7cfa" stroke="${O}" stroke-width="${SW}"/><path d="M50,60 L46,30 L76,50 Z M150,60 L154,30 L124,50 Z" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>` +
        `<ellipse cx="100" cy="106" rx="62" ry="56" fill="${skin}" stroke="${O}" stroke-width="${SW}"/><ellipse cx="100" cy="122" rx="22" ry="15" fill="${shade(skin, -25)}" stroke="${O}" stroke-width="2.5"/><circle cx="93" cy="122" r="3.5" fill="${O}"/><circle cx="107" cy="122" r="3.5" fill="${O}"/>` + eyes(80, 120, 94) +
        `<path d="M80,146 Q100,${happy ? 160 : 152} 120,146" fill="none" stroke="${O}" stroke-width="2.5"/>`;
      case 'ufo': return `<ellipse cx="100" cy="140" rx="90" ry="26" fill="#adb5bd" stroke="${O}" stroke-width="${SW}"/><path d="M50,134 Q50,64 100,64 Q150,64 150,134 Z" fill="#a5d8ff" fill-opacity=".7" stroke="${O}" stroke-width="${SW}"/>` +
        `<ellipse cx="100" cy="110" rx="18" ry="22" fill="${skin}" stroke="${O}" stroke-width="2"/><ellipse cx="93" cy="106" rx="5" ry="7" fill="#111"/><ellipse cx="107" cy="106" rx="5" ry="7" fill="#111"/>` +
        [30, 65, 100, 135, 170].map((x) => `<circle cx="${x}" cy="146" r="5" fill="#ffd43b" stroke="${O}" stroke-width="1.5"/>`).join('');
      default: return null;
    }
  }

  function svg(look, expr = 'neutral', opts = {}) {
    look = look || {};
    const type = look.head || 'round';
    const skin = look.skin || '#FFD521';
    const id = ++uid;
    const accs = look.acc || [];
    const vb = opts.viewBox || '0 -60 200 300';
    const defs = `<defs><radialGradient id="auraGrad"><stop offset="0" stop-color="#fff3bf" stop-opacity=".9"/><stop offset="1" stop-color="#ffd43b" stop-opacity="0"/></radialGradient></defs>`;
    const sp = special(type, skin, expr);
    if (sp) return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">${defs}${sp}</svg>`;
    const g = GEO[type] || GEO.round;
    let s = defs;
    s += accessories(accs, g, type, 'back', skin);
    s += hair(look.hair, g, 'back');
    s += body(look.shirt || {}, skin);
    s += ears(type, g, skin, accs);
    s += headShape(type, skin);
    s += hair(look.hair, g, 'front');
    s += muzzle(type, g, skin, look.stubble);
    s += mouth(g, expr, type);
    s += nose(type, g, skin);
    s += eyes(g, type, expr, skin, id, accs);
    s += accessories(accs, g, type, 'front', skin);
    if (expr === 'worried' || expr === 'shock') s += `<path d="M${100 + g.hw - 6},${g.top + 26} q6,10 0,14 q-6,-4 0,-14 Z" fill="#74c0fc" stroke="${O}" stroke-width="1.5"/>`;
    if (expr === 'angry') s += `<path d="M${100 - g.hw + 4},${g.top + 18} l8,4 l-4,6 M${100 - g.hw + 14},${g.top + 12} l2,8" stroke="#e03131" stroke-width="3" fill="none"/>`;
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">${s}</svg>`;
  }

  HP.Avatar = { svg, EXPRESSIONS: ['neutral', 'happy', 'smug', 'worried', 'angry', 'shock', 'sad', 'think'] };
})(typeof window !== 'undefined' ? window : globalThis);
