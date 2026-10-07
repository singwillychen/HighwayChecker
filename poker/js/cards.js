/* 牌組、牌型判定、勝率模擬（Monte Carlo）
 * 牌以整數 0..51 表示：rank = c >> 2（0 = 2 … 12 = A），suit = c & 3（♠♥♦♣）
 */
(function (root) {
  const HP = (root.HP = root.HP || {});

  const RANK_CHARS = '23456789TJQKA';
  const RANK_LABEL = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SUIT_SYM = ['♠', '♥', '♦', '♣'];
  const CAT_NAMES = ['高牌', '一對', '兩對', '三條', '順子', '同花', '葫蘆', '四條', '同花順'];
  const P16_5 = Math.pow(16, 5);

  const rankOf = (c) => c >> 2;
  const suitOf = (c) => c & 3;
  const isRed = (c) => (c & 3) === 1 || (c & 3) === 2;
  const label = (c) => RANK_LABEL[c >> 2] + SUIT_SYM[c & 3];

  function newDeck() {
    const d = [];
    for (let i = 0; i < 52; i++) d.push(i);
    return d;
  }

  function shuffle(a, rng = Math.random) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 13-bit 牌點遮罩中最高的順子頂點；A2345 回傳 3（=5）
  function straightHigh(mask) {
    for (let h = 12; h >= 4; h--) {
      const m = 0x1f << (h - 4);
      if ((mask & m) === m) return h;
    }
    if ((mask & 0x100f) === 0x100f) return 3;
    return -1;
  }

  function make(cat, ks) {
    let v = cat;
    for (let i = 0; i < 5; i++) v = v * 16 + ((ks[i] === undefined ? -1 : ks[i]) + 1);
    return v;
  }

  // 5～7 張牌取最佳五張的分數（越大越好）
  function evaluate(cards) {
    const rc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const sc = [0, 0, 0, 0];
    const sm = [0, 0, 0, 0];
    let mask = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i], r = c >> 2, s = c & 3;
      rc[r]++; sc[s]++; sm[s] |= 1 << r; mask |= 1 << r;
    }
    let fs = -1;
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) {
      const sh = straightHigh(sm[fs]);
      if (sh >= 0) return make(8, [sh]);
    }
    const quads = [], trips = [], pairs = [], singles = [];
    for (let r = 12; r >= 0; r--) {
      const n = rc[r];
      if (n === 4) quads.push(r);
      else if (n === 3) trips.push(r);
      else if (n === 2) pairs.push(r);
      else if (n === 1) singles.push(r);
    }
    if (quads.length) {
      const q = quads[0];
      let k = -1;
      for (let r = 12; r >= 0; r--) if (r !== q && rc[r]) { k = r; break; }
      return make(7, [q, k]);
    }
    if (trips.length && (trips.length > 1 || pairs.length)) {
      const p = Math.max(trips.length > 1 ? trips[1] : -1, pairs.length ? pairs[0] : -1);
      return make(6, [trips[0], p]);
    }
    if (fs >= 0) {
      const top = [];
      for (let r = 12; r >= 0 && top.length < 5; r--) if (sm[fs] & (1 << r)) top.push(r);
      return make(5, top);
    }
    const sh = straightHigh(mask);
    if (sh >= 0) return make(4, [sh]);
    if (trips.length) {
      const t = trips[0], k = [];
      for (let r = 12; r >= 0 && k.length < 2; r--) if (r !== t && rc[r]) k.push(r);
      return make(3, [t, k[0], k[1]]);
    }
    if (pairs.length >= 2) {
      const p1 = pairs[0], p2 = pairs[1];
      let k = -1;
      for (let r = 12; r >= 0; r--) if (r !== p1 && r !== p2 && rc[r]) { k = r; break; }
      return make(2, [p1, p2, k]);
    }
    if (pairs.length) {
      const p = pairs[0], k = [];
      for (let r = 12; r >= 0 && k.length < 3; r--) if (r !== p && rc[r]) k.push(r);
      return make(1, [p, k[0], k[1], k[2]]);
    }
    return make(0, singles.slice(0, 5));
  }

  const categoryOf = (score) => Math.floor(score / P16_5);

  function handName(score) {
    const cat = categoryOf(score);
    if (cat === 8 && Math.floor(score / Math.pow(16, 4)) % 16 === 13) return '皇家同花順';
    return CAT_NAMES[cat];
  }

  // 找出組成最佳牌型的五張牌（攤牌時高亮用）
  function bestFive(cards) {
    const best = evaluate(cards);
    if (cards.length <= 5) return { score: best, cards: cards.slice() };
    const n = cards.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
      for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
        const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
        if (evaluate(five) === best) return { score: best, cards: five };
      }
    return { score: best, cards: cards.slice(0, 5) };
  }

  // 對 nOpp 個隨機手牌的勝率（平手按人數分）
  function equity(hole, board, nOpp, iters, rng = Math.random) {
    if (nOpp <= 0) return 1;
    const used = new Uint8Array(52);
    for (const c of hole) used[c] = 1;
    for (const c of board) used[c] = 1;
    const deck = [];
    for (let c = 0; c < 52; c++) if (!used[c]) deck.push(c);
    const need = nOpp * 2 + (5 - board.length);
    const fullBoard = board.slice();
    const mine = hole.concat(board);
    let score = 0;
    const tmp = new Array(7);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < need; i++) {
        const j = i + ((rng() * (deck.length - i)) | 0);
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      let k = nOpp * 2;
      fullBoard.length = board.length;
      while (fullBoard.length < 5) fullBoard.push(deck[k++]);
      mine.length = 2 + board.length;
      for (let i = board.length; i < 5; i++) mine.push(fullBoard[i]);
      const my = evaluate(mine);
      let best = 0, ties = 0, lost = false;
      for (let o = 0; o < nOpp; o++) {
        tmp[0] = deck[o * 2]; tmp[1] = deck[o * 2 + 1];
        for (let i = 0; i < 5; i++) tmp[2 + i] = fullBoard[i];
        const v = evaluate(tmp);
        if (v > my) { lost = true; break; }
        if (v === my) ties++;
        if (v > best) best = v;
      }
      if (!lost) score += 1 / (ties + 1);
    }
    return score / iters;
  }

  HP.Cards = {
    RANK_CHARS, RANK_LABEL, SUIT_SYM, CAT_NAMES,
    rankOf, suitOf, isRed, label, newDeck, shuffle,
    evaluate, categoryOf, handName, bestFive, equity,
  };
})(typeof window !== 'undefined' ? window : globalThis);
